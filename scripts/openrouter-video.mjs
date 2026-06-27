import {readFile, writeFile, mkdir} from "node:fs/promises";
import path from "node:path";
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  loadOpenRouterEnv,
} from "./openrouter-client.mjs";

export const DEFAULT_STORY_VIDEO_MODEL = "google/veo-3.1-lite";
const DEFAULT_STORY_VIDEO_DURATION = 4;
const DEFAULT_STORY_VIDEO_RESOLUTION = "720p";
const DEFAULT_STORY_VIDEO_ASPECT = "9:16";
const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 80;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getOpenRouterStoryVideoModel = () =>
  process.env.OPENROUTER_VIDEO_MODEL?.trim() || DEFAULT_STORY_VIDEO_MODEL;

export const getOpenRouterStoryVideoStatus = () => ({
  provider: "openrouter",
  configured: isOpenRouterConfigured(),
  model: getOpenRouterStoryVideoModel(),
  profile: "veo-3.1-lite-v1",
});

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

const mimeForImagePath = (absolutePath) => {
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".gif") {
    return "image/gif";
  }
  return "image/jpeg";
};

/** Публичный URL или data URL для OpenRouter frame_images */
export const resolveFrameImageUrl = async ({imageAbsolutePath, imagePublicUrl}) => {
  if (imagePublicUrl?.trim()) {
    return imagePublicUrl.trim();
  }
  const buffer = await readFile(imageAbsolutePath);
  const mime = mimeForImagePath(imageAbsolutePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

const parseJobError = async (response) => {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    return data?.error?.message || data?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
};

const pollVideoJob = async (job, config) => {
  let current = job;
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    if (current.status === "completed") {
      return current;
    }
    if (current.status === "failed") {
      throw new Error(current.error ?? "Генерация видео не удалась");
    }
    if (["cancelled", "expired"].includes(current.status)) {
      throw new Error(current.error ?? `Генерация видео: ${current.status}`);
    }

    await sleep(POLL_INTERVAL_MS);

    if (!current.polling_url) {
      throw new Error("OpenRouter не вернул polling_url для видео");
    }

    const pollingUrl = new URL(current.polling_url, config.baseUrl);
    const response = await fetch(pollingUrl, {
      headers: buildHeaders(config),
    });
    if (!response.ok) {
      throw new Error(await parseJobError(response));
    }
    current = await response.json();
  }

  throw new Error("Генерация видео не завершилась в отведённое время");
};

const downloadVideoBuffer = async (job, config) => {
  const videoUrl =
    job.unsigned_urls?.[0] ??
    `${config.baseUrl}/videos/${job.id}/content?index=0`;

  const response = await fetch(videoUrl, {
    headers: videoUrl.startsWith(config.baseUrl)
      ? buildHeaders(config)
      : undefined,
  });
  if (!response.ok) {
    throw new Error(await parseJobError(response));
  }
  return Buffer.from(await response.arrayBuffer());
};

/**
 * @param {{
 *   imageAbsolutePath: string,
 *   imagePublicUrl?: string,
 *   prompt: string,
 *   outputPath: string,
 *   model?: string,
 *   duration?: number,
 *   resolution?: string,
 *   aspectRatio?: string,
 * }} opts
 */
export const generateImageToVideoFile = async ({
  imageAbsolutePath,
  imagePublicUrl,
  prompt,
  outputPath,
  model,
  duration = DEFAULT_STORY_VIDEO_DURATION,
  resolution = DEFAULT_STORY_VIDEO_RESOLUTION,
  aspectRatio = DEFAULT_STORY_VIDEO_ASPECT,
}) => {
  await loadOpenRouterEnv();
  const config = requireConfig();
  const resolvedModel = model ?? getOpenRouterStoryVideoModel();
  const frameUrl = await resolveFrameImageUrl({imageAbsolutePath, imagePublicUrl});

  const response = await fetch(`${config.baseUrl}/videos`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify({
      model: resolvedModel,
      prompt,
      duration,
      resolution,
      aspect_ratio: aspectRatio,
      generate_audio: false,
      frame_images: [
        {
          type: "image_url",
          image_url: {url: frameUrl},
          frame_type: "first_frame",
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Video ${response.status}: ${await parseJobError(response)}`);
  }

  const job = await response.json();
  const completed = await pollVideoJob(job, config);
  const buffer = await downloadVideoBuffer(completed, config);

  await mkdir(path.dirname(outputPath), {recursive: true});
  await writeFile(outputPath, buffer);

  return {
    model: resolvedModel,
    outputPath,
    jobId: completed.id,
    bytes: buffer.length,
  };
};
