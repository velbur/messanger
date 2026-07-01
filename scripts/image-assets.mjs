import path from "node:path";
import {createHash} from "node:crypto";
import {mkdir, writeFile, access, readFile, unlink, stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {collectStoryVideoRefs} from "./story-video.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const IMAGES_DIR = path.join(PUBLIC_DIR, "images");

const URL_RE = /^https?:\/\//i;
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

export const isImageUrl = (value) => URL_RE.test(String(value).trim());

/** Лимит тела upload (base64) по типу ассета */
export const MAX_BINARY_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Лимит express.json для base64-upload: worst-case mp4 × 4/3 + запас */
export const uploadJsonBodyLimitBytes = () =>
  Math.ceil((MAX_BINARY_UPLOAD_BYTES * 4) / 3) + 512 * 1024;

export const resolveUploadMaxBytes = (targetRef, fileName) => {
  const ref = String(targetRef ?? fileName ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (ref.includes(".video.mp4") || ref.endsWith(".mp4")) {
    return 50 * 1024 * 1024;
  }
  if (
    ref.includes("story-sfx-mix") ||
    ref.startsWith("audio/") ||
    ref.endsWith(".wav") ||
    ref.endsWith(".mp3")
  ) {
    return 32 * 1024 * 1024;
  }
  return 12 * 1024 * 1024;
};

export const isStoryVisualLayout = (conversation) =>
  conversation?.layout === "storySplit" || conversation?.layout === "storyOverlay";

export const collectImageRefs = (parsed) => {
  const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
  return messages
    .map((message, messageIndex) => {
      const ref = String(message?.image ?? "").trim();
      if (!ref) {
        return null;
      }
      const text = String(message?.text ?? "").trim();
      const imagePrompt = String(message?.imagePrompt ?? "").trim();
      const imageEditPrompt = String(message?.imageEditPrompt ?? "").trim();
      return {
        id: `msg-${messageIndex}`,
        messageIndex,
        author: message.author ?? "?",
        text,
        imagePrompt: imagePrompt || undefined,
        imageEditPrompt: imageEditPrompt || undefined,
        ref,
        kind: isImageUrl(ref) ? "url" : "local",
      };
    })
    .filter(Boolean);
};

/** Story opening + story-кадры с cache-busted previewUrl для редактора */
export const collectStoryImageScanItems = async (parsed) => {
  if (!isStoryVisualLayout(parsed)) {
    return [];
  }

  const items = [];
  const openingRef = String(parsed?.story?.opening?.image ?? "").trim();
  if (openingRef) {
    const statusInfo = await getImageStatus(openingRef);
    items.push({
      slot: "opening",
      messageIndex: null,
      ref: openingRef,
      kind: isImageUrl(openingRef) ? "url" : "local",
      ...statusInfo,
    });
  }

  const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const ref = String(messages[messageIndex]?.storyImage ?? "").trim();
    if (!ref) {
      continue;
    }
    const statusInfo = await getImageStatus(ref);
    items.push({
      slot: "message",
      messageIndex,
      ref,
      kind: isImageUrl(ref) ? "url" : "local",
      ...statusInfo,
    });
  }

  return items;
};

const safePublicPath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь к изображению");
  }
  const abs = path.join(PUBLIC_DIR, normalized);
  if (!abs.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь к изображению");
  }
  return {relative: normalized, absolute: abs};
};

const extFromContentType = (contentType) => {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  return map[type] ?? ".jpg";
};

const extFromUrl = (url) => {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return ALLOWED_EXT.has(ext) ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
};

const uniqueImageName = (hint, ext) => {
  const base = hint.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const hash = createHash("sha1").update(`${hint}-${Date.now()}`).digest("hex").slice(0, 8);
  const safeExt = ALLOWED_EXT.has(ext) ? ext : ".jpg";
  return `images/${base}-${hash}${safeExt}`;
};

/** URL превью с ?t=mtime — браузер не показывает старый файл после перезаписи */
export const buildImagePreviewUrl = async (relativePath) => {
  const {relative, absolute} = safePublicPath(relativePath);
  const fileStat = await stat(absolute);
  return `/${relative}?t=${Math.floor(fileStat.mtimeMs)}`;
};

export const getImageStatus = async (ref) => {
  if (isImageUrl(ref)) {
    return {status: "url", previewUrl: null, publicPath: null};
  }
  try {
    const {relative, absolute} = safePublicPath(ref);
    await access(absolute);
    const previewUrl = await buildImagePreviewUrl(relative);
    return {status: "ok", previewUrl, publicPath: relative};
  } catch {
    return {status: "missing", previewUrl: null, publicPath: ref.replace(/^\/+/, "")};
  }
};

