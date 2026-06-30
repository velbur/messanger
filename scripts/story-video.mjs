import {existsSync} from "node:fs";
import path from "node:path";
import {
  OPENROUTER_STORY_VIDEO_PROFILE,
  storyVideoHoldFramePathForVideo,
  storyVideoPathForImage,
} from "../src/chat/story-video-paths.ts";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {shouldGenerateStoryVideos} from "../src/chat/story.ts";
import {
  generateImageToVideoFile,
  getOpenRouterStoryVideoModel,
  getOpenRouterStoryVideoResolution,
  snapStoryVideoDuration,
} from "./openrouter-video.mjs";
import {isOpenRouterConfigured} from "./openrouter-client.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";
import {normalizeStoryVideoLoopFlags} from "../src/chat/story-video-mode.ts";
import {ensureStoryVideoHoldFrameFile} from "./story-video-hold-frame.mjs";
import {buildTimeline} from "../src/chat/timeline.ts";
import {FPS} from "../src/chat/fps.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const LOOP_MOTION_PROMPT =
  "Very subtle ambient motion that forms a perfect seamless loop: the final frame must be visually identical to the first frame (same pose, light, smoke, rain position). Only tiny cyclical effects — breathing light, flicker, gentle sway. Absolutely no camera travel, zoom, or drift forward/backward.";

const HOLD_MOTION_PROMPT =
  "One short subtle motion (2–4 seconds): a small natural movement or ambient effect, then settle on a stable final pose. The last frame must be calm and holdable — suitable to pause with a gentle zoom afterward. No repeating motion, no return to the starting pose.";

export const buildStoryMotionPrompt = (imagePrompt, {loop = false} = {}) => {
  const prefix = loop ? LOOP_MOTION_PROMPT : HOLD_MOTION_PROMPT;
  const scene = String(imagePrompt ?? "").trim();
  if (!scene) {
    return prefix;
  }
  return `${prefix} Scene: ${scene}`;
};

/** Veo отклонил/отфильтровал промпт по контент-политике (а не инфраструктурная ошибка) */
export const isVideoContentPolicyError = (message) =>
  /sensitive words|responsible ai|content may have been filtered|could not be submitted|no output|violate|safety|policy|blocked|flagged/i.test(
    String(message ?? ""),
  );

const safePublicPath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь");
  }
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь");
  }
  return {relative: normalized, absolute};
};

export const publicImageUrl = (publicBaseUrl, imageRef) => {
  const base = String(publicBaseUrl ?? "").trim().replace(/\/$/, "");
  if (!base) {
    return undefined;
  }
  const normalized = String(imageRef).replace(/^\/+/, "");
  const suffix = normalized.startsWith("images/")
    ? normalized.slice("images/".length)
    : normalized;
  return `${base}/images/${suffix}`;
};

const needsStoryVideo = (imageRef, holder) => {
  const image = String(imageRef ?? "").trim();
  if (!image) {
    return false;
  }

  const existingVideo = String(holder?.storyVideo ?? "").trim();
  if (existingVideo) {
    try {
      const {absolute} = safePublicPath(existingVideo);
      if (existsSync(absolute)) {
        return false;
      }
    } catch {
      /* попробуем стандартный путь рядом с PNG */
    }
  }

  const candidate = storyVideoPathForImage(image);
  try {
    const {absolute} = safePublicPath(candidate);
    return !existsSync(absolute);
  } catch {
    return true;
  }
};

const collectStoryVideoTargets = (conversation) => {
  const targets = [];

  const openingImage = conversation?.story?.opening?.image?.trim();
  if (openingImage) {
    targets.push({
      label: "opening",
      kind: "opening",
      messageIndex: -1,
      image: openingImage,
      imagePrompt: conversation?.story?.opening?.imagePrompt,
      holder: conversation.story.opening,
    });
  }

  for (let index = 0; index < (conversation?.messages ?? []).length; index += 1) {
    const message = conversation.messages[index];
    const storyImage = message?.storyImage?.trim();
    if (!storyImage) {
      continue;
    }
    targets.push({
      label: `message #${index + 1}`,
      kind: "message",
      messageIndex: index,
      image: storyImage,
      imagePrompt: message.storyImagePrompt,
      holder: message,
    });
  }

  return targets;
};

/**
 * Сколько секунд каждая story-сцена реально на экране (по таймлайну рендера).
 * Ключи: "opening" и индекс сообщения. Длина сцены = до старта следующей
 * сцены (последняя — до начала outro), что совпадает с окнами показа.
 */
