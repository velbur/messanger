import {existsSync} from "node:fs";
import path from "node:path";
import {
  OPENROUTER_STORY_VIDEO_PROFILE,
  LOCAL_GPU_STORY_VIDEO_PROFILE,
  storyVideoHoldFramePathForVideo,
  storyVideoPathForImage,
} from "../src/chat/story-video-paths.ts";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {mergeStoryConfig, shouldGenerateStoryVideos} from "../src/chat/story.ts";
import {
  getOpenRouterStoryVideoModel,
  getOpenRouterStoryVideoResolution,
  snapStoryVideoDuration,
} from "./openrouter-video.mjs";
import {
  describeStoryVideoProvider,
  generateStoryVideoFile,
  getStoryVideoGenerationStatus,
  getStoryVideoProvider,
  isStoryVideoGenerationConfigured,
} from "./story-video-provider.mjs";
import {getLocalGpuVideoModel} from "./local-gpu-video.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";
import {normalizeStoryVideoLoopFlags} from "../src/chat/story-video-mode.ts";
import {ensureStoryVideoHoldFrameFile} from "./story-video-hold-frame.mjs";
import {ensureVideoParallaxHoldDepth} from "./story-depth.mjs";
import {buildTimeline} from "../src/chat/timeline.ts";
import {FPS} from "../src/chat/fps.ts";
import {videoParallaxPhaseFrames, VIDEO_PARALLAX_EXTRA_SEC} from "./render-video-parallax-preview.mjs";
import {storyVideoForwardDurationFrames} from "../src/chat/story-motion.ts";
import {
  buildStoryMotionPrompt,
  describeMotionPromptMode,
  imagePromptLikelyHasPeople,
} from "./story-motion-prompt.mjs";

export {buildStoryMotionPrompt, describeMotionPromptMode, imagePromptLikelyHasPeople} from "./story-motion-prompt.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

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

const isVideoParallaxConversation = (conversation) =>
  mergeStoryConfig(conversation).opening.animation === "video-parallax";

