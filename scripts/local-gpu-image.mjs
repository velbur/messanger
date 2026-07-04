import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {ensureLocalGpuVideoEnv, getLocalGpuVideoUrl} from "./local-gpu-video.mjs";
import {
  STORY_IMAGE_DISPLAY_HEIGHT,
  STORY_IMAGE_DISPLAY_WIDTH,
} from "./story-image-spec.mjs";

export const DEFAULT_LOCAL_GPU_IMAGE_MODEL = "black-forest-labs/FLUX.1-dev";
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;

export const getLocalGpuImageUrl = () => {
  const service =
    process.env.LOCAL_GPU_SERVICE_URL?.trim().replace(/\/+$/, "") ||
    process.env.LOCAL_GPU_IMAGE_URL?.trim().replace(/\/+$/, "") ||
    getLocalGpuVideoUrl();
  return service || null;
};

export const isLocalGpuImageConfigured = () => Boolean(getLocalGpuImageUrl());

export const getLocalGpuImageModel = () =>
  process.env.LOCAL_GPU_IMAGE_MODEL?.trim() || DEFAULT_LOCAL_GPU_IMAGE_MODEL;

export const getLocalGpuImageStatus = () => ({
  provider: "local-gpu",
  configured: isLocalGpuImageConfigured(),
  url: getLocalGpuImageUrl(),
  model: getLocalGpuImageModel(),
  resolution: `${STORY_IMAGE_DISPLAY_WIDTH}x${STORY_IMAGE_DISPLAY_HEIGHT}`,
  profile: "flux-1-dev-1080x1920-v1",
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

const pollLocalGpuT2iJob = async ({baseUrl, jobId, onPoll, deadlineMs = DEFAULT_TIMEOUT_MS}) => {
  const started = Date.now();
  let attempt = 0;
  while (Date.now() - started < deadlineMs) {
    attempt += 1;
    const response = await fetchWithTimeout(
      `${baseUrl}/t2i/jobs/${jobId}`,
      {},
      Math.min(30_000, deadlineMs),
    );
    if (!response.ok) {
      throw new Error(`Local GPU T2I job ${response.status}: ${await parseErrorBody(response)}`);
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
      throw new Error(data.error ?? "GPU T2I job failed");
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Таймаут ожидания GPU T2I job ${jobId} (${Math.round(deadlineMs / 1000)} с)`);
};

/**
 * @param {{
 *   prompt: string,
 *   width?: number,
 *   height?: number,
 *   steps?: number | null,
 *   guidance?: number | null,
 *   seed?: number | null,
 *   onPoll?: (info: {attempt: number, maxAttempts: number, status: string}) => void,
 * }} opts
 */
export const generateTextToImageBufferLocalGpu = async ({
  prompt,
  width = STORY_IMAGE_DISPLAY_WIDTH,
  height = STORY_IMAGE_DISPLAY_HEIGHT,
  steps = null,
  guidance = null,
  seed = null,
  onPoll,
}) => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuImageUrl();
  if (!baseUrl) {
    throw new Error(
      "Задайте LOCAL_GPU_VIDEO_URL или LOCAL_GPU_SERVICE_URL (docs/.env, например http://<server>:8008)",
    );
  }

  const model = getLocalGpuImageModel();
  onPoll?.({attempt: 0, maxAttempts: Math.ceil(DEFAULT_TIMEOUT_MS / POLL_INTERVAL_MS), status: "submitting"});

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  if (steps != null && steps > 0) {
    form.append("steps", String(steps));
  }
  if (guidance != null && guidance > 0) {
    form.append("guidance", String(guidance));
  }
  if (seed != null && seed >= 0) {
    form.append("seed", String(seed));
  }

  const submitResponse = await fetchWithTimeout(`${baseUrl}/t2i`, {method: "POST", body: form}, 120_000);
  if (!submitResponse.ok) {
    throw new Error(`Local GPU T2I ${submitResponse.status}: ${await parseErrorBody(submitResponse)}`);
  }

  const submitData = await submitResponse.json();
  const jobId = submitData.job_id;
  if (!jobId) {
    throw new Error("GPU-сервис не вернул job_id для /t2i");
  }

  const job = await pollLocalGpuT2iJob({baseUrl, jobId, onPoll});
  const downloadResponse = await fetchWithTimeout(`${baseUrl}/t2i/jobs/${jobId}/download`, {}, 120_000);
  if (!downloadResponse.ok) {
    throw new Error(`Local GPU T2I download ${downloadResponse.status}: ${await parseErrorBody(downloadResponse)}`);
  }

  const buffer = Buffer.from(await downloadResponse.arrayBuffer());
  onPoll?.({attempt: 1, maxAttempts: 1, status: "completed"});

  const meta = job.meta ?? {};
  return {
    buffer,
    mime: "image/png",
    model,
    aspectRatio: "9:16",
    imageSize: `${meta.width ?? width}x${meta.height ?? height}`,
    provider: "local-gpu",
    jobId,
    inferenceSec:
      downloadResponse.headers.get("x-inference-sec") ??
      (meta.inference_sec != null ? String(meta.inference_sec) : null),
  };
};

/**
 * @param {Parameters<typeof generateTextToImageBufferLocalGpu>[0] & { outputPath: string }} opts
 */
export const generateTextToImageFileLocalGpu = async ({outputPath, ...opts}) => {
  const result = await generateTextToImageBufferLocalGpu(opts);
  await mkdir(path.dirname(outputPath), {recursive: true});
  await writeFile(outputPath, result.buffer);
  return {
    ...result,
    outputPath,
    bytes: result.buffer.length,
  };
};

export const probeLocalGpuImageHealth = async () => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuImageUrl();
  if (!baseUrl) {
    return {ok: false, error: "LOCAL_GPU_VIDEO_URL / LOCAL_GPU_SERVICE_URL не задан"};
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
