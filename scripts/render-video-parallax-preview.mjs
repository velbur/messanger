import path from "node:path";
import {access} from "node:fs/promises";
import {renderMedia, selectComposition} from "@remotion/renderer";
import {FPS} from "../src/chat/fps.ts";
import {STORY_VIDEO_PARALLAX_HANDOFF_TRIM_FRAMES} from "../src/chat/story-motion.ts";
import {storyVideoPathForImage} from "../src/chat/story-video-paths.ts";
import {getBundleLocation} from "./bundle-cache.mjs";
import {generateStoryDepthAssets, ensureVideoParallaxHoldDepth} from "./story-depth.mjs";
import {getRenderConcurrency} from "./render-core.mjs";
import {ensureStoryVideoHoldFrameFile} from "./story-video-hold-frame.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

export const VIDEO_PARALLAX_PREVIEW_SEC = 4;
export const VIDEO_PARALLAX_EXTRA_SEC = 15;

/** Кадров parallax-фазы после Veo (для bake clip = длина движения) */
export const videoParallaxPhaseFrames = (
  videoDurationMs,
  sceneDurationFrames,
  fps = FPS,
) => {
  const videoFrames = Math.max(2, Math.round((videoDurationMs / 1000) * fps));
  const handoff = Math.max(2, videoFrames - STORY_VIDEO_PARALLAX_HANDOFF_TRIM_FRAMES);
  return Math.max(45, sceneDurationFrames - handoff);
};

/** Длина превью: реальное Veo + фаза parallax после последнего кадра */
export const hybridDurationFrames = (videoDurationMs = VIDEO_PARALLAX_PREVIEW_SEC * 1000) =>
  Math.max(2, Math.round((videoDurationMs / 1000) * FPS)) + VIDEO_PARALLAX_EXTRA_SEC * FPS;

const safePublicAbs = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь");
  }
  return absolute;
};

/**
 * @param {{
 *   imageRel: string,
 *   videoDurationMs?: number,
 *   durationFrames?: number,
 *   outputPath: string,
 *   skipDepth?: boolean,
 *   forceDepth?: boolean,
 *   onStatus?: (message: string) => void,
 * }} opts
 */
export const renderVideoParallaxPreview = async ({
  imageRel,
  videoDurationMs = VIDEO_PARALLAX_PREVIEW_SEC * 1000,
  durationFrames,
  outputPath,
  skipDepth = false,
  forceDepth = false,
  onStatus = () => {},
}) => {
  const rel = String(imageRel).replace(/^\/+/, "").trim();
  if (!rel) {
    throw new Error("Пустой путь к story-изображению");
  }

  const frames = durationFrames ?? hybridDurationFrames(videoDurationMs);
  const videoRel = storyVideoPathForImage(rel);

  await access(safePublicAbs(rel));
  await access(safePublicAbs(videoRel));

  onStatus(`Hold-кадр из ${videoRel}…`);
  await ensureStoryVideoHoldFrameFile(videoRel);

  if (!skipDepth) {
    const parallaxFrames = videoParallaxPhaseFrames(videoDurationMs, frames);
    onStatus(`Depth parallax (hold, ${parallaxFrames} кадров)…`);
    const depthResult = await ensureVideoParallaxHoldDepth(rel, {
      force: forceDepth,
      videoRef: videoRel,
      frames: parallaxFrames,
    });
    if (depthResult.fallback) {
      onStatus("Parallax bake недоступен — Ken Burns fallback");
    } else if (depthResult.skipped) {
      onStatus(`Parallax: кэш OK (hold → ${depthResult.relative})`);
    } else {
      onStatus(`Parallax: запечён с hold-кадра (${depthResult.provider ?? "xenova"})`);
    }
  }

  const inputProps = {image: rel, videoDurationMs, durationFrames: frames};

  onStatus("Сборка Remotion bundle…");
  const bundleLocation = await getBundleLocation({
    onStatus: (message) => onStatus(message),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "StoryVideoParallaxPreview",
    inputProps,
  });

  onStatus(`Рендер превью → ${path.relative(ROOT, outputPath)}`);
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: frames,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: outputPath,
    inputProps,
    concurrency: getRenderConcurrency(),
    x264Preset: "veryfast",
  });

  return {outputPath, imageRel: rel, videoDurationMs, durationFrames: frames};
};
