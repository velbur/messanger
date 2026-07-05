import {loadOpenRouterEnv} from "./openrouter-client.mjs";
import {getLocalGpuVideoUrl} from "./local-gpu-video.mjs";

let envLoaded = false;

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());

export const deriveLocalGpuRenderUrlFromVideoUrl = (videoUrl) => {
  try {
    const u = new URL(videoUrl);
    const port = process.env.LOCAL_GPU_RENDER_PORT?.trim() || "3333";
    u.port = port;
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.origin;
  } catch {
    return null;
  }
};

/** Подгружает docs/.env при необходимости */
export const ensureLocalGpuRenderEnv = async () => {
  if (envLoaded || process.env.LOCAL_GPU_RENDER_URL?.trim()) {
    envLoaded = true;
    return;
  }
  await loadOpenRouterEnv();
  envLoaded = true;
};

/**
 * URL render-воркера на GPU-сервере (тот же server.mjs с RENDER_WORKER=1, порт 3333).
 * LOCAL_GPU_RENDER_URL — явно; иначе при LOCAL_GPU_RENDER_AUTO=1 — хост из LOCAL_GPU_VIDEO_URL + порт 3333.
 */
export const getLocalGpuRenderUrl = () => {
  const explicit = process.env.LOCAL_GPU_RENDER_URL?.trim().replace(/\/+$/, "");
  if (explicit) {
    return explicit;
  }
  if (!truthy(process.env.LOCAL_GPU_RENDER_AUTO)) {
    return null;
  }
  const videoUrl = getLocalGpuVideoUrl();
  return videoUrl ? deriveLocalGpuRenderUrlFromVideoUrl(videoUrl) : null;
};

export const isLocalGpuRenderConfigured = () => Boolean(getLocalGpuRenderUrl());

export const getLocalGpuRenderStatus = () => ({
  provider: "local-gpu",
  configured: isLocalGpuRenderConfigured(),
  url: getLocalGpuRenderUrl(),
  port: process.env.LOCAL_GPU_RENDER_PORT?.trim() || "3333",
  autoFromVideoUrl: truthy(process.env.LOCAL_GPU_RENDER_AUTO),
});

export const describeLocalGpuRenderTarget = () => {
  const url = getLocalGpuRenderUrl();
  return url ? `GPU-сервер (рендер @ ${url})` : "GPU-сервер (рендер не настроен)";
};
