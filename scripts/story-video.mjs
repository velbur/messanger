import {existsSync} from "node:fs";
import path from "node:path";
import {
  OPENROUTER_STORY_VIDEO_PROFILE,
  storyVideoPathForImage,
  storyVideoSeamlessPathForVideo,
} from "../src/chat/story-video-paths.ts";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {generateImageToVideoFile, getOpenRouterStoryVideoModel} from "./openrouter-video.mjs";
import {isOpenRouterConfigured} from "./openrouter-client.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";
import {resolveStoryVideoLoop} from "../src/chat/story-video-mode.ts";
import {ensureStoryVideoSeamlessFile} from "./story-video-seamless.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const LOOP_MOTION_PROMPT =
  "Very subtle ambient motion that forms a perfect seamless loop: the final frame must be visually identical to the first frame (same pose, light, smoke, rain position). Only tiny cyclical effects — breathing light, flicker, gentle sway. Absolutely no camera travel, zoom, or drift forward/backward.";

const HOLD_MOTION_PROMPT =
  "Subtle cinematic motion over a few seconds: one smooth camera move or ambient effect that completes naturally. End on a stable, composed final frame suitable to hold still afterward. No return to the starting pose.";

export const buildStoryMotionPrompt = (imagePrompt, {loop = true} = {}) => {
  const prefix = loop ? LOOP_MOTION_PROMPT : HOLD_MOTION_PROMPT;
  const scene = String(imagePrompt ?? "").trim();
  if (!scene) {
    return prefix;
  }
  return `${prefix} Scene: ${scene}`;
};

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
  if (!existingVideo) {
    return true;
  }
  if (holder?.storyVideoProfile !== OPENROUTER_STORY_VIDEO_PROFILE) {
    return true;
  }
  try {
    const {absolute} = safePublicPath(existingVideo);
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
      image: storyImage,
      imagePrompt: message.storyImagePrompt,
      holder: message,
    });
  }

  return targets;
};

export const countPendingStoryVideos = (conversation) => {
  if (!isStoryVisualLayout(conversation)) {
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
          if (target.holder.storyVideoLoop === undefined) {
            target.holder.storyVideoLoop = resolveStoryVideoLoop(
              undefined,
              target.imagePrompt,
            );
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
      const videoLoop = resolveStoryVideoLoop(
        target.holder?.storyVideoLoop,
        target.imagePrompt,
      );
      await ensureStoryVideoSeamlessFile(videoRef, videoLoop, logs);
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

  const model = getOpenRouterStoryVideoModel();
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
    const videoLoop = resolveStoryVideoLoop(
      target.holder?.storyVideoLoop,
      target.imagePrompt,
    );

    try {
      const result = await generateImageToVideoFile({
        imageAbsolutePath: imageAbsolute,
        imagePublicUrl: imageUrl,
        prompt: buildStoryMotionPrompt(target.imagePrompt, {loop: videoLoop}),
        outputPath: videoAbsolute,
        model,
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

      target.holder.storyVideo = path
        .relative(PUBLIC_DIR, result.outputPath)
        .split(path.sep)
        .join("/");
      target.holder.storyVideoProfile = OPENROUTER_STORY_VIDEO_PROFILE;
      target.holder.storyVideoDurationMs = await probeVideoDurationMs(result.outputPath);
      target.holder.storyVideoLoop = videoLoop;
      await ensureStoryVideoSeamlessFile(target.holder.storyVideo, videoLoop, logs);
      generated += 1;
      logs.push(
        `Story-видео (${target.label}, OpenRouter/${result.model}) → ${target.holder.storyVideo} · ${(target.holder.storyVideoDurationMs / 1000).toFixed(1)} с`,
      );
      onProgress?.({
        done: index + 1,
        total,
        label: target.label,
        stage: "done",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.push(`Story-видео (${target.label}): ошибка — ${reason}`);
    }
  }

  const stillMissing = countPendingStoryVideos(conversation);
  if (stillMissing > 0) {
    const failures = logs.filter((line) => /ошибка/i.test(line));
    const detail =
      failures.length > 0
        ? failures.join("; ")
        : `${stillMissing} story-кадров без видео после генерации`;
    throw new Error(detail);
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
    const seamless = storyVideoSeamlessPathForVideo(ref);
    if (existsSync(path.join(PUBLIC_DIR, seamless))) {
      refs.add(seamless);
    }
  }

  return [...refs];
};

export {PUBLIC_DIR};
