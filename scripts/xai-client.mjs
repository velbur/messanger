import {loadKlingEnv} from "./kling-client.mjs";
import {
  CHAT_IMAGE_ASPECT_RATIO,
  DEFAULT_GROK_IMAGE_MODEL,
  getChatImageGrokResolution,
} from "./chat-image-spec.mjs";

const DEFAULT_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4";
const IMAGE_FETCH_TIMEOUT_MS = 180_000;

export const getXaiConfig = () => {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  const baseUrl = (process.env.XAI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.XAI_MODEL?.trim() || DEFAULT_MODEL;
  return {apiKey, baseUrl, model};
};

export const isXaiConfigured = () => Boolean(getXaiConfig());

export const getXaiModel = () => getXaiConfig()?.model ?? DEFAULT_MODEL;

export const getXaiImageModel = () =>
  process.env.XAI_IMAGE_MODEL?.trim() || DEFAULT_GROK_IMAGE_MODEL;

export const isXaiImageConfigured = isXaiConfigured;

export const loadXaiEnv = loadKlingEnv;

export const formatXaiError = (error) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  if (error.message.includes("XAI_API_KEY")) {
    return error.message;
  }
  if (/401|403|unauthorized/i.test(error.message)) {
    return "Grok API: проверьте XAI_API_KEY в docs/.env";
  }
  return `Grok API: ${error.message}`;
};

const extractMessageText = (payload) => {
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
};

/**
 * Chat Completions (OpenAI-совместимый API xAI).
 */
export const chatCompletion = async ({
  messages,
  model,
  temperature = 0.3,
  maxTokens = 2048,
  responseFormat,
}) => {
  const config = getXaiConfig();
  if (!config) {
    throw new Error("Grok API: задайте XAI_API_KEY в docs/.env или .env");
  }

  const body = {
    model: model ?? config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Grok API: неверный ответ (${res.status})`);
  }

  if (!res.ok) {
    const detail =
      payload?.error?.message ??
      payload?.message ??
      (raw.slice(0, 240) || res.statusText);
    throw new Error(`Grok API ${res.status}: ${detail}`);
  }

  const text = extractMessageText(payload);
  if (!text) {
    throw new Error("Grok API: пустой ответ");
  }

  return {text, model: body.model, usage: payload.usage};
};

export const parseJsonFromLlm = (text) => {
  const trimmed = String(text ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
};

export const chatCompletionJson = async (options) => {
  const {text, model, usage} = await chatCompletion({
    ...options,
    responseFormat: {type: "json_object"},
  });
  return {data: parseJsonFromLlm(text), model, usage};
};

const parseEditImageResponse = async (res, raw, imageModel) => {
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Grok Imagine: неверный ответ (${res.status})`);
  }

  if (!res.ok) {
    const detail =
      payload?.error?.message ??
      payload?.message ??
      (raw.slice(0, 240) || res.statusText);
    throw new Error(`Grok Imagine ${res.status}: ${detail}`);
  }

  const item = payload?.data?.[0];
  if (!item) {
    throw new Error("Grok Imagine: пустой ответ (нет data)");
  }

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    if (buffer.length > 12 * 1024 * 1024) {
      throw new Error("Сгенерированное изображение слишком большое");
    }
    return {
      buffer,
      mimeType: item.mime_type ?? "image/png",
      model: imageModel,
    };
  }

  if (item.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) {
      throw new Error(`Не удалось скачать изображение Grok (${imgRes.status})`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return {
      buffer,
      mimeType: item.mime_type ?? imgRes.headers.get("content-type") ?? "image/png",
      model: imageModel,
      imageUrl: item.url,
    };
  }

  throw new Error("Grok Imagine: нет b64_json и url в ответе");
};

/**
 * Редактирование по референсу (предыдущий кадр) — POST /v1/images/edits
 */
export const generateGrokImageEditBuffer = async ({
  prompt,
  referenceDataUrl,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
  resolution = getChatImageGrokResolution(),
  model,
}) => {
  const config = getXaiConfig();
  if (!config) {
    throw new Error("Grok API: задайте XAI_API_KEY в docs/.env или .env");
  }
  const trimmed = String(prompt ?? "").trim();
  const ref = String(referenceDataUrl ?? "").trim();
  if (!trimmed || !ref) {
    throw new Error("Нужны промпт и референсное изображение");
  }

  const imageModel = model ?? getXaiImageModel();
  const body = {
    model: imageModel,
    prompt: trimmed,
    image: {url: ref, type: "image_url"},
    aspect_ratio: aspectRatio,
    n: 1,
    response_format: "b64_json",
    resolution,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${config.baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Grok Imagine: превышено время ожидания редактирования");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();
  return parseEditImageResponse(res, raw, imageModel);
};

/**
 * Генерация с референсом предыдущего кадра (edits) или с нуля (generations).
 */
export const generateGrokImageBuffer = async ({
  prompt,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
  resolution = getChatImageGrokResolution(),
  model,
  referenceDataUrl,
}) => {
  const ref = String(referenceDataUrl ?? "").trim();
  if (ref) {
    const scene = String(prompt ?? "").trim();
    const editPrompt = [
      "Сохрани тот же визуальный мир, что на исходном фото: те же объекты (вагон, интерьер, персонажи), палитра и стиль иллюстрации.",
      "Измени только то, что нужно для новой сцены:",
      scene,
    ].join(" ");
    return generateGrokImageEditBuffer({
      prompt: editPrompt,
      referenceDataUrl: ref,
      aspectRatio,
      resolution,
      model,
    });
  }

  return generateGrokImageFromPrompt({
    prompt,
    aspectRatio,
    resolution,
    model,
  });
};

const generateGrokImageFromPrompt = async ({
  prompt,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
  resolution = getChatImageGrokResolution(),
  model,
}) => {
  const config = getXaiConfig();
  if (!config) {
    throw new Error("Grok API: задайте XAI_API_KEY в docs/.env или .env");
  }

  const trimmed = String(prompt ?? "").trim();
  if (!trimmed) {
    throw new Error("Нужен текст промпта для генерации");
  }

  const imageModel = model ?? getXaiImageModel();
  const body = {
    model: imageModel,
    prompt: trimmed,
    aspect_ratio: aspectRatio,
    n: 1,
    response_format: "b64_json",
    resolution,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${config.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Grok Imagine: превышено время ожидания генерации");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();
  return parseEditImageResponse(res, raw, imageModel);
};
