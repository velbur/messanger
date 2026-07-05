import path from "node:path";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {loadPublicImageBuffer} from "./image-references.mjs";
import {generateImageBuffer, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {generateImageToImageBufferLocalGpu, isLocalGpuImageConfigured} from "./local-gpu-image.mjs";
import {getStoryImageProvider} from "./story-image-provider.mjs";
import {readStylePrompt, readStoryStylePrompt} from "./image-prompt.mjs";

const MAX_CORRECTION_IMAGE_BYTES = 10 * 1024 * 1024;

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export class ImageCorrectionUnchangedError extends Error {
  constructor(provider = "openrouter") {
    super(
      "Модель вернула кадр, почти не отличающийся от исходного. Уточните правку (конкретнее: что добавить, убрать, изменить).",
    );
    this.name = "ImageCorrectionUnchangedError";
    this.provider = provider;
  }
}

export const isImageCorrectionConfigured = () =>
  isOpenRouterConfigured() ||
  (isLocalGpuImageConfigured() && getStoryImageProvider() === "local-gpu");

const shouldUseLocalGpuCorrection = (kind) =>
  isLocalGpuImageConfigured() &&
  (kind === "story" || kind === "story-opening" || getStoryImageProvider() === "local-gpu");

export const loadCurrentFrameImage = async (
  messages,
  messageIndex,
  {imageField = "image", openingImage = null} = {},
) => {
  const list = Array.isArray(messages) ? messages : [];
  let ref = "";
  if (openingImage != null) {
    ref = String(openingImage ?? "").trim();
  } else {
    if (messageIndex < 0 || messageIndex >= list.length) {
      throw new Error("Некорректный индекс сообщения");
    }
    ref = String(list[messageIndex]?.[imageField] ?? "").trim();
  }
  if (!ref) {
    throw new Error("Нет изображения для правки");
  }
  const loaded = await loadPublicImageBuffer(ref, {maxBytes: MAX_CORRECTION_IMAGE_BYTES});
  if (!loaded) {
    throw new Error(
      "Файл изображения не найден или слишком большой (>10 МБ). Сохраните кадр в public/images/ перед правкой.",
    );
  }
  const dataUrl = `data:${loaded.mime};base64,${loaded.buffer.toString("base64")}`;
  return {
    ref,
    dataUrl,
    sourceBuffer: loaded.buffer,
    filename: path.basename(ref) || "frame.png",
  };
};

/** @deprecated используйте loadCurrentFrameImage */
export const loadCurrentFrameImageDataUrl = async (messages, messageIndex) => {
  const result = await loadCurrentFrameImage(messages, messageIndex);
  return {ref: result.ref, dataUrl: result.dataUrl, sourceBuffer: result.sourceBuffer};
};

export const buildImageCorrectionPrompt = ({
  imageEditPrompt,
  stylePrompt,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
  kind = "chat",
}) => {
  const edit = normalizeSpace(imageEditPrompt);
  if (!edit) {
    throw new Error("Укажите правки в поле imageEditPrompt");
  }
  const style = normalizeSpace(stylePrompt);
  const formatHint =
    kind === "story" || kind === "story-opening"
      ? `Вертикальная иллюстрация ${STORY_IMAGE_ASPECT_RATIO}, без текста на изображении, без UI чата.`
      : `Формат ${aspectRatio}, без текста на изображении, без UI чата.`;

  return [
    edit,
    style ? `Стиль: ${style}` : "",
    formatHint,
    "Сохрани композицию исходного кадра, измени только то, что описано в правках.",
  ]
    .filter(Boolean)
    .join(" ");
};

const buffersAlmostEqual = (a, b, threshold = 0.02) => {
  if (!a?.length || !b?.length) {
    return false;
  }
  if (a.length === b.length && a.equals(b)) {
    return true;
  }
  const sampleSize = Math.min(4096, a.length, b.length);
  if (sampleSize === 0) {
    return true;
  }
  let diff = 0;
  for (let i = 0; i < sampleSize; i++) {
    const ai = Math.floor((i * a.length) / sampleSize);
    const bi = Math.floor((i * b.length) / sampleSize);
    if (a[ai] !== b[bi]) {
      diff++;
    }
  }
  return diff / sampleSize < threshold;
};

/**
 * @param {{
 *   messages: unknown[],
 *   messageIndex?: number,
 *   imageEditPrompt: string,
 *   stylePrompt?: string,
 *   aspectRatio?: string,
 *   kind?: "chat" | "story" | "story-opening",
 *   openingImage?: string | null,
 * }} opts
 */
export const correctFrameImage = async ({
  messages,
  messageIndex,
  imageEditPrompt,
  stylePrompt,
  aspectRatio,
  kind = "chat",
  openingImage = null,
}) => {
  const isStoryKind = kind === "story" || kind === "story-opening";
  const useLocalGpu = shouldUseLocalGpuCorrection(kind);

  if (!useLocalGpu && !isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
  }
  if (useLocalGpu && !isLocalGpuImageConfigured()) {
    throw new Error("LOCAL_GPU_VIDEO_URL не задан для правки через GPU");
  }

  const imageField = isStoryKind ? "storyImage" : "image";
  const resolvedAspect =
    aspectRatio ?? (isStoryKind ? STORY_IMAGE_ASPECT_RATIO : CHAT_IMAGE_ASPECT_RATIO);
  const style = normalizeSpace(stylePrompt) || (await (isStoryKind ? readStoryStylePrompt() : readStylePrompt()));
  const {ref, dataUrl, sourceBuffer, filename} = await loadCurrentFrameImage(messages, messageIndex ?? -1, {
    imageField,
    openingImage,
  });
  const prompt = buildImageCorrectionPrompt({
    imageEditPrompt,
    stylePrompt: style,
    aspectRatio: resolvedAspect,
    kind,
  });

  let buffer;
  let provider;
  if (useLocalGpu) {
    const result = await generateImageToImageBufferLocalGpu({
      prompt,
      imageBuffer: sourceBuffer,
      imageFilename: filename,
    });
    buffer = result.buffer;
    provider = result.provider;
  } else {
    const result = await generateImageBuffer({
      prompt,
      referenceDataUrl: dataUrl,
      aspectRatio: resolvedAspect,
      kind: isStoryKind ? "story" : "chat",
    });
    buffer = result.buffer;
    provider = "openrouter";
  }

  if (buffersAlmostEqual(sourceBuffer, buffer)) {
    throw new ImageCorrectionUnchangedError(provider);
  }

  return {
    buffer,
    ref,
    promptUsed: prompt,
    provider,
    mode: "correct",
  };
};
