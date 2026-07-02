#!/usr/bin/env node
/**
 * Полная перегенерация story-кадров: очистка → (опц.) новые промпты → PNG через OpenRouter.
 *
 *   npm run story-frames:regenerate -- on-ostavil-mne-podarok-iz-sna
 *   npm run story-frames:regenerate -- on-ostavil... --new-prompts
 *   npm run story-frames:regenerate -- on-ostavil... --clear-only
 */
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {parseConversation} from "../src/chat/schema.ts";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {generateMissingStoryImages} from "./conversation-images.mjs";
import {enrichStoryVisualDialogue} from "./story-enrich.mjs";
import {loadOpenRouterEnv, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {readStoryStylePrompt} from "./image-prompt.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
const newPrompts = args.includes("--new-prompts");
const clearOnly = args.includes("--clear-only");
const jsonArg = args.find((a) => !a.startsWith("--"));

if (!jsonArg) {
  console.error(
    "Укажите JSON: npm run story-frames:regenerate -- on-ostavil-mne-podarok-iz-sna [--new-prompts]",
  );
  process.exit(1);
}

const jsonRel = jsonArg.endsWith(".json") ? jsonArg : `json/${jsonArg}.json`;
const jsonAbs = path.join(ROOT, jsonRel);
const imageNamespace = path.basename(jsonAbs, ".json");

const {spawnSync} = await import("node:child_process");
const clearArgs = ["--import", "tsx", path.join(ROOT, "scripts/clear-story-frames.mjs"), jsonRel];
if (newPrompts) {
  clearArgs.push("--prompts");
}
const clearResult = spawnSync(process.execPath, clearArgs, {stdio: "inherit", cwd: ROOT});
if (clearResult.status !== 0) {
  process.exit(clearResult.status ?? 1);
}

if (clearOnly) {
  process.exit(0);
}

await loadOpenRouterEnv();
if (!isOpenRouterConfigured()) {
  console.error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  process.exit(1);
}

const raw = await readFile(jsonAbs, "utf8");
let conversation = parseConversation(JSON.parse(raw));

if (!isStoryVisualLayout(conversation)) {
  console.error("Не story-переписка");
  process.exit(1);
}

const stylePrompt = await readStoryStylePrompt();

if (newPrompts) {
  console.log("==> Новые промпты (Gemini)…");
  const enriched = await enrichStoryVisualDialogue(conversation, {stylePrompt, forcePrompts: true});
  conversation = enriched.conversation;
  console.log(`Промптов: ${enriched.sceneCount ?? 0}`);
}

console.log("==> Генерация PNG (OpenRouter)…");
const logs = await generateMissingStoryImages(conversation, {stylePrompt, imageNamespace});
for (const line of logs) {
  console.log(line);
}
if (logs.length === 0) {
  console.log("Нечего генерировать — проверьте storyImagePrompt в JSON или добавьте --new-prompts");
}

await writeFile(jsonAbs, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");
console.log(`Готово: ${jsonRel}`);
console.log("Дальше: рендер в UI (Veo + parallax на воркере). На воркере: npm run render:clean");