export const downloadImageToPublic = async (url, hint = "download") => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {signal: controller.signal, redirect: "follow"});
    if (!response.ok) {
      throw new Error(`Не удалось скачать (${response.status})`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error("Файл слишком большой (макс. 12 МБ)");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      throw new Error("Файл слишком большой (макс. 12 МБ)");
    }

    const ext = extFromContentType(response.headers.get("content-type")) || extFromUrl(url);
    const relative = uniqueImageName(hint, ext);
    const {absolute} = safePublicPath(relative);
    await mkdir(path.dirname(absolute), {recursive: true});
    await writeFile(absolute, buffer);
    return relative;
  } finally {
    clearTimeout(timeout);
  }
};

/** Удалить локальный файл из public/ (путь в JSON не меняется) */
export const deletePublicImage = async (targetRef) => {
  const ref = String(targetRef ?? "").trim();
  if (!ref || isImageUrl(ref)) {
    throw new Error("Можно удалить только локальный файл");
  }
  const {relative, absolute} = safePublicPath(ref);
  try {
    await access(absolute);
    await unlink(absolute);
    return {deleted: true, publicPath: relative};
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {deleted: false, publicPath: relative};
    }
    throw error;
  }
};

/** PNG story-кадра и соседние depth / video-файлы */
export const collectStoryImageAssetRefs = (imagePublicPath) => {
  const ref = String(imagePublicPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!ref || isImageUrl(ref)) {
    return [];
  }
  const base = ref.replace(/\.(png|jpe?g|webp)$/i, "");
  return [
    ref,
    `${base}.depth.png`,
    `${base}.parallax.mp4`,
    `${base}.layer-far.png`,
    `${base}.layer-mid.png`,
    `${base}.layer-near.png`,
    `${base}.depth-meta.json`,
    `${base}.video.mp4`,
    `${base}.video-hold.png`,
    `${base}.video-hold.depth.png`,
    `${base}.video-hold.parallax.mp4`,
    `${base}.video-hold.depth-meta.json`,
    `${base}.video.seamless.mp4`,
    `${base}.video.loop.mp4`,
  ];
};

/** Удалить story-кадр и связанные parallax / video ассеты */
export const deleteStoryImageAssets = async (targetRef) => {
  const refs = collectStoryImageAssetRefs(targetRef);
  if (refs.length === 0) {
    throw new Error("Можно удалить только локальный story-кадр");
  }

  const deleted = [];
  const missing = [];
  for (const ref of refs) {
    const result = await deletePublicImage(ref);
    if (result.deleted) {
      deleted.push(result.publicPath);
    } else {
      missing.push(result.publicPath);
    }
  }

  return {deleted, missing, publicPath: refs[0]};
};

export const saveImageBuffer = async (buffer, targetRef) => {
  let relative;
  if (targetRef && !isImageUrl(targetRef)) {
    const {relative: rel, absolute} = safePublicPath(targetRef);
    relative = rel;
    await mkdir(path.dirname(absolute), {recursive: true});
    await writeFile(absolute, buffer);
  } else {
    relative = uniqueImageName("upload", ".jpg");
    const {absolute} = safePublicPath(relative);
    await mkdir(path.dirname(absolute), {recursive: true});
    await writeFile(absolute, buffer);
  }
  return relative;
};

const hasRenderableText = (message) => (message.text ?? "").trim().length > 0;
const hasRenderableImage = (message) => Boolean(message.image?.trim());
const hasRenderableStoryImage = (message) => Boolean(message.storyImage?.trim());
const hasImagePromptOnly = (message) =>
  Boolean(message.imagePrompt?.trim()) && !hasRenderableImage(message);
const hasStoryImagePromptOnly = (message) =>
  Boolean(message.storyImagePrompt?.trim()) && !hasRenderableStoryImage(message);

/** Все локальные пути картинок переписки (чат, story opening, story-кадры) */
export const collectConversationImageRefs = (conversation) => {
  const refs = new Set();
  const add = (ref) => {
    const normalized = String(ref ?? "").trim().replace(/^\/+/, "");
    if (normalized && !isImageUrl(normalized)) {
      refs.add(normalized);
    }
  };

  for (const message of conversation?.messages ?? []) {
    add(message?.image);
    if (isStoryVisualLayout(conversation)) {
      add(message?.storyImage);
    }
  }

  if (isStoryVisualLayout(conversation)) {
    add(conversation?.story?.opening?.image);
  }

  add(conversation?.previewCover?.image);

  for (const videoRef of collectStoryVideoRefs(conversation)) {
    refs.add(videoRef);
  }

  return [...refs];
};

const assertLocalImageExists = (ref, errorText, {failOnMissingImages, logs}) => {
  const {absolute} = safePublicPath(ref);
  if (existsSync(absolute)) {
    return true;
  }
  if (failOnMissingImages) {
    throw new Error(errorText);
  }
  logs.push(errorText);
  return false;
};

