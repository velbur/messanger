#!/usr/bin/env node
/**
 * Удалить Veo-клипы и hold/parallax для story-кадров переписки.
 * После этого веб-рендер заново сгенерирует .video.mp4 (OpenRouter) и запечёт parallax на воркере.
 *
 *   npm run story-video:clear -- json/on-ostavil-mne-podarok-iz-sna.json
 *   npm run story-video:clear -- on-ostavil-mne-podarok-iz-sna
 */
import {readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {parseConversation} from "../src/chat/schema.ts";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {storyVideoPathForImage} from "../src/chat/story-video-paths.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const arg = process.argv[2];
if (!arg) {
  console.error("Укажите JSON: npm run story-video:clear -- json/foo.json");
  process.exit(1);
}

const jsonRel = arg.endsWith(".json") ? arg : `json/${arg}.json`;
const jsonAbs = path.join(ROOT, jsonRel);
const raw = await readFile(jsonAbs, "utf8");
const conversation = parseConversation(JSON.parse(raw));

if (!isStoryVisualLayout(conversation)) {
  console.error("Не story-переписка (нужен layout storyOverlay / storySplit)");
  process.exit(1);
}

const refs = new Set();
const clearHolder = (holder) => {
  if (!holder) {
    return;
  }
  delete holder.storyVideo;
  delete holder.storyVideoDurationMs;
  delete holder.storyVideoProfile;
  delete holder.storyVideoLoop;
};

const addVideoBundle = (imageRef, holder) => {
  const image = String(imageRef ?? "").trim().replace(/^\/+/, "");
  if (!image) {
    return;
  }
  const video = String(holder?.storyVideo ?? "").trim() || storyVideoPathForImage(image);
  const base = video.replace(/\.video\.mp4$/i, "");
  refs.add(video);
  refs.add(`${base}.video-hold.png`);
  refs.add(`${base}.video-hold.depth.png`);
  refs.add(`${base}.video-hold.parallax.mp4`);
  refs.add(`${base}.video-hold.depth-meta.json`);
  refs.add(`${base}.video.seamless.mp4`);
  refs.add(`${base}.video.loop.mp4`);
};

clearHolder(conversation.story?.opening);
addVideoBundle(conversation.story?.opening?.image, conversation.story?.opening);

for (const message of conversation.messages ?? []) {
  if (!message?.storyImage?.trim()) {
    continue;
  }
  clearHolder(message);
  addVideoBundle(message.storyImage, message);
}

let removed = 0;
for (const ref of refs) {
  const abs = path.join(PUBLIC_DIR, ref);
  try {
    await rm(abs, {force: true});
    removed += 1;
    console.log(`удалено: ${ref}`);
  } catch {
    /* skip */
  }
}

await writeFile(jsonAbs, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");
console.log(`JSON обновлён (storyVideo снят): ${jsonRel}`);
console.log(`Готово: ${removed} файлов. Дальше — рендер через UI (Veo + parallax на воркере).`);