const buildStorySceneSeconds = (conversation) => {
  const lookup = new Map();
  try {
    const timeline = buildTimeline(conversation);
    const story = timeline.story;
    if (!story.enabled) {
      return lookup;
    }

    const scenes = story.sceneEvents;
    const firstSceneStart = scenes[0]?.startFrame ?? timeline.outroStartFrame;

    if (!story.immediateFirstScene && (story.openingImage || story.openingVideo)) {
      lookup.set("opening", Math.max(1, firstSceneStart - story.openingStartFrame) / FPS);
    }

    scenes.forEach((event, index) => {
      const displayEnd = scenes[index + 1]?.startFrame ?? timeline.outroStartFrame;
      lookup.set(event.messageIndex, Math.max(1, displayEnd - event.startFrame) / FPS);
    });
  } catch {
    // нет валидного таймлайна — упадём на дефолтную длительность клипа
  }
  return lookup;
};

const sceneSecondsForTarget = (lookup, target) => {
  const key = target.kind === "opening" ? "opening" : target.messageIndex;
  const seconds = lookup.get(key);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export const countPendingStoryVideos = (conversation) => {
  if (!isStoryVisualLayout(conversation) || !shouldGenerateStoryVideos(conversation)) {
    return 0;
  }
  return collectStoryVideoTargets(conversation).filter((target) =>
    needsStoryVideo(target.image, target.holder),
  ).length;
};

export const resolveStoryVideos = async (
  conversation,
  {failOnMissingVideos = false, logs = []} = {},
) => {
  if (!isStoryVisualLayout(conversation)) {
    return logs;
  }
  if (!shouldGenerateStoryVideos(conversation)) {
    logs.push("Story-видео: режим без Veo — MP4 не требуются");
    return logs;
  }

  normalizeStoryVideoLoopFlags(conversation);

  for (const target of collectStoryVideoTargets(conversation)) {
    let videoRef = String(target.holder?.storyVideo ?? "").trim();

    if (!videoRef) {
      const candidate = storyVideoPathForImage(target.image);
      try {
        const {absolute} = safePublicPath(candidate);
        if (existsSync(absolute)) {
          videoRef = candidate;
          target.holder.storyVideo = candidate;
          if (!target.holder.storyVideoDurationMs) {
            target.holder.storyVideoDurationMs = await probeVideoDurationMs(absolute);
          }
          if (!target.holder.storyVideoProfile) {
            target.holder.storyVideoProfile = OPENROUTER_STORY_VIDEO_PROFILE;
          }
          logs.push(`Story-видео (${target.label}): подключено с диска → ${candidate}`);
        }
      } catch {
        /* skip */
      }
    }

    if (!videoRef) {
      logs.push(`Story-видео (${target.label}): нет MP4 — показ статичного кадра`);
      continue;
    }

    try {
      const {absolute} = safePublicPath(videoRef);
      if (!existsSync(absolute)) {
        throw new Error("файл не найден");
      }
      await ensureStoryVideoHoldFrameFile(videoRef, logs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const errorText = `Story-видео (${target.label}): ${reason} (${videoRef})`;
      if (failOnMissingVideos) {
        throw new Error(errorText);
      }
      logs.push(errorText);
      delete target.holder.storyVideo;
      delete target.holder.storyVideoDurationMs;
      delete target.holder.storyVideoProfile;
    }
  }

  return logs;
};

export const generateMissingStoryVideos = async (
  conversation,
  {publicBaseUrl, force = false, onProgress, isCancelled} = {},
) => {
  const logs = [];
  if (!isStoryVisualLayout(conversation)) {
    return logs;
  }
  if (!shouldGenerateStoryVideos(conversation)) {
    logs.push("Story-видео: режим анимации без Veo — пропуск генерации");
    return logs;
  }

  normalizeStoryVideoLoopFlags(conversation);

  const targets = collectStoryVideoTargets(conversation).filter(
    (target) => force || needsStoryVideo(target.image, target.holder),
  );

  if (targets.length === 0) {
    logs.push("Все story-кадры уже анимированы");
    return logs;
  }

  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const animation = conversation.story?.opening?.animation;
  const isSeedance = animation === "video-seedance";
  const model = isSeedance ? "bytedance/seedance-2.0-fast" : getOpenRouterStoryVideoModel();
  const resolution = getOpenRouterStoryVideoResolution();
  const sceneSeconds = buildStorySceneSeconds(conversation);
  let generated = 0;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (isCancelled?.()) {
      throw new Error("Отменено пользователем");
    }

    const total = targets.length;
    onProgress?.({
      done: index,
      total,
      label: target.label,
      stage: "generating",
    });

    const {absolute: imageAbsolute} = safePublicPath(target.image);
    const videoRef = storyVideoPathForImage(target.image);
    const {absolute: videoAbsolute} = safePublicPath(videoRef);
    const imageUrl = publicImageUrl(publicBaseUrl, target.image);

    const sceneSec = sceneSecondsForTarget(sceneSeconds, target);
    const duration = isSeedance ? Math.max(3, Math.min(5, Math.ceil(sceneSec))) : snapStoryVideoDuration(sceneSec);

    const runGeneration = (prompt) =>
      generateImageToVideoFile({
        imageAbsolutePath: imageAbsolute,
        imagePublicUrl: imageUrl,
        prompt,
        outputPath: videoAbsolute,
        model,
        duration,
        resolution,
        onPoll: ({attempt, maxAttempts, status}) => {
          onProgress?.({
            done: index,
            total,
            label: target.label,
            stage: "polling",
            attempt,
            maxAttempts,
            status,
          });
        },
      });

    let result = null;
    try {
      result = await runGeneration(buildStoryMotionPrompt(target.imagePrompt, {loop: false}));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // Контент-фильтр Google режет описание сцены — повторяем без него,
      // только нейтральное ambient-движение по уже одобренной картинке.
      if (isVideoContentPolicyError(reason)) {
        logs.push(
          `Story-видео (${target.label}): промпт отклонён фильтром Google — повтор с нейтральным движением без описания сцены`,
        );
        try {
          result = await runGeneration(buildStoryMotionPrompt("", {loop: false}));
        } catch (retryError) {
          const retryReason = retryError instanceof Error ? retryError.message : String(retryError);
          logs.push(
            `Story-видео (${target.label}): анимация недоступна (${retryReason}) — кадр останется статичным`,
          );
        }
      } else {
        logs.push(`Story-видео (${target.label}): ошибка — ${reason} — кадр останется статичным`);
      }
    }

    if (!result) {
      continue;
    }

    target.holder.storyVideo = path
      .relative(PUBLIC_DIR, result.outputPath)
      .split(path.sep)
      .join("/");
    target.holder.storyVideoProfile = OPENROUTER_STORY_VIDEO_PROFILE;
    target.holder.storyVideoDurationMs = await probeVideoDurationMs(result.outputPath);
    await ensureStoryVideoHoldFrameFile(target.holder.storyVideo, logs);
    generated += 1;
    const sceneHint = Number.isFinite(sceneSec) ? `, сцена ~${sceneSec.toFixed(1)} с` : "";
    logs.push(
      `Story-видео (${target.label}, OpenRouter/${result.model}, ${duration} с/${resolution}${sceneHint}) → ${target.holder.storyVideo} · ${(target.holder.storyVideoDurationMs / 1000).toFixed(1)} с`,
    );
    onProgress?.({
      done: index + 1,
      total,
      label: target.label,
      stage: "done",
    });
  }

  // Нехватка видео не валит рендер: сцена показывается статичным кадром с Ken Burns.
  const stillMissing = countPendingStoryVideos(conversation);
  if (stillMissing > 0) {
    logs.push(
      `⚠ Без анимации остаётся ${stillMissing} story-кадров — они будут статичными (Ken Burns). Рендер продолжится.`,
    );
  }

  if (generated === 0 && logs.length === 0) {
    logs.push("Все story-кадры уже анимированы");
  }

  return logs;
};

export const collectStoryVideoRefs = (conversation) => {
  const refs = new Set();
  const add = (ref) => {
    const normalized = String(ref ?? "").trim().replace(/^\/+/, "");
    if (normalized) {
      refs.add(normalized);
    }
  };

  if (!isStoryVisualLayout(conversation)) {
    return [];
  }

  add(conversation?.story?.opening?.storyVideo);
  for (const message of conversation?.messages ?? []) {
    add(message?.storyVideo);
  }

  for (const ref of [...refs]) {
    add(storyVideoHoldFramePathForVideo(ref));
  }

  return [...refs];
};

export {PUBLIC_DIR};
