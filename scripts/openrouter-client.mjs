import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {OPENROUTER_TTS_PROFILE} from "../src/chat/voiceover.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TEXT_MODEL = "openai/gpt-5.4";
const DEFAULT_IMAGE_MODEL = "openai/gpt-5.4-image-2";
const DEFAULT_TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const DEFAULT_ASPECT_RATIO = "4:3";
const DEFAULT_IMAGE_SIZE = "1K";
const MAX_RETRIES = 3;

export const loadOpenRouterEnv = async () => {
  const nativeRoot = process.env.NATIVE_PROJECT_ROOT?.trim();
  const files = [
    ...(nativeRoot ? [path.join(nativeRoot, ".env"), path.join(nativeRoot, "docs", ".env")] : []),
    path.join(ROOT, ".env"),
    path.join(ROOT, "docs", ".env"),
    path.join(ROOT, "story", ".env"),
    path.join(ROOT, "series", ".env"),
  ];
  const merged = {};

  for (const file of files) {
    try {
      const text = (await readFile(file, "utf8")).replace(/^\uFEFF/, "");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq === -1) {
          continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key) {
          merged[key] = value;
        }
      }
    } catch {
      /* optional */
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }
};

export const getOpenRouterConfig = () => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    textModel: process.env.OPENROUTER_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    imageModel: process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
    ttsModel: process.env.OPENROUTER_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL,
    ttsVoiceFemale: process.env.OPENROUTER_TTS_VOICE_FEMALE?.trim() || "Leda",
    ttsVoiceMale: process.env.OPENROUTER_TTS_VOICE_MALE?.trim() || "Puck",
    aspectRatio: process.env.OPENROUTER_IMAGE_ASPECT_RATIO?.trim() || DEFAULT_ASPECT_RATIO,
    imageSize: process.env.OPENROUTER_IMAGE_SIZE?.trim() || DEFAULT_IMAGE_SIZE,
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || undefined,
    appName: process.env.OPENROUTER_APP_NAME?.trim() || "messanger",
  };
};

export const isOpenRouterConfigured = () => Boolean(getOpenRouterConfig());

export const getOpenRouterVoiceoverStatus = () => ({
  provider: "openrouter",
  configured: isOpenRouterConfigured(),
  model: getOpenRouterTtsModel(),
  ttsProfile: OPENROUTER_TTS_PROFILE,
  voices: getOpenRouterTtsVoices(),
});

export const getOpenRouterTextModel = () =>
  getOpenRouterConfig()?.textModel ?? DEFAULT_TEXT_MODEL;

export const getOpenRouterImageModel = () =>
  getOpenRouterConfig()?.imageModel ?? DEFAULT_IMAGE_MODEL;

export const getOpenRouterTtsModel = () =>
  getOpenRouterConfig()?.ttsModel ?? DEFAULT_TTS_MODEL;

export const getOpenRouterTtsVoices = () => {
  const config = getOpenRouterConfig();
  return {
    female: config?.ttsVoiceFemale ?? "Leda",
    male: config?.ttsVoiceMale ?? "Puck",
  };
};

export const formatOpenRouterError = (error) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  if (error.message.includes("OPENROUTER_API_KEY")) {
    return error.message;
  }
  if (/401|403|unauthorized/i.test(error.message)) {
    return "OpenRouter: проверьте OPENROUTER_API_KEY в .env";
  }
  return `OpenRouter: ${error.message}`;
};

const requireConfig = () => {
  const config = getOpenRouterConfig();
  if (!config) {
    throw new Error("Задайте OPENROUTER_API_KEY в .env или docs/.env");
  }
  return config;
};

const buildHeaders = (config) => {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.siteUrl) {
    headers["HTTP-Referer"] = config.siteUrl;
  }
  if (config.appName) {
    headers["X-Title"] = config.appName;
  }
  return headers;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractMessageText = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part?.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
};

const getImageUrl = (image) => image?.image_url?.url || image?.imageUrl?.url || null;

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Ответ не содержит корректный data URL изображения");
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

export const parseJsonFromLlm = (text) => {
  const trimmed = String(text ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
};

const postChatCompletion = async (body, {retries = MAX_RETRIES} = {}) => {
  const config = requireConfig();
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: buildHeaders(config),
        body: JSON.stringify(body),
      });

      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`OpenRouter вернул не-JSON ответ (${response.status})`);
      }

      if (!response.ok) {
        const message = data?.error?.message || data?.message || raw.slice(0, 300);
        throw new Error(`OpenRouter API ${response.status}: ${message}`);
      }

      return {data, config};
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
};