/** URL → локальный файл; без файла — убрать image; пустые сообщения не попадают в видео */
export const resolveConversationImages = async (conversation, {failOnMissingImages = false} = {}) => {
  const logs = [];

  const missingPromptOnly = conversation.messages
    .map((message, index) => ({message, index}))
    .filter(({message}) => hasImagePromptOnly(message));

  const missingStoryPromptOnly = isStoryVisualLayout(conversation)
      ? conversation.messages
          .map((message, index) => ({message, index}))
          .filter(({message}) => hasStoryImagePromptOnly(message))
      : [];

  const missingOpening =
    isStoryVisualLayout(conversation) &&
    Boolean(conversation.story?.opening?.imagePrompt?.trim()) &&
    !Boolean(conversation.story?.opening?.image?.trim());

  if (missingPromptOnly.length > 0) {
    const indices = missingPromptOnly.map(({index}) => index + 1).join(", ");
    const errorText = `Сообщения без image, только imagePrompt: №${indices}. Сгенерируйте картинки или включите autoGenerateImages.`;
    if (failOnMissingImages) {
      throw new Error(errorText);
    }
    logs.push(errorText);
  }

  if (missingStoryPromptOnly.length > 0) {
    const indices = missingStoryPromptOnly.map(({index}) => index + 1).join(", ");
    logs.push(
      `Story-кадры без картинки (№${indices}) — в видео останется предыдущий кадр.`,
    );
  }

  if (missingOpening) {
    logs.push("Story opening без картинки — в видео останется заставка или первый кадр.");
  }

  const failOnMissingStoryFiles =
    failOnMissingImages && !isStoryVisualLayout(conversation);

  if (isStoryVisualLayout(conversation)) {
    const openingRef = conversation.story?.opening?.image?.trim();
    if (openingRef && !isImageUrl(openingRef)) {
      const ok = assertLocalImageExists(
        openingRef,
        `Story opening: файл не найден (${openingRef}) — используем первый кадр сцены.`,
        {failOnMissingImages: failOnMissingStoryFiles, logs},
      );
      if (!ok && conversation.story?.opening) {
        delete conversation.story.opening.image;
      }
    }

    for (let i = 0; i < conversation.messages.length; i += 1) {
      const storyRef = conversation.messages[i].storyImage?.trim();
      if (!storyRef || isImageUrl(storyRef)) {
        continue;
      }
      const ok = assertLocalImageExists(
        storyRef,
        `Story-кадр #${i + 1}: файл не найден (${storyRef}) — используем предыдущий кадр.`,
        {failOnMissingImages: failOnMissingStoryFiles, logs},
      );
      if (!ok) {
        delete conversation.messages[i].storyImage;
      }
    }
  }

  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i];
    const ref = message.image?.trim();
    if (!ref) {
      continue;
    }

    if (isImageUrl(ref)) {
      try {
        const localPath = await downloadImageToPublic(ref, `msg-${i}-${message.author}`);
        message.image = localPath;
        logs.push(`Скачано: ${ref} → ${localPath}`);
      } catch (error) {
        delete message.image;
        const reason = error instanceof Error ? error.message : String(error);
        logs.push(`Сообщение #${i + 1}: изображение не в видео (${reason})`);
      }
      continue;
    }

    const {absolute} = safePublicPath(ref);
    if (!existsSync(absolute)) {
      delete message.image;
      logs.push(`Сообщение #${i + 1}: изображение не прикреплено, в видео не добавляем (${ref})`);
    }
  }

  const before = conversation.messages.length;
  conversation.messages = conversation.messages.filter((message, index) => {
    if (hasRenderableText(message) || hasRenderableImage(message) || hasRenderableStoryImage(message)) {
      return true;
    }
    logs.push(`Сообщение #${index + 1} пропущено: нет текста, изображения и story-кадра`);
    return false;
  });

  if (conversation.messages.length === 0) {
    throw new Error("Нет сообщений для рендера: все пустые или без прикреплённых изображений");
  }

  if (conversation.messages.length < before) {
    logs.push(`В видео: ${conversation.messages.length} из ${before} сообщений`);
  }

  return logs;
};

export const scanImagesFromJson = async (jsonText) => {
  const parsed = JSON.parse(jsonText);
  const refs = collectImageRefs(parsed);
  const items = [];
  for (const item of refs) {
    const statusInfo = await getImageStatus(item.ref);
    items.push({...item, ...statusInfo});
  }
  const storyItems = await collectStoryImageScanItems(parsed);
  return {
    items,
    storyItems,
    ok: items.every((i) => i.status === "ok") && storyItems.every((i) => i.status === "ok"),
  };
};
