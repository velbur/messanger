#!/usr/bin/env node
/**
 * Удалить все story-PNG и связанные ассеты (Veo, parallax, depth).
 * По умолчанию промпты (storyImagePrompt) сохраняются — можно сразу «Сгенерировать изображения» в UI.
 *
 *   npm run story-frames:clear -- on-ostavil-mne-podarok-iz-sna
 *   npm run story-frames:clear -- json/foo.json --prompts   # сбросить и промпты
 */
import {readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {parseConversation} from "../src/chat/schema.ts";
import {collectStoryImageAssetRefs, isStoryVisualLayout} from "./image-assets.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const args = process.argv.slice(2);
const clearPrompts = args.includes("--prompts");
const jsonArg = args.find((a) => !a.startsWith("--"));

if (!jsonArg) {
  console.error("Укажите JSON: npm run story-frames:clear -- on-ostavil-mne-podarok-iz-sna [--prompts]");
  process.exit(1);
}

const jsonRel = jsonArg.endsWith(".json") ? jsonArg : `json/${jsonArg}.json`;
const jsonAbs = path.join(ROOT, jsonRel);
const raw = await readFile(jsonAbs, "utf8");
const conversation = parseConversation(JSON.parse(raw));

if (!isStoryVisualLayout(conversation)) {
  console.error("Не story-переписка (нужен layout storyOverlay / storySplit)");
  process.exit(1);
}

const refs = new Set();

const clearOpening = (opening, {includePrompts}) => {
  if (!opening) {
    return;
  }
  delete opening.storyVideo;
  delete opening.storyVideoDurationMs;
  delete opening.storyVideoProfile;
  delete opening.storyVideoLoop;
  delete opening.image;
  if (includePrompts) {
    delete opening.imagePrompt;
  }
};

const clearMessageStory = (message, {includePrompts}) => {
  if (!message) {
    return;
  }
  delete message.storyVideo;
  delete message.storyVideoDurationMs;
  delete message.storyVideoProfile;
  delete message.storyVideoLoop;
  delete message.storyImage;
  if (includePrompts) {
    delete message.storyImagePrompt;
  }
};

const addImageBundle = (imageRef) => {
  const image = String(imageRef ?? "").trim().replace(/^\/+/, "");
  if (!image) {
    return;
  }
  for (const ref of collectStoryImageAssetRefs(image)) {
    refs.add(ref);
  }
};

const opening = conversation.story?.opening;
if (opening?.image?.trim()) {
  addImageBundle(opening.image);
}
clearOpening(opening, {includePrompts: clearPrompts});

for (const message of conversation.messages ?? []) {
  const imageRef = message?.storyImage?.trim();
  if (imageRef) {
    addImageBundle(imageRef);
  }
  clearMessageStory(message, {includePrompts: clearPrompts});
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
console.log(`JSON обновлён: ${jsonRel}`);
if (clearPrompts) {
  console.log("Промпты сброшены. Дальше: UI → «Сгенерировать промпты изображений» → «Сгенерировать изображения».");
} else {
  console.log("Промпты сохранены. Дальше: UI → «Сгенерировать изображения» (или npm run story-frames:generate).");
}
console.log(`Удалено файлов: ${removed}. Затем рендер — Veo и parallax создадутся заново.`);
