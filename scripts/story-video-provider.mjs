import {isOpenRouterConfigured} from "./openrouter-client.mjs";
import {generateImageToVideoFile} from "./openrouter-video.mjs";
import {
  generateImageToVideoFileLocalGpu,
  getLocalGpuVideoModel,
  getLocalGpuVideoStatus,
  getLocalGpuVideoUrl,
  isLocalGpuVideoConfigured,
} from "./local-gpu-video.mjs";

export const STORY_VIDEO_PROVIDERS = ["veo", "local-gpu"];

/** veo | local-gpu */
export const getStoryVideoProvider = () => {
  const raw = process.env.STORY_VIDEO_PROVIDER?.trim().toLowerCase();
  if (raw === "local-gpu" || raw === "local_gpu" || raw === "localgpu") {
    return "local-gpu";
  }
  return "veo";
};

export const isStoryVideoGenerationConfigured = () => {
  if (getStoryVideoProvider() === "local-gpu") {
    return isLocalGpuVideoConfigured();
  }
  return isOpenRouterConfigured();
};

export const getStoryVideoGenerationStatus = () => {
  const provider = getStoryVideoProvider();
  if (provider === "local-gpu") {
    return {
      provider,
      ...getLocalGpuVideoStatus(),
    };
  }
  return {
    provider: "veo",
    configured: isOpenRouterConfigured(),
    url: null,
    model: process.env.OPENROUTER_VIDEO_MODEL?.trim() || "google/veo-3.1-lite",
    resolution: process.env.OPENROUTER_VIDEO_RESOLUTION?.trim() || "1080p",
    profile: "veo-3.1-lite-scene-fit-1080-v2",
  };
};

/**
 * Генерация story-видео через выбранный провайдер (Veo или local-gpu).
 * @param {Parameters<typeof generateImageToVideoFile>[0]} opts
 */
export const generateStoryVideoFile = async (opts) => {
  const provider = getStoryVideoProvider();
  if (provider === "local-gpu") {
    if (!isLocalGpuVideoConfigured()) {
      throw new Error("Задайте LOCAL_GPU_VIDEO_URL для STORY_VIDEO_PROVIDER=local-gpu");
    }
    return generateImageToVideoFileLocalGpu(opts);
  }
  return generateImageToVideoFile(opts);
};

export const describeStoryVideoProvider = () => {
  const status = getStoryVideoGenerationStatus();
  if (status.provider === "local-gpu") {
    const url = getLocalGpuVideoUrl() ?? "не задан";
    return `Local GPU (${getLocalGpuVideoModel()}) @ ${url}`;
  }
  return "OpenRouter Veo";
};
