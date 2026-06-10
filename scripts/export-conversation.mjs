#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {parseDialogueMarkdown} from "./dialogue-markdown-parser.mjs";
import {SERIES_DIR} from "./project-paths.mjs";

function extractImagePrompt(text) {
  return text.replace(/^\[Фото:\s*/i, "").replace(/\]\s*$/, "").trim();
}

function toJsonMessage(item) {
  const message = {
    author: item.side === "me" ? "me" : "them",
  };

  if (item.sentAt) {
    message.sentAt = item.sentAt;
  }

  if (item.isImage) {
    message.imagePrompt = extractImagePrompt(item.text);
    return message;
  }

  message.text = item.text;
  return message;
}

export function dialogueMarkdownToConversation(markdown, options = {}) {
  const parsed = parseDialogueMarkdown(markdown);

  return {
    contactName: options.contactName || "Даня",
    contactStatus: options.contactStatus || "в сети",
    myName: options.myName || "Алиса",
    wallpaper: options.wallpaper || "default",
    messages: parsed.items.filter((item) => item.type === "message").map(toJsonMessage),
  };
}

async function main() {
  const inputPath = process.argv[2] || path.join(SERIES_DIR, "usssr/part-1/dialogue.md");
  const outputPath = process.argv[3] || path.join(SERIES_DIR, "usssr/part-1/conversation.json");

  const markdown = await fs.readFile(inputPath, "utf8");
  const conversation = dialogueMarkdownToConversation(markdown);

  await fs.writeFile(outputPath, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");

  console.log(`Exported ${conversation.messages.length} messages`);
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
