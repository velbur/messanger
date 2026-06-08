import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {loadPublicImageBuffer} from "./image-references.mjs";
import {generateGrokImageEditBuffer, isXaiImageConfigured} from "./xai-client.mjs";
import {generateKlingImageBuffer, isKlingConfigured} from "./kling-client.mjs";
import {readStylePrompt} from "./image-prompt.mjs";

const MAX_CORRECTION_IMAGE_BYTES = 10 * 1024 * 1024;

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export class ImageCorrectionUnchangedError extends Error {
  constructor(provider) {
    super(
      provider === "kling"
        ? "Kling вернул кадр, почти не отличающийся от исходного. Переключите провайдер на Grok Imagine или переформулируйте правку."
        : "Модель вернула кадр, почти не отличающийся от исходного. Уточните правку (конкретнее: что добавить, убрать, изменить).",
    );
    this.name = "ImageCorrectionUnchangedError";
    this.provider = provider;
  }
}

export const loadCurrentFrameImageDataUrl = async (messages, messageIndex) => {
  const list = Array.isArray(messages) ? messages : [];
  if (messageIndex < 0 || messageIndex >= list.length) {
    throw new Error("Некорректный индекс сообщения");
  }
  const ref = String(list[messageIndex]?.image ?? "").trim();
  if (!ref) {
    throw new Error("У сообщения нет изображения для правки");
  }
  const loaded = await loadPublicImageBuffer(ref, {maxBytes: MAX_CORRECTION_IMAGE_BYTES});
  if (!loaded) {
    throw new Error(
      "Файл изображения не найден или слишком большой (>10 МБ). Сохраните кадр в public/images/ перед правкой.",
    );
  }
  const dataUrl = `data:${loaded.mime};base64,${loaded.buffer.toString("base64")}`;
  return {ref, dataUrl, sourceBuffer: loaded.buffer};
};

export const buildImageCorrectionPrompt = ({
  imageEditPrompt,
  stylePrompt,
  provider = "grok",
}) => {
  const edit = normalizeSpace(imageEditPrompt);
  if (!edit) {
    throw new Error("Укажите правки в поле imageEditPrompt");
  }
  const style = normalizeSpace(stylePrompt);

  let parts;
  if (provider === "grok") {
    parts = [
      edit,
      style ? `Стиль иллюстрации: ${style}` : "",
      `Формат ${CHAT_IMAGE_ASPECT_RATIO}, без текста на изображении, без UI чата.`,
    ];
  } else {
    parts = [
      "Отредактируй это изображение. Сохрани стиль иллюстрации, но обязательно внеси изменения:",
      edit,
      style ? `Стиль: ${style}` : "",
      `Формат ${CHAT_IMAGE_ASPECT_RATIO}, без текста, без UI чата.`,
    ];
  }

  let text = parts.filter(Boolean).join(" ");
  if (provider === "kling" && text.length > 500) {
    text = `${text.slice(0, 499)}…`;
  }
  return text;
};

/** Grok /images/edits точнее для правок; Kling — img2img с высоким референсом */
export const resolveCorrectionProvider = (preferred) => {
  const choice = preferred === "grok" ? "grok" : "kling";
  if (choice === "grok" && isXaiImageConfigured()) {
    return "grok";
  }
  if (choice === "kling" && isKlingConfigured()) {
    return "kling";
  }
  if (isXaiImageConfigured()) {
    return "grok";
  }
  if (isKlingConfigured()) {
    return "kling";
  }
  throw new Error("Нет настроенного API для правки (Grok или Kling)");
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

const runCorrection = async ({
  prompt,
  dataUrl,
  sourceBuffer,
  provider,
  aspectRatio,
}) => {
  if (provider === "grok") {
    return generateGrokImageEditBuffer({
      prompt,
      referenceDataUrl: dataUrl,
      aspectRatio,
    });
  }
  return generateKlingImageBuffer({
    prompt,
    aspectRatio,
    referenceImage: dataUrl,
    referenceMode: "edit",
    imageFidelity: 0.38,
    omitNegativePrompt: true,
  });
};

/**
 * Правка уже существующего кадра (тот же файл перезаписывается).
 */
export const correctFrameImage = async ({
  messages,
  messageIndex,
  imageEditPrompt,
  stylePrompt,
  provider: preferredProvider = "grok",
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
}) => {
  const {ref, dataUrl, sourceBuffer} = await loadCurrentFrameImageDataUrl(messages, messageIndex);
  const style = normalizeSpace(stylePrompt) || (await readStylePrompt());
  const requestedProvider = resolveCorrectionProvider(preferredProvider);
  const prompt = buildImageCorrectionPrompt({
    imageEditPrompt,
    stylePrompt: style,
    provider: requestedProvider,
  });

  let effectiveProvider = requestedProvider;
  let {buffer} = await runCorrection({
    prompt,
    dataUrl,
    sourceBuffer,
    provider: requestedProvider,
    aspectRatio,
  });

  if (
    buffersAlmostEqual(sourceBuffer, buffer) &&
    requestedProvider === "kling" &&
    isXaiImageConfigured()
  ) {
    const grokPrompt = buildImageCorrectionPrompt({
      imageEditPrompt,
      stylePrompt: style,
      provider: "grok",
    });
    ({buffer} = await runCorrection({
      prompt: grokPrompt,
      dataUrl,
      sourceBuffer,
      provider: "grok",
      aspectRatio,
    }));
    effectiveProvider = "grok";
  }

  if (buffersAlmostEqual(sourceBuffer, buffer)) {
    throw new ImageCorrectionUnchangedError(effectiveProvider);
  }

  return {
    buffer,
    ref,
    promptUsed: prompt,
    provider: effectiveProvider,
    requestedProvider,
    usedGrokFallback: effectiveProvider === "grok" && requestedProvider === "kling",
  };
};
