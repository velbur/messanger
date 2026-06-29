import path from "node:path";
import {readFile} from "node:fs/promises";
import {parseConversation} from "../src/chat/schema.ts";
import {mergeStoryConfig, shouldGenerateStoryVideos} from "../src/chat/story.ts";
import {resolveConversationImages, isStoryVisualLayout} from "./image-assets.mjs";
import {assertVoiceoverReadyForRender, resolveConversationVoiceover} from "./voice-assets.mjs";
import {generateMissingStoryVideos, resolveStoryVideos} from "./story-video.mjs";
import {ensureStoryDepthForConversation} from "./story-depth.mjs";
import {stripStorySfxFromConversation} from "./story-sfx.mjs";
import {normalizeStoryVideoLoopFlags} from "../src/chat/story-video-mode.ts";
import {assignStoryMusicIfNeeded} from "./story-music.mjs";
import {loadOpenRouterEnv, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {renderChatVideo, getRenderConcurrency} from "./render-core.mjs";
import {ensureConversationPreviewCovers} from "./preview-cover-assets.mjs";

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
    stripStorySfxFromConversation(conversation);
    normalizeStoryVideoLoopFlags(conversation);
    if (mergeStoryConfig(conversation).opening.animation === "depthParallax") {
      const depthLogs = await ensureStoryDepthForConversation(conversation);
      for (const line of depthLogs) {
        console.log(line);
      }
    }
    if (isOpenRouterConfigured() && shouldGenerateStoryVideos(conversation)) {
      await generateMissingStoryVideos(conversation, {
        publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim(),
      });
    }
    await resolveStoryVideos(conversation, {
      failOnMissingVideos: shouldGenerateStoryVideos(conversation),
    });
    await assignStoryMusicIfNeeded(conversation, {musicId: "auto"});
  }
  assertVoiceoverReadyForRender(conversation);
  await resolveConversationVoiceover(conversation, {failOnMissingVoice: true});

  const imageNamespace = path.basename(inputAbs, ".json");
  const coverResult = await ensureConversationPreviewCovers(conversation, {
    displayTitle: conversation.previewCover?.title ?? conversation.hookText,
    imageNamespace,
    onLog: (message) => console.log(message),
  });
  const episodes = coverResult.episodeConversations;

  const concurrency =
    concurrencyArg !== null ? Number.parseInt(String(concurrencyArg), 10) : getRenderConcurrency();
  console.log(`Render concurrency: ${concurrency}`);

  for (let i = 0; i < episodes.length; i += 1) {
    const ep = episodes[i];
    const epOut =
      episodes.length > 1
        ? outputPath.replace(/\.mp4$/i, `-ep${String(i + 1).padStart(2, "0")}.mp4`)
        : outputPath;
    const outputAbs = await renderChatVideo({
      conversation: ep,
      outputPath: epOut,
      concurrency,
      onBundleStatus: (message) => console.log(message),
    });
    console.log(`Rendered: ${outputAbs}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
