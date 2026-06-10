import fs from "node:fs/promises";
import {
  buildImageGenerationPrompt,
  resolveFramePrompts,
} from "./image-prompt-llm.mjs";
import {readStylePrompt} from "./image-prompt.mjs";
import {generateImageBuffer, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {saveImageBuffer} from "./image-assets.mjs";

const hasRenderableImage = (message) => Boolean(message.image?.trim());
const hasImagePromptOnly = (message) =>
  Boolean(message.imagePrompt?.trim()) && !hasRenderableImage(message);

export const generateMissingConversationImages = async (conversation, {stylePrompt} = {}) => {
  const logs = [];
  if (!isOpenRouterConfigured()) {
    return logs;
  }

  const style =
    typeof stylePrompt === "string" && stylePrompt.trim()
      ? stylePrompt.trim()
      : await readStylePrompt();

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex];
    if (!hasImagePromptOnly(message)) {
      continue;
    }

    const resolved = await resolveFramePrompts({
      conversation,
      messageIndex,
      stylePrompt: style,
    });

    const finalPrompt = buildImageGenerationPrompt({
      imagePrompt: resolved.imagePrompt,
      stylePrompt: style,
    });

    if (!finalPrompt) {
      logs.push(`Сообщение #${messageIndex + 1}: не удалось собрать промпт сцены`);
      continue;
    }

    const referenceDataUrl = resolved.imageReferences?.primaryReference?.dataUrl ?? null;
    const {buffer} = await generateImageBuffer({
      prompt: finalPrompt,
      referenceDataUrl,
      aspectRatio: CHAT_IMAGE_ASPECT_RATIO,
    });

    const targetRef = `images/msg-${messageIndex + 1}.png`;
    const publicPath = await saveImageBuffer(buffer, targetRef);
    message.image = publicPath;
    if (resolved.imagePrompt) {
      message.imagePrompt = resolved.imagePrompt;
    }

    logs.push(
      `Сгенерировано: сообщение #${messageIndex + 1} → ${publicPath} (${resolved.promptSource})`,
    );
  }

  return logs;
};

export const generateAndSaveConversationImages = async (conversationPath, {stylePrompt} = {}) => {
  const raw = await fs.readFile(conversationPath, "utf8");
  const conversation = JSON.parse(raw);
  const logs = await generateMissingConversationImages(conversation, {stylePrompt});
  await fs.writeFile(conversationPath, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");
  return {conversation, logs};
};
