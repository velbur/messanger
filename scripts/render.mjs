import path from "node:path";
import {readFile} from "node:fs/promises";
import {parseConversation} from "../src/chat/schema.ts";
import {resolveConversationImages} from "./image-assets.mjs";
import {loadOpenRouterEnv} from "./openrouter-client.mjs";
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
