/**
 * Параметры картинок во вложениях чата (не весь кадр Shorts 1080×1920).
 * Размеры отображения: src/chat/theme.ts → CHAT.imageMaxWidth/Height (S(560)×S(420) ≈ 4:3).
 */
export const CHAT_IMAGE_ASPECT_RATIO = "4:3";

/** Пиксели в рендере Remotion (после масштаба S=1.2) */
export const CHAT_IMAGE_DISPLAY_MAX_WIDTH = 672;
export const CHAT_IMAGE_DISPLAY_MAX_HEIGHT = 504;

/** Grok Imagine: quality — лучше следует промпту и меньше артефактов, чем grok-imagine-image */
export const DEFAULT_GROK_IMAGE_MODEL = "grok-imagine-image-quality";

export const CHAT_IMAGE_GROK_RESOLUTION = "1k";

/** Kling: v2.1 — новее kling-v1; при ошибке API задайте KLING_IMAGE_MODEL=kling-v1-5 */
export const DEFAULT_KLING_IMAGE_MODEL = "kling-v2-1";

/** Kling: 1k достаточно для вложения в пузыре; 2k — через KLING_IMAGE_RESOLUTION=2k */
export const CHAT_IMAGE_KLING_RESOLUTION = "1k";

export const getChatImageGrokResolution = () => {
  const fromEnv = process.env.XAI_IMAGE_RESOLUTION?.trim().toLowerCase();
  if (fromEnv === "2k" || fromEnv === "1k") {
    return fromEnv;
  }
  return CHAT_IMAGE_GROK_RESOLUTION;
};

export const getChatImageKlingResolution = () => {
  const fromEnv = process.env.KLING_IMAGE_RESOLUTION?.trim().toLowerCase();
  if (fromEnv === "2k" || fromEnv === "1k") {
    return fromEnv;
  }
  return CHAT_IMAGE_KLING_RESOLUTION;
};
