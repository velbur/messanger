#!/usr/bin/env node
/**
 * Быстрый тест Ken Burns vs Depth parallax на одной картинке (без чата).
 *
 *   npm run test:parallax -- --image path/to.png
 *   npm run test:parallax -- --image path/to.png --force-depth
 */
import path from "node:path";
import {mkdir, copyFile, access, writeFile} from "node:fs/promises";
import {renderStill, renderMedia, selectComposition} from "@remotion/renderer";
import {storyMotionLoopFrames} from "../src/chat/story-motion.ts";
import {getBundleLocation} from "./bundle-cache.mjs";
import {generateStoryDepthAssets} from "./story-depth.mjs";
import {verifyParallaxOutput} from "./verify-parallax.mjs";
import {
  pollRemoteJobUntilDone,
  resolveRemoteRenderUrl,
} from "./remote-render-client.mjs";
import {pingRemoteWorker, uploadAssetToRemote} from "./remote-upload.mjs";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEST_SLUG = "parallax-test";
const IMAGE_REL = `images/${TEST_SLUG}/story-opening.png`;
const DEFAULT_OUT = path.join(ROOT, "out/parallax-test");

/**
 * Запечённый loop ходит по sin(2π·t): экстремумы смещения — на ¼ и ¾,
 * нейтраль — на 0 / mid / last. Снимаем кадры именно на этих позициях.
 */
const stillsForMode = (mode, frames) => {
  const clamp = (f) => Math.max(0, Math.min(frames - 1, f));
  if (mode === "kenburns") {
    return [
      {label: "neutral", frame: 0},
      {label: "peak", frame: clamp(Math.round(frames * 0.5))},
    ];
  }
  return [
    {label: "neutral", frame: 0},
    {label: "left", frame: clamp(Math.round(frames * 0.25))},
    {label: "mid", frame: clamp(Math.round(frames * 0.5))},
    {label: "right", frame: clamp(Math.round(frames * 0.75))},
    {label: "last", frame: frames - 1},
  ];
};
const MODES = ["kenburns", "depthParallax"];

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

const downloadRemoteAsset = async (remoteUrl, assetRel, localAbs) => {
  const ref = String(assetRel).replace(/^\/+/, "");
  const pathUnderImages = ref.startsWith("images/") ? ref.slice("images/".length) : ref;
  const url = `${remoteUrl.replace(/\/+$/, "")}/images/${pathUnderImages}`;
  const resp = await fetch(url);
  if (!resp.ok || !resp.body) {
    throw new Error(`Не удалось скачать ${ref} с воркера (${resp.status})`);
  }
  const {createWriteStream} = await import("node:fs");
  const {pipeline} = await import("node:stream/promises");
  const {Readable} = await import("node:stream");
  await mkdir(path.dirname(localAbs), {recursive: true});
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(localAbs));
};

const bakeParallaxOnRemote = async (remoteUrl, imageRel, {force = false} = {}) => {
  console.log(`Parallax bake: воркер (${remoteUrl})…`);
  await pingRemoteWorker(remoteUrl);

  const imageAbs = path.join(ROOT, "public", imageRel);
  const buffer = await import("node:fs/promises").then((fs) => fs.readFile(imageAbs));
  await uploadAssetToRemote(remoteUrl, imageRel, buffer);
  console.log(`Отправлено на воркер: ${imageRel}`);

  const resp = await fetch(`${remoteUrl}/api/parallax/bake-image`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({image: imageRel, force}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      data.error ??
        `Воркер не поддерживает /api/parallax/bake-image (${resp.status}) — git pull && ./run.sh worker-native`,
    );
  }

  console.log(`Задача на воркере: ${data.jobId}`);
  await pollRemoteJobUntilDone(remoteUrl, data.jobId, {
    onProgress: (job) => {
      const phase = job.phase?.trim();
      if (phase) {
        console.log(phase);
      }
      for (const line of job.logs?.slice(-3) ?? []) {
        if (line) {
          console.log(`  ${line}`);
        }
      }
    },
  });

  const paths = storyLayerPaths(imageRel);
  for (const rel of [paths.parallaxVideo, paths.depth]) {
    const localAbs = path.join(ROOT, "public", rel);
    await downloadRemoteAsset(remoteUrl, rel, localAbs);
    console.log(`Скачано с воркера → public/${rel}`);
  }

  const metaRel = paths.depth.replace(/\.depth\.png$/, ".depth-meta.json");
  try {
    await downloadRemoteAsset(remoteUrl, metaRel, path.join(ROOT, "public", metaRel));
  } catch {
    /* meta опционален для превью */
  }
};

