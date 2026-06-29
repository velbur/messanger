#!/usr/bin/env node
/**
 * Быстрый тест Ken Burns vs Depth parallax на одной картинке.
 * Не рендерит весь чат — только заставку opening (~3 с) + 3 кадра-сравнения.
 *
 *   npm run test:parallax -- --image path/to.png
 *   npm run test:parallax -- --image path/to.png --force-depth
 */
import path from "node:path";
import {mkdir, copyFile, access} from "node:fs/promises";
import {renderStill, renderMedia, selectComposition} from "@remotion/renderer";
import {parseConversation} from "../src/chat/schema.ts";
import {buildTimeline} from "../src/chat/timeline.ts";
import {storyMotionLoopFrames} from "../src/chat/story-motion.ts";
import {FPS} from "../src/chat/fps.ts";
import {getBundleLocation} from "./bundle-cache.mjs";
import {generateStoryDepthAssets} from "./story-depth.mjs";

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

const buildConversation = (animation) =>
  parseConversation({
    contactName: "Test",
    myName: "Я",
    wallpaper: "dark",
    locale: "ru",
    layout: "storyOverlay",
    hookText: "Parallax test",
    story: {
      opening: {
        image: IMAGE_REL,
        durationMs: 3500,
        animation,
      },
      motionLoopSec: 3,
      disableMessageFullscreen: true,
    },
    intro: {enabled: false},
    endCard: {enabled: false},
    outro: {enabled: false},
    music: {enabled: false},
    voiceover: {enabled: false},
    previewCover: {enabled: false},
    messages: [{author: "them", text: "…", sentAt: "12:00"}],
  });

const openingPeakFrame = (conversation) => {
  const timeline = buildTimeline(conversation);
  const loopFrames = storyMotionLoopFrames(conversation.story?.motionLoopSec ?? 3);
  const start = timeline.story.openingStartFrame;
  return {start, loopFrames, timeline};
};

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
      ? `Depth: кэш OK → ${IMAGE_REL}.depth.png`
      : `Depth: пересчитано (${depthResult.provider ?? "xenova"}) → ${IMAGE_REL}.depth.png`,
  );

  const bundleLocation = await getBundleLocation({
    onStatus: (message) => console.log(message),
  });

  for (const mode of MODES) {
    const conversation = buildConversation(mode);
    const {start, loopFrames} = openingPeakFrame(conversation);

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ChatVideo",
      inputProps: {conversation},
    });

    for (const {label, ratio} of STILL_LABELS) {
      const offset = Math.round(loopFrames * ratio);
      const frame = Math.min(start + offset, composition.durationInFrames - 1);
      const output = path.join(outDir, `still-${mode}-${label}.png`);
      console.log(`[${mode}] кадр ${frame} → ${path.relative(ROOT, output)}`);
      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output,
        inputProps: {conversation},
        frame,
        imageFormat: "png",
      });
    }
  }

  const parallaxConversation = buildConversation("depthParallax");
  const {start, loopFrames} = openingPeakFrame(parallaxConversation);
  const clipEnd = Math.min(start + loopFrames - 1, start + FPS * 3 - 1);

  const clipComposition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ChatVideo",
    inputProps: {conversation: parallaxConversation},
  });

  const clipPath = path.join(outDir, "depthParallax-loop.mp4");
  console.log(`[depthParallax] клип кадры ${start}–${clipEnd} → ${path.relative(ROOT, clipPath)}`);
  await renderMedia({
    composition: clipComposition,
    serveUrl: bundleLocation,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: clipPath,
    inputProps: {conversation: parallaxConversation},
    frameRange: [start, clipEnd],
    concurrency: 2,
    x264Preset: "veryfast",
  });

  console.log(`\nГотово: ${path.relative(ROOT, outDir)}/`);
  console.log("  still-kenburns-*.png  vs  still-depthParallax-*.png");
  console.log("  depthParallax-loop.mp4 — 3 с анимации");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
