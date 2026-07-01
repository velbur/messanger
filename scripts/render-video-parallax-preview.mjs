import path from "node:path";
import {access} from "node:fs/promises";
import {renderMedia, selectComposition} from "@remotion/renderer";
import {FPS} from "../src/chat/fps.ts";
import {getBundleLocation} from "./bundle-cache.mjs";
import {generateStoryDepthAssets} from "./story-depth.mjs";
import {getRenderConcurrency} from "./render-core.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

export const VIDEO_PARALLAX_PREVIEW_SEC = 4;
export const VIDEO_PARALLAX_EXTRA_SEC = 6;

export const defaultHybridDurationFrames = () =>
  (VIDEO_PARALLAX_PREVIEW_SEC + VIDEO_PARALLAX_EXTRA_SEC) * FPS;

export const defaultParallaxOnlyDurationFrames = () => VIDEO_PARALLAX_EXTRA_SEC * FPS;

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
 *   mode?: "hybrid" | "parallax-only",
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
  mode = "hybrid",
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

  const isHybrid = mode !== "parallax-only";
  const frames =
    durationFrames ??
    (isHybrid ? defaultHybridDurationFrames() : defaultParallaxOnlyDurationFrames());

  await access(safePublicAbs(rel));

  if (!skipDepth) {
    onStatus("Depth parallax…");
    const depthResult = await generateStoryDepthAssets(rel, {force: forceDepth});
    if (depthResult.fallback) {
      onStatus("Parallax bake недоступен — Ken Burns fallback");
    } else if (depthResult.skipped) {
      onStatus(`Parallax: кэш OK (${rel})`);
    } else {
      onStatus(`Parallax: запечён (${depthResult.provider ?? "xenova"})`);
    }
  }

  const compositionId = isHybrid ? "StoryVideoParallaxPreview" : "StoryParallaxPreview";
  const inputProps = isHybrid
    ? {image: rel, videoDurationMs, durationFrames: frames}
    : {image: rel, animation: "depthParallax", durationFrames: frames};

  onStatus("Сборка Remotion bundle…");
  const bundleLocation = await getBundleLocation({
    onStatus: (message) => onStatus(message),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
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

  return {outputPath, imageRel: rel, mode, videoDurationMs, durationFrames: frames};
};
