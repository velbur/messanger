import path from "node:path";
import {mkdir, readFile} from "node:fs/promises";
import {renderStill, selectComposition} from "@remotion/renderer";
import {parseConversation} from "../src/chat/schema.ts";
import {buildTimeline} from "../src/chat/timeline.ts";
import {storyMotionLoopFrames} from "../src/chat/story-motion.ts";
import {getBundleLocation} from "./bundle-cache.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MODES = ["kenburns", "depthParallax"];
const INPUT = path.join(ROOT, "json/story-split-demo.json");
const OUT_DIR = path.join(ROOT, "out/motion-compare");

const run = async () => {
  const base = JSON.parse(await readFile(INPUT, "utf8"));
  base.voiceover = {enabled: false, provider: "openrouter"};
  base.music = {enabled: false};
  base.intro = {enabled: false};
  base.endCard = {enabled: false};
  base.outro = {enabled: false};

  await mkdir(OUT_DIR, {recursive: true});
  const bundleLocation = await getBundleLocation({
    onStatus: (message) => console.log(message),
  });

  for (const mode of MODES) {
    const conversation = parseConversation({
      ...base,
      story: {
        ...base.story,
        opening: {...base.story?.opening, animation: mode},
        motionLoopSec: 3,
      },
    });

    const timeline = buildTimeline(conversation);
    const scene = timeline.story.sceneEvents.find((event) => event.messageIndex === 2);
    if (!scene) {
      throw new Error("Не найдена сцена story-msg-3 в таймлайне");
    }

    const loopFrames = storyMotionLoopFrames(3);
    const peakOffset = Math.round(loopFrames * 0.5);
    const frame = scene.startFrame + peakOffset + 30;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ChatVideo",
      inputProps: {conversation},
    });

    const output = path.join(OUT_DIR, `still-${mode}-msg3-peak.png`);
    console.log(`[${mode}] still frame ${frame} → ${path.relative(ROOT, output)}`);

    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output,
      inputProps: {conversation},
      frame: Math.min(frame, composition.durationInFrames - 1),
      imageFormat: "png",
    });
  }

  console.log(`\nКадры: ${path.relative(ROOT, OUT_DIR)}/still-*.png`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