const bakeHoldParallaxAfterVideo = async (conversation, target, videoRef, logs, {force = false} = {}) => {
  if (!isVideoParallaxConversation(conversation)) {
    return;
  }
  const lookup = buildStorySceneSeconds(conversation);
  const sceneSec = sceneSecondsForTarget(lookup, target);
  const videoMs = Number(target.holder?.storyVideoDurationMs) || 4000;
  const sceneDurationFrames = sceneSec
    ? Math.max(45, Math.round(sceneSec * FPS))
    : storyVideoForwardDurationFrames(videoMs, FPS) + VIDEO_PARALLAX_EXTRA_SEC * FPS;
  const frames = videoParallaxPhaseFrames(videoMs, sceneDurationFrames, FPS);
  const result = await ensureVideoParallaxHoldDepth(target.image, {videoRef, force, frames});
  if (result.skipped) {
    logs.push(`Parallax (hold): кэш OK → ${result.relative}`);
  } else {
    logs.push(
      `Parallax (hold): запечён с последнего кадра Veo (${result.provider ?? "depth"}) → ${result.relative}`,
    );
  }
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
  {failOnMissingVideos = false, skipHoldParallaxBake = false, logs = []} = {},
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
            target.holder.storyVideoProfile =
              getStoryVideoProvider() === "local-gpu"
                ? LOCAL_GPU_STORY_VIDEO_PROFILE
                : OPENROUTER_STORY_VIDEO_PROFILE;
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
      if (!skipHoldParallaxBake) {
        await bakeHoldParallaxAfterVideo(conversation, target, videoRef, logs);
      }
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
  {publicBaseUrl, force = false, skipHoldParallaxBake = false, onProgress, isCancelled} = {},
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

  if (!isStoryVideoGenerationConfigured()) {
    const provider = getStoryVideoProvider();
    if (provider === "local-gpu") {
      throw new Error("Local GPU не настроен (LOCAL_GPU_VIDEO_URL)");
    }
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const videoStatus = getStoryVideoGenerationStatus();
  const model =
    videoStatus.provider === "local-gpu"
      ? getLocalGpuVideoModel()
      : getOpenRouterStoryVideoModel();
  const resolution =
    videoStatus.provider === "local-gpu"
      ? videoStatus.resolution
      : getOpenRouterStoryVideoResolution();
  const sceneSeconds = buildStorySceneSeconds(conversation);
  let generated = 0;

  logs.push(`Story-видео: провайдер ${describeStoryVideoProvider()}`);

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
    const animation = conversation.story?.opening?.animation;
    const isVideoParallax = animation === "video-parallax";
    // Если video-parallax, генерируем только 4 секунды (минимальная длина Veo), остальное покроет parallax
    const duration = isVideoParallax ? 4 : snapStoryVideoDuration(sceneSec);

    const runGeneration = (prompt) =>
      generateStoryVideoFile({
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
            stage: videoStatus.provider === "local-gpu" ? "generating" : "polling",
            attempt,
            maxAttempts,
            status,
          });
        },
      });

    let result = null;
    const motionPrompt = buildStoryMotionPrompt(target.imagePrompt, {loop: false});
    const motionMode = describeMotionPromptMode(target.imagePrompt, {loop: false});
    if (motionMode === "ambient-only-people") {
      logs.push(
        `Story-видео (${target.label}): в imagePrompt есть люди — только ambient-движение, без описания сцены`,
      );
    }
    try {
      result = await runGeneration(motionPrompt);
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
    target.holder.storyVideoProfile =
      result.provider === "local-gpu"
        ? LOCAL_GPU_STORY_VIDEO_PROFILE
        : OPENROUTER_STORY_VIDEO_PROFILE;
    target.holder.storyVideoDurationMs = await probeVideoDurationMs(result.outputPath);
    await ensureStoryVideoHoldFrameFile(target.holder.storyVideo, logs);
    if (!skipHoldParallaxBake) {
      await bakeHoldParallaxAfterVideo(conversation, target, target.holder.storyVideo, logs, {force});
    } else {
      logs.push(`Parallax (hold): запекётся на воркере → ${target.label}`);
    }
    generated += 1;
    const sceneHint = Number.isFinite(sceneSec) ? `, сцена ~${sceneSec.toFixed(1)} с` : "";
    const providerName =
      result.provider === "local-gpu"
        ? `Local GPU/${result.model}`
        : `OpenRouter/${result.model}`;
    logs.push(
      `Story-видео (${target.label}, ${providerName}, ${duration} с/${resolution}${sceneHint}) → ${target.holder.storyVideo} · ${(target.holder.storyVideoDurationMs / 1000).toFixed(1)} с`,
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

/** Story-PNG, для которых в режиме video-parallax уже есть Veo — parallax печётся с hold-кадра, не с PNG. */
export const storyImagesWithVideoHybrid = (conversation) => {
  const set = new Set();
  if (!isVideoParallaxConversation(conversation)) {
    return set;
  }

  for (const target of collectStoryVideoTargets(conversation)) {
    const imagePath = target.image.replace(/^\/+/, "");
    const existingVideo = String(target.holder?.storyVideo ?? "").trim();
    if (existingVideo) {
      try {
        const {absolute} = safePublicPath(existingVideo);
        if (existsSync(absolute)) {
          set.add(imagePath);
          continue;
        }
      } catch {
        /* try default path */
      }
    }

    const candidate = storyVideoPathForImage(target.image);
    try {
      const {absolute} = safePublicPath(candidate);
      if (existsSync(absolute)) {
        set.add(imagePath);
      }
    } catch {
      /* skip */
    }
  }

  return set;
};

/** Гарантирует hold-frame + `.video-hold.parallax.mp4` для всех Veo-сцен (как в test:video-parallax). */
export const ensureVideoParallaxHoldsForConversation = async (conversation, {force = false} = {}) => {
  const logs = [];
  if (!isVideoParallaxConversation(conversation)) {
    return logs;
  }

  for (const target of collectStoryVideoTargets(conversation)) {
    let videoRef = String(target.holder?.storyVideo ?? "").trim();
    if (!videoRef) {
      const candidate = storyVideoPathForImage(target.image);
      try {
        const {absolute} = safePublicPath(candidate);
        if (existsSync(absolute)) {
          videoRef = candidate;
        }
      } catch {
        continue;
      }
    }
    if (!videoRef) {
      continue;
    }

    const {absolute} = safePublicPath(videoRef);
    if (!existsSync(absolute)) {
      continue;
    }
    await ensureStoryVideoHoldFrameFile(videoRef, logs);
    await bakeHoldParallaxAfterVideo(conversation, target, videoRef, logs, {force});
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
    const base = ref.replace(/\.video\.mp4$/i, "");
    add(`${base}.video-hold.parallax.mp4`);
    add(`${base}.video-hold.depth.png`);
    add(`${base}.video-hold.depth-meta.json`);
  }

  return [...refs];
};

export {PUBLIC_DIR};