export const chatCompletion = async ({
  messages,
  model,
  temperature = 0.3,
  maxTokens = 4096,
  responseFormat,
}) => {
  const openRouterConfig = requireConfig();
  const resolvedModel = model ?? openRouterConfig.textModel;
  const {data} = await postChatCompletion({
    model: resolvedModel,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    ...(responseFormat ? {response_format: responseFormat} : {}),
  });

  const text = extractMessageText(data);
  if (!text) {
    throw new Error("OpenRouter: пустой текстовый ответ");
  }

  return {
    text,
    model: resolvedModel,
    usage: data.usage,
  };
};

export const chatCompletionJson = async (options) => {
  const {text, model, usage} = await chatCompletion({
    ...options,
    responseFormat: {type: "json_object"},
  });
  return {data: parseJsonFromLlm(text), model, usage};
};

export const generateImageBuffer = async ({
  prompt,
  referenceDataUrl,
  model,
  aspectRatio,
  imageSize,
}) => {
  const config = requireConfig();
  const resolvedModel = model || config.imageModel;
  const resolvedAspectRatio = aspectRatio || config.aspectRatio;
  const resolvedImageSize = imageSize || config.imageSize;

  const content = [];
  if (referenceDataUrl) {
    content.push({
      type: "image_url",
      image_url: {url: referenceDataUrl},
    });
    content.push({
      type: "text",
      text: "Референс предыдущего кадра. Сохрани тот же стиль, палитру и обстановку, измени только то, что описано ниже.",
    });
  }
  content.push({
    type: "text",
    text: prompt,
  });

  const {data} = await postChatCompletion({
    model: resolvedModel,
    messages: [{role: "user", content}],
    modalities: ["image", "text"],
    image_config: {
      aspect_ratio: resolvedAspectRatio,
      image_size: resolvedImageSize,
    },
  });

  const message = data?.choices?.[0]?.message;
  const images = message?.images || [];
  if (!images.length) {
    const text = message?.content;
    throw new Error(
      text
        ? `Модель не вернула изображение: ${String(text).slice(0, 200)}`
        : "Модель не вернула изображение",
    );
  }

  const imageUrl = getImageUrl(images[0]);
  if (!imageUrl) {
    throw new Error("Не удалось извлечь image_url из ответа OpenRouter");
  }

  const {mime, buffer} = parseDataUrl(imageUrl);
  return {
    buffer,
    mime,
    model: resolvedModel,
    aspectRatio: resolvedAspectRatio,
    imageSize: resolvedImageSize,
    text: typeof message?.content === "string" ? message.content : null,
  };
};

const extensionForMime = (mime) => {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".png";
  }
};

export const generateImageToFile = async ({
  prompt,
  outputPath,
  model,
  aspectRatio,
  imageSize,
}) => {
  const result = await generateImageBuffer({
    prompt,
    model,
    aspectRatio,
    imageSize,
  });

  const ext = extensionForMime(result.mime);
  const finalPath = outputPath.endsWith(ext) ? outputPath : `${outputPath}${ext}`;

  await mkdir(path.dirname(finalPath), {recursive: true});
  await writeFile(finalPath, result.buffer);

  return {
    path: finalPath,
    mime: result.mime,
    model: result.model,
    aspectRatio: result.aspectRatio,
    imageSize: result.imageSize,
    text: result.text,
  };
};

/**
 * @param {{
 *   text: string,
 *   voice: string,
 *   model?: string,
 *   responseFormat?: 'mp3' | 'pcm',
 *   prompt?: string,
 *   speed?: number,
 * }} opts
 */
export const createSpeech = async ({
  text,
  voice,
  model,
  responseFormat = "mp3",
  prompt,
  speed,
}) => {
  const config = requireConfig();
  const resolvedModel = model ?? getOpenRouterTtsModel();
  const body = {
    model: resolvedModel,
    input: text,
    voice,
    response_format: responseFormat,
  };
  if (typeof speed === "number" && Number.isFinite(speed)) {
    body.speed = speed;
  }
  if (prompt?.trim()) {
    body.prompt = prompt.trim();
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${config.baseUrl}/audio/speech`, {
        method: "POST",
        headers: buildHeaders(config),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const raw = await response.text();
        let message = raw.slice(0, 400);
        try {
          const data = JSON.parse(raw);
          message = data?.error?.message || data?.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(`OpenRouter TTS ${response.status}: ${message}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
};
