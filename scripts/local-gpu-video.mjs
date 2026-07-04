import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {loadOpenRouterEnv} from "./openrouter-client.mjs";

export const DEFAULT_LOCAL_GPU_VIDEO_MODEL = "Wan-AI/Wan2.1-I2V-14B-720P-Diffusers";
export const DEFAULT_LOCAL_GPU_VIDEO_DURATION = 4;
export const DEFAULT_LOCAL_GPU_VIDEO_RESOLUTION = "1080p";
export const DEFAULT_LOCAL_GPU_VIDEO_ASPECT = "9:16";
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;

let envLoaded = false;

/** Подгружает docs/.env и др. (как OpenRouter), если LOCAL_GPU_VIDEO_URL ещё не в process.env */
export const ensureLocalGpuVideoEnv = async () => {
  if (envLoaded || process.env.LOCAL_GPU_VIDEO_URL?.trim()) {
    envLoaded = true;
    return;
  }
  await loadOpenRouterEnv();
  envLoaded = true;
};

export const getLocalGpuVideoUrl = () => {
  const raw = process.env.LOCAL_GPU_VIDEO_URL?.trim().replace(/\/+$/, "");
  return raw || null;
};

export const isLocalGpuVideoConfigured = () => Boolean(getLocalGpuVideoUrl());

export const getLocalGpuVideoModel = () =>
  process.env.LOCAL_GPU_VIDEO_MODEL?.trim() || DEFAULT_LOCAL_GPU_VIDEO_MODEL;

export const getLocalGpuVideoStatus = () => ({
  provider: "local-gpu",
  configured: isLocalGpuVideoConfigured(),
  url: getLocalGpuVideoUrl(),
  model: getLocalGpuVideoModel(),
  resolution: DEFAULT_LOCAL_GPU_VIDEO_RESOLUTION,
  profile: "wan-2.1-i2v-14b-720p-upscale-1080-v1",
});

const parseErrorBody = async (response) => {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    return data?.detail || data?.error || data?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
};

const mimeForImagePath = (absolutePath) => {
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : null;
    const detail =
      cause instanceof Error
        ? cause.message
        : error instanceof Error
          ? error.message
          : String(error);
    if (detail.includes("abort")) {
      throw new Error(`Таймаут запроса к GPU-сервису (${Math.round(timeoutMs / 1000)} с)`);
    }
    throw new Error(
      `Сеть до GPU-сервиса: ${detail}. Сервер мог быть занят генерацией — повторите через минуту.`,
    );
  } finally {
    clearTimeout(timer);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollLocalGpuJob = async ({baseUrl, jobId, onPoll, deadlineMs = DEFAULT_TIMEOUT_MS}) => {
  const started = Date.now();
  let attempt = 0;
  while (Date.now() - started < deadlineMs) {
    attempt += 1;
    const response = await fetchWithTimeout(
      `${baseUrl}/i2v/jobs/${jobId}`,
      {},
      Math.min(30_000, deadlineMs),
    );
    if (!response.ok) {
      throw new Error(`Local GPU job ${response.status}: ${await parseErrorBody(response)}`);
    }
    const data = await response.json();
    onPoll?.({
      attempt,
      maxAttempts: Math.ceil(deadlineMs / POLL_INTERVAL_MS),
      status: data.status ?? "unknown",
    });
    if (data.status === "completed") {
      return data;
    }
    if (data.status === "failed") {
      throw new Error(data.error ?? "GPU job failed");
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Таймаут ожидания GPU job ${jobId} (${Math.round(deadlineMs / 1000)} с)`);
};

/**
 * @param {{
 *   imageAbsolutePath: string,
 *   prompt: string,
 *   outputPath: string,
 *   duration?: number,
 *   resolution?: string,
 *   aspectRatio?: string,
 *   steps?: number | null,
 *   onPoll?: (info: {attempt: number, maxAttempts: number, status: string}) => void,
 * }} opts
 */
export const generateImageToVideoFileLocalGpu = async ({
  imageAbsolutePath,
  prompt,
  outputPath,
  duration = DEFAULT_LOCAL_GPU_VIDEO_DURATION,
  resolution = DEFAULT_LOCAL_GPU_VIDEO_RESOLUTION,
  aspectRatio = DEFAULT_LOCAL_GPU_VIDEO_ASPECT,
  steps = null,
  onPoll,
}) => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuVideoUrl();
  if (!baseUrl) {
    throw new Error(
      "Задайте LOCAL_GPU_VIDEO_URL (docs/.env или export перед npm run, например http://<server>:8008)",
    );
  }

  const model = getLocalGpuVideoModel();
  onPoll?.({attempt: 0, maxAttempts: Math.ceil(DEFAULT_TIMEOUT_MS / POLL_INTERVAL_MS), status: "submitting"});

  const imageBuffer = await readFile(imageAbsolutePath);
  const form = new FormData();
  const blob = new Blob([imageBuffer], {type: mimeForImagePath(imageAbsolutePath)});
  form.append("image", blob, path.basename(imageAbsolutePath));
  form.append("prompt", prompt);
  form.append("duration", String(duration));
  form.append("resolution", resolution);
  form.append("aspect_ratio", aspectRatio);
  if (steps != null && steps > 0) {
    form.append("steps", String(steps));
  }

  const submitResponse = await fetchWithTimeout(`${baseUrl}/i2v`, {method: "POST", body: form}, 120_000);
  if (!submitResponse.ok) {
    throw new Error(`Local GPU I2V ${submitResponse.status}: ${await parseErrorBody(submitResponse)}`);
  }

  const submitData = await submitResponse.json();
  const jobId = submitData.job_id;
  if (!jobId) {
    throw new Error("GPU-сервис не вернул job_id (нужна версия app.py с queue_mode)");
  }

  const job = await pollLocalGpuJob({baseUrl, jobId, onPoll});
  const downloadResponse = await fetchWithTimeout(`${baseUrl}/i2v/jobs/${jobId}/download`, {}, 120_000);
  if (!downloadResponse.ok) {
    throw new Error(`Local GPU download ${downloadResponse.status}: ${await parseErrorBody(downloadResponse)}`);
  }

  const buffer = Buffer.from(await downloadResponse.arrayBuffer());
  await mkdir(path.dirname(outputPath), {recursive: true});
  await writeFile(outputPath, buffer);

  onPoll?.({attempt: 1, maxAttempts: 1, status: "completed"});

  const meta = job.meta ?? {};
  return {
    model,
    outputPath,
    jobId,
    bytes: buffer.length,
    provider: "local-gpu",
    nativeResolution:
      downloadResponse.headers.get("x-native-resolution") ??
      (meta.native_width && meta.native_height ? `${meta.native_width}x${meta.native_height}` : null),
    outputResolution: downloadResponse.headers.get("x-output-resolution") ?? "1080x1920",
    inferenceSec:
      downloadResponse.headers.get("x-inference-sec") ??
      (meta.inference_sec != null ? String(meta.inference_sec) : null),
  };
};

/** Проверка доступности GPU-сервиса */
export const probeLocalGpuVideoHealth = async () => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuVideoUrl();
  if (!baseUrl) {
    return {ok: false, error: "LOCAL_GPU_VIDEO_URL не задан"};
  }
  try {
    const response = await fetch(`${baseUrl}/health`, {signal: AbortSignal.timeout(15000)});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {ok: false, error: data?.error ?? `HTTP ${response.status}`};
    }
    return {ok: true, ...data};
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
