import path from "node:path";
import {readFile} from "node:fs/promises";
import {parseConversation} from "../src/chat/schema.ts";
import {resolveConversationImages, isStoryVisualLayout} from "./image-assets.mjs";
import {assertVoiceoverReadyForRender, resolveConversationVoiceover} from "./voice-assets.mjs";
import {generateMissingStoryVideos, resolveStoryVideos} from "./story-video.mjs";
import {assignStorySfxIfNeeded, resolveStorySfxFiles} from "./story-sfx.mjs";
import {assignStoryMusicIfNeeded} from "./story-music.mjs";
import {loadOpenRouterEnv, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {renderChatVideo, getRenderConcurrency} from "./render-core.mjs";

const parseArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
};

const inputPath = parseArg("--input", "public/conversation.json");
const outputPath = parseArg("--output", "out/video.mp4");
const concurrencyArg = parseArg("--concurrency", null);

const run = async () => {
  const inputAbs = path.resolve(inputPath);
  const rawInput = await readFile(inputAbs, "utf8");
  await loadOpenRouterEnv();
  const conversation = parseConversation(JSON.parse(rawInput));
  await resolveConversationImages(conversation, {failOnMissingImages: true});
  if (isStoryVisualLayout(conversation)) {
    if (isOpenRouterConfigured()) {
      await generateMissingStoryVideos(conversation, {
        publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim(),
      });
    }
    await resolveStoryVideos(conversation, {failOnMissingVideos: true});
    await assignStorySfxIfNeeded(conversation, {force: true});
    await resolveStorySfxFiles(conversation, {failOnMissing: true});
    await assignStoryMusicIfNeeded(conversation, {musicId: "auto"});
  }
  assertVoiceoverReadyForRender(conversation);
  await resolveConversationVoiceover(conversation, {failOnMissingVoice: true});

  const concurrency =
    concurrencyArg !== null ? Number.parseInt(String(concurrencyArg), 10) : getRenderConcurrency();
  console.log(`Render concurrency: ${concurrency}`);

  const outputAbs = await renderChatVideo({
    conversation,
    outputPath,
    concurrency,
    onBundleStatus: (message) => console.log(message),
  });
  console.log(`Rendered: ${outputAbs}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
