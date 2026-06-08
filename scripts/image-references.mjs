import path from "node:path";
import {readFile} from "node:fs/promises";
import {getImageStatus, isImageUrl, PUBLIC_DIR} from "./image-assets.mjs";

const MAX_VISION_REFERENCES = 2;
const MAX_VISION_BYTES = 3 * 1024 * 1024;

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Сообщения с image до целевого (не включая целевое). */
export const collectPriorImageFrames = (messages, messageIndex) => {
  const frames = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < messageIndex && i < list.length; i++) {
    const ref = String(list[i]?.image ?? "").trim();
    if (!ref) {
      continue;
    }
    frames.push({
      messageIndex: i,
      ref,
      caption: String(list[i]?.text ?? "").trim(),
      imagePrompt: String(list[i]?.imagePrompt ?? "").trim() || undefined,
      kind: isImageUrl(ref) ? "url" : "local",
    });
  }
  return frames;
};

const mimeFromPath = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
};

/**
 * Локальный файл из public/ → data URL для Grok vision / edits.
 */
export const loadPublicImageBuffer = async (ref, {maxBytes = MAX_VISION_BYTES} = {}) => {
  if (!ref || isImageUrl(ref)) {
    return null;
  }
  const status = await getImageStatus(ref);
  if (status.status !== "ok" || !status.publicPath) {
    return null;
  }
  const normalized = status.publicPath.replace(/^\/+/, "");
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    return null;
  }
  const buffer = await readFile(absolute);
  if (buffer.length > maxBytes) {
    return null;
  }
  return {buffer, absolute, publicPath: normalized, mime: mimeFromPath(absolute)};
};

export const loadPublicImageDataUrl = async (ref, options) => {
  const loaded = await loadPublicImageBuffer(ref, options);
  if (!loaded) {
    return null;
  }
  return `data:${loaded.mime};base64,${loaded.buffer.toString("base64")}`;
};

/**
 * Референсы для преемственности: до 2 предыдущих кадров с файлами на диске.
 */
export const resolveImageReferences = async (messages, messageIndex) => {
  const priorFrames = collectPriorImageFrames(messages, messageIndex);
  const referenceImages = [];

  for (let i = priorFrames.length - 1; i >= 0 && referenceImages.length < MAX_VISION_REFERENCES; i--) {
    const frame = priorFrames[i];
    if (frame.kind !== "local") {
      continue;
    }
    const dataUrl = await loadPublicImageDataUrl(frame.ref);
    if (!dataUrl) {
      continue;
    }
    referenceImages.unshift({...frame, dataUrl});
  }

  const primaryReference =
    referenceImages.length > 0 ? referenceImages[referenceImages.length - 1] : null;

  return {
    priorFrames,
    referenceImages,
    primaryReference,
    hasReferences: referenceImages.length > 0,
  };
};

export const formatPriorFramesText = (priorFrames, referenceImages) => {
  if (!priorFrames.length) {
    return "";
  }
  const loadedIndexes = new Set(referenceImages.map((r) => r.messageIndex));
  const lines = priorFrames.map((frame) => {
    const hasFile = loadedIndexes.has(frame.messageIndex);
    const prompt = frame.imagePrompt ? ` промпт: ${frame.imagePrompt.slice(0, 120)}` : "";
    const cap = frame.caption || "[фото]";
    return `${frame.messageIndex + 1}) ${cap}${prompt}${hasFile ? " [файл приложен ниже]" : " [файл недоступен]"}`;
  });
  return `Предыдущие фото в переписке (сохраняй визуальную преемственность — тот же вагон, место, герои, стиль):\n${lines.join("\n")}`;
};
