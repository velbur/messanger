#!/usr/bin/env node
/**
 * Превью гибрида Veo (4 с) + Depth parallax на одной картинке.
 *
 *   npm run test:video-parallax -- --image public/images/foo/story-msg-6.png
 *   npm run test:video-parallax -- --image public/images/foo/story-msg-6.png --skip-video
 *   npm run test:video-parallax -- --image … --skip-depth
 *   npm run test:video-parallax -- --image … --remote http://127.0.0.1:3333
 *   REMOTE_RENDER_URL=http://127.0.0.1:3333 npm run test:video-parallax -- --image …
 */
import path from "node:path";
import {mkdir, access} from "node:fs/promises";
import {FPS} from "../src/chat/fps.ts";
import {storyVideoPathForImage} from "../src/chat/story-video-paths.ts";
import {slugifyProjectName} from "./project-slug.mjs";
import {
  defaultHybridDurationFrames,
  defaultParallaxOnlyDurationFrames,
  renderVideoParallaxPreview,
  VIDEO_PARALLAX_EXTRA_SEC,
  VIDEO_PARALLAX_PREVIEW_SEC,
} from "./render-video-parallax-preview.mjs";
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
import {resolveRemoteRenderUrl, renderVideoParallaxPreviewOnRemote} from "./remote-render-client.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DEFAULT_OUT = path.join(ROOT, "out/video-parallax-test");

const parseArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const hasFlag = (name) => process.argv.includes(name);

const parseRemoteUrl = () => {
  const index = process.argv.indexOf("--remote");
  if (index === -1) {
    return null;
  }
  const next = process.argv[index + 1];
  if (next && !next.startsWith("-")) {
    return next;
  }
  return "";
};

const safePublicAbs = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь");
  }
  return absolute;
};

/** Путь под public/ (images/…) или null, если файл вне public */
const resolveImageRel = (imageArg) => {
  const abs = path.resolve(ROOT, imageArg);
  const rel = path.relative(PUBLIC_DIR, abs).replace(/\\/g, "/");
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel;
  }
  return null;
};

const run = async () => {
  const imageArg = parseArg("--image");
  if (!imageArg) {
    throw new Error("Укажи --image path/to.png (лучше под public/images/)");
  }

  const imageRel = resolveImageRel(imageArg);
  if (!imageRel) {
    throw new Error(
      "Картинка должна лежать под public/ (напр. public/images/slug/story-msg-6.png)",
    );
  }

  await access(safePublicAbs(imageRel));
  console.log(`Картинка: public/${imageRel}`);

  const outDir = path.resolve(parseArg("--out-dir") ?? DEFAULT_OUT);
  await mkdir(outDir, {recursive: true});

  const forceLocal = hasFlag("--local");
  const remoteUrl = forceLocal ? null : resolveRemoteRenderUrl(parseRemoteUrl());
  const useRemote = Boolean(remoteUrl);

  if (useRemote) {
    console.log(`Рендер: воркер (${remoteUrl})`);
  } else if (!forceLocal && !hasFlag("--remote")) {
    console.log("Рендер: локально");
    console.log("Подсказка: --remote http://127.0.0.1:3333  или  REMOTE_RENDER_URL=…");
  }

  const videoRel = storyVideoPathForImage(imageRel);
  const videoAbs = safePublicAbs(videoRel);
  let mode = "hybrid";
  let videoDurationMs = VIDEO_PARALLAX_PREVIEW_SEC * 1000;

  if (!useRemote) {
    await loadOpenRouterEnv();
  }

  if (!hasFlag("--skip-video")) {
    if (useRemote) {
      throw new Error(
        "Генерация Veo на воркере через этот скрипт не поддержана — сначала --skip-video (нужен .video.mp4) или рендерь локально без --remote",
      );
    }
    if (!isOpenRouterConfigured()) {
      throw new Error("OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env");
    }

    const scenePrompt = parseArg("--prompt") ?? "";
    const model = getOpenRouterStoryVideoModel();
    const resolution = getOpenRouterStoryVideoResolution();
    console.log(`Veo: ${model}, ${VIDEO_PARALLAX_PREVIEW_SEC} с, ${resolution}…`);

    await generateImageToVideoFile({
      imageAbsolutePath: safePublicAbs(imageRel),
      prompt: buildStoryMotionPrompt(scenePrompt, {loop: false}),
      outputPath: videoAbs,
      model,
      duration: VIDEO_PARALLAX_PREVIEW_SEC,
      resolution,
      onPoll: ({attempt, maxAttempts, status}) => {
        console.log(`  OpenRouter ${status ?? "…"} (${attempt}/${maxAttempts})`);
      },
    });

    videoDurationMs = await probeVideoDurationMs(videoAbs);
    console.log(`Видео → public/${videoRel} (${(videoDurationMs / 1000).toFixed(1)} с)`);
  } else {
    try {
      await access(videoAbs);
      videoDurationMs = await probeVideoDurationMs(videoAbs);
      console.log(`Видео: кэш OK → public/${videoRel} (${(videoDurationMs / 1000).toFixed(1)} с)`);
    } catch {
      mode = "parallax-only";
      videoDurationMs = 0;
      console.log(`Нет public/${videoRel} — только parallax (${VIDEO_PARALLAX_EXTRA_SEC} с)`);
    }
  }

  const durationFrames =
    mode === "hybrid" ? defaultHybridDurationFrames() : defaultParallaxOnlyDurationFrames();
  const stem = slugifyProjectName(path.basename(imageRel, path.extname(imageRel)));
  const outputPath = path.join(outDir, `${stem}-video-parallax.mp4`);

  if (useRemote) {
    await renderVideoParallaxPreviewOnRemote({
      remoteUrl,
      imageRel,
      mode,
      videoDurationMs,
      durationFrames,
      outputPath,
      skipDepth: hasFlag("--skip-depth"),
      forceDepth: hasFlag("--force-depth"),
      name: stem,
      onLog: (message) => console.log(message),
    });
  } else {
    await renderVideoParallaxPreview({
      imageRel,
      mode,
      videoDurationMs,
      durationFrames,
      outputPath,
      skipDepth: hasFlag("--skip-depth"),
      forceDepth: hasFlag("--force-depth"),
      onStatus: (message) => console.log(message),
    });
  }

  console.log(`\nГотово: ${path.relative(ROOT, outputPath)}`);
  if (mode === "hybrid") {
    console.log(`  ${VIDEO_PARALLAX_PREVIEW_SEC} с — Veo-анимация`);
    console.log(`  далее ${VIDEO_PARALLAX_EXTRA_SEC} с — depth parallax`);
  } else {
    console.log(`  ${VIDEO_PARALLAX_EXTRA_SEC} с — depth parallax (без Veo)`);
  }
  console.log(`  (${durationFrames} кадров @ ${FPS} fps)`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
