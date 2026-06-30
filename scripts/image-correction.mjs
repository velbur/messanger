import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {loadPublicImageBuffer} from "./image-references.mjs";
import {generateImageBuffer, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {readStylePrompt} from "./image-prompt.mjs";

const MAX_CORRECTION_IMAGE_BYTES = 10 * 1024 * 1024;

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export class ImageCorrectionUnchangedError extends Error {
  constructor() {
    super(
      "Модель вернула кадр, почти не отличающийся от исходного. Уточните правку (конкретнее: что добавить, убрать, изменить).",
    );
    this.name = "ImageCorrectionUnchangedError";
    this.provider = "openrouter";
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

export const buildImageCorrectionPrompt = ({imageEditPrompt, stylePrompt}) => {
  const edit = normalizeSpace(imageEditPrompt);
  if (!edit) {
    throw new Error("Укажите правки в поле imageEditPrompt");
  }
  const style = normalizeSpace(stylePrompt);

  return [
    edit,
    style ? `Стиль иллюстрации: ${style}` : "",
    `Формат ${CHAT_IMAGE_ASPECT_RATIO}, без текста на изображении, без UI чата.`,
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

export const correctFrameImage = async ({
  messages,
  messageIndex,
  imageEditPrompt,
  stylePrompt,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
}) => {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
  }

  const {ref, dataUrl, sourceBuffer} = await loadCurrentFrameImageDataUrl(messages, messageIndex);
  const style = normalizeSpace(stylePrompt) || (await readStylePrompt());
  const prompt = buildImageCorrectionPrompt({imageEditPrompt, stylePrompt: style});

  const {buffer} = await generateImageBuffer({
    prompt,
    referenceDataUrl: dataUrl,
    aspectRatio,
    kind: "chat",
  });

  if (buffersAlmostEqual(sourceBuffer, buffer)) {
    throw new ImageCorrectionUnchangedError();
  }

  return {
    buffer,
    ref,
    promptUsed: prompt,
    provider: "openrouter",
  };
};
