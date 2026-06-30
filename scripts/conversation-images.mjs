import fs from "node:fs/promises";
import path from "node:path";
import {
  buildImageGenerationPrompt,
  buildStoryImageGenerationPrompt,
  resolveFramePrompts,
  resolveStoryFramePrompts,
} from "./image-prompt-llm.mjs";
import {readStylePrompt, readStoryStylePrompt} from "./image-prompt.mjs";
import {generateImageBuffer, getOpenRouterStoryImageModel, getOpenRouterStoryImageSize, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {saveImageBuffer} from "./image-assets.mjs";
import {slugifyProjectName} from "./project-slug.mjs";

const hasRenderableImage = (message) => Boolean(message.image?.trim());
const hasImagePromptOnly = (message) =>
  Boolean(message.imagePrompt?.trim()) && !hasRenderableImage(message);

const hasRenderableStoryImage = (message) => Boolean(message.storyImage?.trim());
const hasStoryImagePromptOnly = (message) =>
  Boolean(message.storyImagePrompt?.trim()) && !hasRenderableStoryImage(message);

const defaultImageNamespace = () => `short-${Date.now().toString(36)}`;

const normalizeImageNamespace = (value) => {
  const slug = slugifyProjectName(String(value ?? "").trim() || defaultImageNamespace());
  return slug === "render" ? defaultImageNamespace() : slug;
};

const isStoryVisual = (conversation) =>
  conversation?.layout === "storySplit" || conversation?.layout === "storyOverlay";

const ensureStoryObject = (conversation) => {
  if (!conversation.story) {
    conversation.story = {};
  }
  if (!conversation.story.opening) {
    conversation.story.opening = {};
  }
  return conversation.story;
};

export const generateMissingStoryImages = async (conversation, {stylePrompt, imageNamespace} = {}) => {
  const logs = [];
  if (!isOpenRouterConfigured() || !isStoryVisual(conversation)) {
    return logs;
  }

  const style =
    typeof stylePrompt === "string" && stylePrompt.trim()
      ? stylePrompt.trim()
      : await readStoryStylePrompt();
  const namespace = normalizeImageNamespace(imageNamespace);
  const story = ensureStoryObject(conversation);
  const opening = story.opening;

  const openingPrompt = String(opening?.imagePrompt ?? "").trim();
  const openingImage = String(opening?.image ?? "").trim();
  if (openingPrompt && !openingImage) {
    const resolved = await resolveStoryFramePrompts({
      conversation,
      stylePrompt: style,
      kind: "opening",
    });
    const finalPrompt = buildStoryImageGenerationPrompt({
      imagePrompt: resolved.imagePrompt,
      stylePrompt: style,
    });
    if (finalPrompt) {
      const {buffer} = await generateImageBuffer({
        prompt: finalPrompt,
        aspectRatio: STORY_IMAGE_ASPECT_RATIO,
        model: getOpenRouterStoryImageModel(),
        imageSize: getOpenRouterStoryImageSize(),
      });
      const targetRef = `images/${namespace}/story-opening.png`;
      const publicPath = await saveImageBuffer(buffer, targetRef);
      opening.image = publicPath;
      if (resolved.imagePrompt) {
        opening.imagePrompt = resolved.imagePrompt;
      }
      logs.push(`Сгенерирован story opening → ${publicPath} (${resolved.promptSource})`);
    }
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex];
    if (!hasStoryImagePromptOnly(message)) {
      continue;
    }

    const resolved = await resolveStoryFramePrompts({
      conversation,
      messageIndex,
      stylePrompt: style,
      kind: "message",
    });
    const finalPrompt = buildStoryImageGenerationPrompt({
      imagePrompt: resolved.imagePrompt,
      stylePrompt: style,
    });
    if (!finalPrompt) {
      logs.push(`Сообщение #${messageIndex + 1}: не удалось собрать story-промпт`);
      continue;
    }

    const {buffer} = await generateImageBuffer({
      prompt: finalPrompt,
      aspectRatio: STORY_IMAGE_ASPECT_RATIO,
      model: getOpenRouterStoryImageModel(),
      imageSize: getOpenRouterStoryImageSize(),
    });

    const targetRef = `images/${namespace}/story-msg-${messageIndex + 1}.png`;
    const publicPath = await saveImageBuffer(buffer, targetRef);
    message.storyImage = publicPath;
    if (resolved.imagePrompt) {
      message.storyImagePrompt = resolved.imagePrompt;
    }

    logs.push(
      `Сгенерирован story-кадр: сообщение #${messageIndex + 1} → ${publicPath} (${resolved.promptSource})`,
    );
  }

  return logs;
};

export const generateMissingConversationImages = async (
  conversation,
  {stylePrompt, storyStylePrompt, imageNamespace} = {},
) => {
  const logs = [];
  if (!isOpenRouterConfigured()) {
    return logs;
  }

  const style =
    typeof stylePrompt === "string" && stylePrompt.trim()
      ? stylePrompt.trim()
      : await readStylePrompt();
  const storyStyle =
    typeof storyStylePrompt === "string" && storyStylePrompt.trim()
      ? storyStylePrompt.trim()
      : await readStoryStylePrompt();

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const namespace = normalizeImageNamespace(imageNamespace);
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

    const targetRef = `images/${namespace}/msg-${messageIndex + 1}.png`;
    const publicPath = await saveImageBuffer(buffer, targetRef);
    message.image = publicPath;
    if (resolved.imagePrompt) {
      message.imagePrompt = resolved.imagePrompt;
    }

    logs.push(
      `Сгенерировано: сообщение #${messageIndex + 1} → ${publicPath} (${resolved.promptSource})`,
    );
  }

  const storyLogs = await generateMissingStoryImages(conversation, {
    stylePrompt: storyStylePrompt,
    imageNamespace: namespace,
  });
  logs.push(...storyLogs);

  return logs;
};

export const generateAndSaveConversationImages = async (conversationPath, {stylePrompt} = {}) => {
  const raw = await fs.readFile(conversationPath, "utf8");
  const conversation = JSON.parse(raw);
  const imageNamespace = path.basename(conversationPath, path.extname(conversationPath));
  const logs = await generateMissingConversationImages(conversation, {stylePrompt, imageNamespace});
  await fs.writeFile(conversationPath, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");
  return {conversation, logs};
};