const previewProps = (animation) => ({
  image: IMAGE_REL,
  animation,
  motionLoopSec: 3,
});

const run = async () => {
  const imageArg = parseArg("--image");
  if (!imageArg) {
    throw new Error("Укажи --image path/to.png");
  }

  const imageAbs = path.resolve(imageArg);
  await access(imageAbs);

  const outDir = path.resolve(parseArg("--out-dir") ?? DEFAULT_OUT);
  const imageDir = path.join(ROOT, "public/images", TEST_SLUG);
  const imageDest = path.join(imageDir, "story-opening.png");

  await mkdir(imageDir, {recursive: true});
  await mkdir(outDir, {recursive: true});
  await copyFile(imageAbs, imageDest);
  console.log(`Картинка → public/${IMAGE_REL}`);

  const remoteUrl = hasFlag("--local") ? null : resolveRemoteRenderUrl(parseRemoteUrl());
  const forceDepth = hasFlag("--force-depth");

  if (remoteUrl) {
    await bakeParallaxOnRemote(remoteUrl, IMAGE_REL, {force: forceDepth});
  } else {
    const depthResult = await generateStoryDepthAssets(IMAGE_REL, {force: forceDepth});
    console.log(
      depthResult.skipped
        ? `Parallax: кэш OK → ${IMAGE_REL}`
        : `Parallax: запечён loop (${depthResult.provider ?? "xenova"})`,
    );
    if (!remoteUrl && !hasFlag("--local") && !hasFlag("--remote")) {
      console.log("Подсказка: --remote http://192.168.0.137:3333  для bake на воркере (Depth-V2)");
    }
  }

  const bundleLocation = await getBundleLocation({
    onStatus: (message) => console.log(message),
  });

  const loopFrames = storyMotionLoopFrames(3);

  for (const mode of MODES) {
    const inputProps = previewProps(mode);
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "StoryParallaxPreview",
      inputProps,
    });

    const frames = Math.min(loopFrames, composition.durationInFrames);
    for (const {label, frame} of stillsForMode(mode, frames)) {
      const output = path.join(outDir, `still-${mode}-${label}.png`);
      console.log(`[${mode}] кадр ${frame} → ${path.relative(ROOT, output)}`);
      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output,
        inputProps,
        frame,
        imageFormat: "png",
      });
    }
  }

  const clipPath = path.join(outDir, "depthParallax-loop.mp4");
  const clipProps = previewProps("depthParallax");
  const clipComposition = await selectComposition({
    serveUrl: bundleLocation,
    id: "StoryParallaxPreview",
    inputProps: clipProps,
  });

  console.log(`[depthParallax] клип 0–${loopFrames - 1} → ${path.relative(ROOT, clipPath)}`);
  await renderMedia({
    composition: clipComposition,
    serveUrl: bundleLocation,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: clipPath,
    inputProps: clipProps,
    concurrency: 2,
    x264Preset: "veryfast",
  });

  const reportPath = path.join(outDir, "verify-report.json");
  const report = await verifyParallaxOutput({
    outDir,
    imageRel: IMAGE_REL,
    loopFrames,
  });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`\n${report.summary}`);
  console.log(`\nОтчёт: ${path.relative(ROOT, reportPath)}`);

  if (!report.pass) {
    console.log("\n⚠ Parallax не прошёл автопроверку — см. verify-report.json");
    console.log("  (при мягком parallax можно игнорировать или: --allow-fail)");
    if (!hasFlag("--allow-fail")) {
      process.exit(1);
    }
  }

  console.log(`\nГотово: ${path.relative(ROOT, outDir)}/`);
  console.log("  depthParallax-loop.mp4");
  console.log("  verify-report.json — метрики без ручного просмотра");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
