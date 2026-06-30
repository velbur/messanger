import path from "node:path";
import {existsSync} from "node:fs";
import {mkdir} from "node:fs/promises";
import {
  buildEpisodeConversations,
  buildPreviewCoverTitle,
} from "../src/chat/episodes.ts";
import {DEFAULT_PREVIEW_COVER_MS} from "../src/chat/preview-cover.ts";
import {renderPreviewCover} from "./render-core.mjs";
import {saveImageBuffer} from "./image-assets.mjs";
import {readStoryStylePrompt} from "./image-prompt.mjs";
import {
  buildPreviewCoverPrompt,
  loadPreviewCoverReferenceDataUrl,
  resolvePreviewCoverSceneHint,
} from "./preview-cover.mjs";
import {generateImageBuffer, getOpenRouterStoryImageModel, getOpenRouterStoryImageSize, isOpenRouterConfigured} from "./openrouter-client.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const episodeCoverRef = (namespace, episodeNumber, episodeCount) => {
  if (episodeCount <= 1) {
    return `images/${namespace}/preview-cover.png`;
  }
  const ep = String(episodeNumber).padStart(2, "0");
  return `images/${namespace}/preview-cover-ep${ep}.png`;
};

const resolveBaseTitle = (conversation, displayTitle, imageNamespace) => {
  const fromArg = String(displayTitle ?? "").trim();
  if (fromArg) {
    return fromArg;
  }
  const fromCover = String(conversation?.previewCover?.title ?? "").trim();
  if (fromCover) {
    return fromCover;
  }
  const fromHook = String(conversation?.hookText ?? "").trim();
  if (fromHook) {
    return fromHook;
  }
  return String(imageNamespace ?? "shorts").trim() || "shorts";
};

/**
 * Генерирует фон обложки (один раз) и запекает финальные PNG с заголовком.
 * Для эпизодов — отдельный файл и «Название» + «Часть N» на новой строке.
 */
export const ensureConversationPreviewCovers = async (
  conversation,
  {displayTitle, imageNamespace, onLog} = {},
) => {
  const logs = [];
  const log = (message) => {
    logs.push(message);
    onLog?.(message);
  };

  const namespace = String(imageNamespace ?? "shorts").trim() || "shorts";
  const episodeSlices = buildEpisodeConversations(conversation);
  const episodeCount = episodeSlices.length;
  const baseTitle = resolveBaseTitle(conversation, displayTitle, namespace);
  const durationMs = conversation?.previewCover?.durationMs ?? DEFAULT_PREVIEW_COVER_MS;

  const srcRel = `images/${namespace}/preview-cover.src.png`;
  const srcAbs = path.join(PUBLIC_DIR, srcRel);

  if (!existsSync(srcAbs)) {
    if (!isOpenRouterConfigured()) {
      throw new Error(
        "Для автогенерации обложки превью нужен OPENROUTER_API_KEY в docs/.env",
      );
    }
    log("Генерация фона обложки превью (OpenRouter)…");
    const style = await readStoryStylePrompt();
    const prompt = buildPreviewCoverPrompt({
      title: baseTitle,
      sceneHint: resolvePreviewCoverSceneHint(conversation),
      stylePrompt: style,
    });
    const referenceDataUrl = await loadPreviewCoverReferenceDataUrl(conversation);
    const {buffer} = await generateImageBuffer({
      prompt,
      referenceDataUrl,
      aspectRatio: "9:16",
      model: getOpenRouterStoryImageModel(),
      imageSize: getOpenRouterStoryImageSize(),
      kind: "story",
    });
    await saveImageBuffer(buffer, srcRel);
    log(`Фон обложки сохранён: ${srcRel}`);
  } else {
    log(`Фон обложки: ${srcRel}`);
  }

  await mkdir(path.dirname(srcAbs), {recursive: true});

  const updatedEpisodes = [];
  for (let i = 0; i < episodeCount; i += 1) {
    const episodeNumber = i + 1;
    const title = buildPreviewCoverTitle(baseTitle, episodeNumber, episodeCount);
    const outRel = episodeCoverRef(namespace, episodeNumber, episodeCount);
    const outAbs = path.join(PUBLIC_DIR, outRel);

    log(
      episodeCount > 1
        ? `Обложка эпизода ${episodeNumber}/${episodeCount}: «${title}»`
        : `Обложка превью: «${title}»`,
    );
    await renderPreviewCover({
      image: srcRel,
      title,
      outputPath: outAbs,
    });

    updatedEpisodes.push({
      ...episodeSlices[i],
      previewCover: {
        enabled: true,
        image: outRel,
        title,
        durationMs,
      },
    });
    log(`Готово: ${outRel}`);
  }

  const primaryCover = updatedEpisodes[0]?.previewCover;
  const updatedConversation = {
    ...conversation,
    previewCover: primaryCover,
  };

  return {
    conversation: updatedConversation,
    episodeConversations: updatedEpisodes,
    logs,
  };
};

/** Пути обложек превью для синхронизации на воркер (фон + запечённые эпизоды). */
export const collectPreviewCoverSyncRefs = (
  conversation,
  {imageNamespace, episodeConversations} = {},
) => {
  const refs = new Set();
  const add = (ref) => {
    const normalized = String(ref ?? "").trim().replace(/^\/+/, "");
    if (normalized && !/^https?:\/\//i.test(normalized)) {
      refs.add(normalized);
    }
  };

  const namespace = String(imageNamespace ?? "").trim();
  if (namespace) {
    add(`images/${namespace}/preview-cover.src.png`);
    add(`images/${namespace}/preview-cover.png`);
  }

  const episodes =
    episodeConversations?.length > 0
      ? episodeConversations
      : buildEpisodeConversations(conversation);
  for (const episode of episodes) {
    add(episode?.previewCover?.image);
  }

  add(conversation?.previewCover?.image);

  return [...refs];
};

export const episodeOutputFiles = (fileName, episodeCount) => {
  if (episodeCount <= 1) {
    return [`${fileName}.mp4`];
  }
  return Array.from({length: episodeCount}, (_, index) => {
    const ep = String(index + 1).padStart(2, "0");
    return `${fileName}-ep${ep}.mp4`;
  });
};
