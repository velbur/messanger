#!/usr/bin/env node
/**
 * Превью гибрида Veo (4 с) + Depth parallax на одной картинке.
 *
 *   npm run test:video-parallax -- --image path/to.png
 *   npm run test:video-parallax -- --image path/to.png --skip-video   # только parallax (нужен .video.mp4)
 *   npm run test:video-parallax -- --image path/to.png --skip-depth   # без перезапекания parallax
 *   npm run test:video-parallax -- --image path/to.png --prompt "subtle wind in hair"
 */
import path from "node:path";
import {mkdir, copyFile, access} from "node:fs/promises";
import {renderMedia, selectComposition} from "@remotion/renderer";
import {FPS} from "../src/chat/fps.ts";
import {storyVideoPathForImage} from "../src/chat/story-video-paths.ts";
import {getBundleLocation} from "./bundle-cache.mjs";
import {generateStoryDepthAssets} from "./story-depth.mjs";
import {
  loadOpenRouterEnv,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";
import {
  generateImageToVideoFile,
  getOpenRouterStoryVideoModel,
  getOpenRouterStoryVideoResolution,
} from "./openrouter-video.mjs";
import {buildStoryMotionPrompt} from "./story-video.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEST_SLUG = "video-parallax-test";
const IMAGE_REL = `images/${TEST_SLUG}/story-opening.png`;
const DEFAULT_OUT = path.join(ROOT, "out/video-parallax-test");
const VIDEO_SEC = 4;
const PARALLAX_EXTRA_SEC = 6;

const PUBLIC_DIR = path.join(ROOT, "public");

const parseArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const hasFlag = (name) => process.argv.includes(name);

const safePublicAbs = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь");
  }
  return absolute;
};

const run = async () => {
  const imageArg = parseArg("--image");
  if (!imageArg) {
    throw new Error("Укажи --image path/to.png");
  }

  const imageAbs = path.resolve(imageArg);
  await access(imageAbs);

  const outDir = path.resolve(parseArg("--out-dir") ?? DEFAULT_OUT);
  const imageDir = path.join(PUBLIC_DIR, "images", TEST_SLUG);
  const imageDest = path.join(imageDir, "story-opening.png");
  const videoRel = storyVideoPathForImage(IMAGE_REL);
  const videoAbs = safePublicAbs(videoRel);

  await mkdir(imageDir, {recursive: true});
  await mkdir(outDir, {recursive: true});
  await copyFile(imageAbs, imageDest);
  console.log(`Картинка → public/${IMAGE_REL}`);

  await loadOpenRouterEnv();

  let videoDurationMs = VIDEO_SEC * 1000;

  if (!hasFlag("--skip-video")) {
    if (!isOpenRouterConfigured()) {
      throw new Error("OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env");
    }

    const scenePrompt = parseArg("--prompt") ?? "";
    const model = getOpenRouterStoryVideoModel();
    const resolution = getOpenRouterStoryVideoResolution();
    console.log(`Veo: ${model}, ${VIDEO_SEC} с, ${resolution}…`);

    await generateImageToVideoFile({
      imageAbsolutePath: imageDest,
      prompt: buildStoryMotionPrompt(scenePrompt, {loop: false}),
      outputPath: videoAbs,
      model,
      duration: VIDEO_SEC,
      resolution,
      onPoll: ({attempt, maxAttempts, status}) => {
        console.log(`  OpenRouter ${status ?? "…"} (${attempt}/${maxAttempts})`);
      },
    });

    videoDurationMs = await probeVideoDurationMs(videoAbs);
    console.log(`Видео → public/${videoRel} (${(videoDurationMs / 1000).toFixed(1)} с)`);
  } else {
    await access(videoAbs);
    videoDurationMs = await probeVideoDurationMs(videoAbs);
    console.log(`Видео: кэш OK → public/${videoRel} (${(videoDurationMs / 1000).toFixed(1)} с)`);
  }

  if (!hasFlag("--skip-depth")) {
    const depthResult = await generateStoryDepthAssets(IMAGE_REL, {force: hasFlag("--force-depth")});
    if (depthResult.fallback) {
      console.warn(
        "⚠ Parallax bake недоступен (нет Python/opencv) — вместо depth parallax будет Ken Burns",
      );
      console.warn("  Для настоящего parallax: worker с WORKER_GPU=1 ./run.sh worker --build");
    } else {
      console.log(
        depthResult.skipped
          ? `Parallax: кэш OK → ${IMAGE_REL}`
          : `Parallax: запечён loop (${depthResult.provider ?? "xenova"})`,
      );
    }
  } else {
    console.log("Parallax: пропуск (--skip-depth)");
  }

  const durationFrames = (VIDEO_SEC + PARALLAX_EXTRA_SEC) * FPS;
  const inputProps = {
    image: IMAGE_REL,
    videoDurationMs,
    durationFrames,
  };

  const bundleLocation = await getBundleLocation({
    onStatus: (message) => console.log(message),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "StoryVideoParallaxPreview",
    inputProps,
  });

  const outputPath = path.join(outDir, "video-parallax-preview.mp4");
  console.log(
    `Рендер ${VIDEO_SEC} с Veo + ${PARALLAX_EXTRA_SEC} с parallax → ${path.relative(ROOT, outputPath)}`,
  );

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: durationFrames,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: outputPath,
    inputProps,
    concurrency: 2,
    x264Preset: "veryfast",
  });

  console.log(`\nГотово: ${path.relative(ROOT, outputPath)}`);
  console.log(`  ${VIDEO_SEC} с — Veo-анимация`);
  console.log(`  далее ${PARALLAX_EXTRA_SEC} с — depth parallax`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
