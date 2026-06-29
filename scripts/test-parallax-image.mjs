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

const ROOT = path.resolve(import.meta.dirname, "..");
const TEST_SLUG = "parallax-test";
const IMAGE_REL = `images/${TEST_SLUG}/story-opening.png`;
const DEFAULT_OUT = path.join(ROOT, "out/parallax-test");
const MODES = ["kenburns", "depthParallax"];
const STILL_LABELS = [
  {label: "t0", ratio: 0},
  {label: "mid", ratio: 0.5},
  {label: "peak", ratio: 1},
];

const parseArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const hasFlag = (name) => process.argv.includes(name);

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

  const depthResult = await generateStoryDepthAssets(IMAGE_REL, {force: hasFlag("--force-depth")});
  console.log(
    depthResult.skipped
      ? `Depth: кэш OK → ${IMAGE_REL}`
      : `Depth: пересчитано (${depthResult.provider ?? "xenova"}) → слои v13`,
  );

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

    for (const {label, ratio} of STILL_LABELS) {
      const frame = Math.min(Math.round(loopFrames * ratio), composition.durationInFrames - 1);
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
