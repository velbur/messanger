import {
  generateImageBuffer,
  getOpenRouterStoryImageModel,
  getOpenRouterStoryImageSize,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";
import {
  generateTextToImageBufferLocalGpu,
  getLocalGpuImageModel,
  getLocalGpuImageStatus,
  getLocalGpuImageUrl,
  isLocalGpuImageConfigured,
} from "./local-gpu-image.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";

export const STORY_IMAGE_PROVIDERS = ["openrouter", "local-gpu"];

/** openrouter | local-gpu */
export const getStoryImageProvider = () => {
  const raw = process.env.STORY_IMAGE_PROVIDER?.trim().toLowerCase();
  if (raw === "local-gpu" || raw === "local_gpu" || raw === "localgpu") {
    return "local-gpu";
  }
  return "openrouter";
};

export const isStoryImageGenerationConfigured = () => {
  if (getStoryImageProvider() === "local-gpu") {
    return isLocalGpuImageConfigured();
  }
  return isOpenRouterConfigured();
};

export const getStoryImageGenerationStatus = () => {
  const provider = getStoryImageProvider();
  if (provider === "local-gpu") {
    return {
      provider,
      ...getLocalGpuImageStatus(),
    };
  }
  return {
    provider: "openrouter",
    configured: isOpenRouterConfigured(),
    url: null,
    model: getOpenRouterStoryImageModel(),
    resolution: getOpenRouterStoryImageSize(),
    profile: "openrouter-gemini-story-v1",
  };
};

/**
 * Story T2I через выбранный провайдер.
 * @param {Parameters<typeof generateImageBuffer>[0]} opts
 */
export const generateStoryImageBuffer = async (opts) => {
  const provider = getStoryImageProvider();
  if (provider === "local-gpu") {
    if (!isLocalGpuImageConfigured()) {
      throw new Error("Задайте LOCAL_GPU_VIDEO_URL для STORY_IMAGE_PROVIDER=local-gpu");
    }
    return generateTextToImageBufferLocalGpu({
      prompt: opts.prompt,
      width: opts.width,
      height: opts.height,
      steps: opts.steps,
      guidance: opts.guidance,
      seed: opts.seed,
      onPoll: opts.onPoll,
    });
  }
  return generateImageBuffer({
    ...opts,
    referenceDataUrl: opts.referenceDataUrl ?? null,
    aspectRatio: opts.aspectRatio ?? STORY_IMAGE_ASPECT_RATIO,
    model: opts.model ?? getOpenRouterStoryImageModel(),
    imageSize: opts.imageSize ?? getOpenRouterStoryImageSize(),
    kind: "story",
  });
};

export const describeStoryImageProvider = () => {
  const status = getStoryImageGenerationStatus();
  if (status.provider === "local-gpu") {
    const url = getLocalGpuImageUrl() ?? "не задан";
    return `Local GPU (${getLocalGpuImageModel()}) @ ${url}`;
  }
  return `OpenRouter (${getOpenRouterStoryImageModel()})`;
};
