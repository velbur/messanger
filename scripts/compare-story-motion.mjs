import path from "node:path";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {parseConversation} from "../src/chat/schema.ts";
import {mergeStoryConfig, needsStoryDepthLayers, shouldGenerateStoryVideos} from "../src/chat/story.ts";
import {isStoryVisualLayout, resolveConversationImages} from "./image-assets.mjs";
import {ensureStoryDepthForConversation} from "./story-depth.mjs";
import {generateMissingStoryVideos, resolveStoryVideos} from "./story-video.mjs";
import {stripStorySfxFromConversation} from "./story-sfx.mjs";
import {normalizeStoryVideoLoopFlags} from "../src/chat/story-video-mode.ts";
import {loadOpenRouterEnv, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {renderChatVideo, getRenderConcurrency} from "./render-core.mjs";
import {resolveRemoteRenderUrl, renderChatVideoOnRemote} from "./remote-render-client.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MODES = ["kenburns", "parallax", "depthParallax", "video"];

const parseArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
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

const inputRel = parseArg("--input", "json/story-split-demo.json");
const outDirRel = parseArg("--out-dir", "out/motion-compare");
const withVeo = hasFlag("--with-veo");
const forceLocal = hasFlag("--local");

const run = async () => {
  const inputAbs = path.join(ROOT, inputRel);
  const outDir = path.join(ROOT, outDirRel);
  await mkdir(outDir, {recursive: true});

  const baseRaw = await readFile(inputAbs, "utf8");
  const baseParsed = JSON.parse(baseRaw);
  if (!isStoryVisualLayout(baseParsed)) {
    throw new Error("Нужен JSON с layout storySplit или storyOverlay");
  }

  await loadOpenRouterEnv();
  const remoteUrl = forceLocal ? null : resolveRemoteRenderUrl(parseRemoteUrl());
  const useRemote = Boolean(remoteUrl);
  const concurrency = getRenderConcurrency();
  const modes = withVeo ? MODES : MODES.filter((mode) => mode !== "video");

  console.log(`Сравнение анимаций: ${modes.join(", ")}`);
  console.log(`Вход: ${inputRel} → ${outDirRel}/`);
  console.log(useRemote ? `Рендер: воркер (${remoteUrl})` : "Рендер: локально (Mac)");
  if (!useRemote && !forceLocal && !hasFlag("--remote")) {
    console.log("Подсказка: REMOTE_RENDER_URL=… npm run compare:motion  или  --remote URL");
  }

  for (const mode of modes) {
    const conversation = parseConversation(structuredClone(baseParsed));
    if (!conversation.story) {
      conversation.story = {};
    }
    if (!conversation.story.opening) {
      conversation.story.opening = {};
    }
    conversation.story.opening.animation = mode;
    conversation.story.motionLoopSec = 3;
    conversation.voiceover = {enabled: false, provider: "openrouter"};
    conversation.music = {enabled: false};
    conversation.intro = {enabled: false};
    conversation.endCard = {enabled: false};
    conversation.outro = {enabled: false};
    conversation.previewCover = {enabled: false};

    stripStorySfxFromConversation(conversation);
    normalizeStoryVideoLoopFlags(conversation);

    if (!useRemote && needsStoryDepthLayers(conversation)) {
      const depthLogs = await ensureStoryDepthForConversation(conversation);
      for (const line of depthLogs) {
        console.log(`[${mode}] ${line}`);
      }
    }

    if (mode === "video" && isOpenRouterConfigured()) {
      console.log(`[${mode}] Генерация Veo (платно)…`);
      await generateMissingStoryVideos(conversation, {
        publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim(),
      });
    }

    if (shouldGenerateStoryVideos(conversation)) {
      await resolveStoryVideos(conversation, {failOnMissingVideos: mode === "video"});
    }

    await resolveConversationImages(conversation, {failOnMissingImages: true});

    const jsonPath = path.join(outDir, `compare-${mode}.json`);
    await writeFile(jsonPath, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");

    const outputPath = path.join(outDir, `compare-${mode}.mp4`);
    const renderName = `compare-${mode}`;
    console.log(`[${mode}] Рендер → ${path.relative(ROOT, outputPath)}`);
    if (useRemote) {
      await renderChatVideoOnRemote({
        remoteUrl,
        conversation,
        fileName: renderName,
        outputPath,
        onLog: (message) => console.log(`[${mode}] ${message}`),
      });
    } else {
      await renderChatVideo({
        conversation,
        outputPath,
        concurrency,
        onBundleStatus: (message) => console.log(`[${mode}] ${message}`),
      });
    }
    console.log(`[${mode}] Готово`);
  }

  console.log(`\nВсе варианты в ${outDirRel}/`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
