import fs from "node:fs/promises";
import path from "node:path";
import {
  buildImageGenerationPrompt,
  buildStoryImageGenerationPrompt,
  pickStoryStyleAnchorReference,
  resolveFramePrompts,
  resolveStoryFramePrompts,
  resolveStoryScenePrompts,
} from "./image-prompt-llm.mjs";
import {readStylePrompt, readStoryStylePrompt} from "./image-prompt.mjs";
import {generateImageBuffer, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {
  generateStoryImageBuffer,
  getStoryImageGenerationStatus,
  getStoryImageProvider,
  isStoryImageGenerationConfigured,
} from "./story-image-provider.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {saveImageBuffer} from "./image-assets.mjs";
import {ensureStoryVisualBible, formatVisualBible} from "./story-visual-bible.mjs";
import {slugifyProjectName} from "./project-slug.mjs";
import {getStoryScenes} from "./story-scene-timing.mjs";
import {syncScenesToMessageAnchors} from "./story-scene-sync.mjs";
import {ensureLocalGpuModel} from "./local-gpu-models.mjs";

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

const renderStoryFrameBuffer = async ({
  conversation,
  resolved,
  style,
  imageProvider,
  useStyleAnchor = true,
}) => {
  const styleAnchor = useStyleAnchor
    ? pickStoryStyleAnchorReference(resolved.imageReferences)
    : {dataUrl: null, kind: null};

  const finalPrompt = buildStoryImageGenerationPrompt({
    imagePrompt: resolved.imagePrompt,
    stylePrompt: style,
    visualBible: formatVisualBible(conversation),
    conversation,
    charactersInFrame: resolved.charactersInFrame,
    provider: imageProvider,
    hasStyleReference: Boolean(styleAnchor.dataUrl),
  });
  if (!finalPrompt) {
    return null;
  }

  const {buffer} = await generateStoryImageBuffer({
    prompt: finalPrompt,
    aspectRatio: STORY_IMAGE_ASPECT_RATIO,
    kind: "story",
    referenceDataUrl: styleAnchor.dataUrl,
    referenceKind: styleAnchor.kind,
  });
  return buffer;
};

const hasStoryScenePromptOnly = (scene) =>
  Boolean(scene?.imagePrompt?.trim()) && !Boolean(scene?.image?.trim());

export const generateMissingStoryImages = async (conversation, {stylePrompt, imageNamespace} = {}) => {
  const logs = [];
  if (!isStoryImageGenerationConfigured() || !isStoryVisual(conversation)) {
    return logs;
  }

  if (isOpenRouterConfigured()) {
    await ensureStoryVisualBible(conversation);
  }

  const imageProvider = getStoryImageProvider();

  if (imageProvider === "local-gpu") {
    try {
      await ensureLocalGpuModel("flux", {
        onStatus: (message) => logs.push(message),
      });
    } catch (error) {
      logs.push(`GPU FLUX: ${error instanceof Error ? error.message : String(error)}`);
      return logs;
    }
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
    const buffer = await renderStoryFrameBuffer({
      conversation,
      resolved,
      style,
      imageProvider,
      useStyleAnchor: false,
    });
    if (buffer) {
      const targetRef = `images/${namespace}/story-opening.png`;
      const publicPath = await saveImageBuffer(buffer, targetRef);
      opening.image = publicPath;
      if (resolved.imagePrompt) {
        opening.imagePrompt = resolved.imagePrompt;
      }
      logs.push(`Сгенерирован story opening → ${publicPath} (${resolved.promptSource}, ${imageProvider})`);
    }
  }

  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
      const scene = scenes[sceneIndex];
      if (!hasStoryScenePromptOnly(scene)) {
        continue;
      }

      const resolved = await resolveStoryScenePrompts({
        conversation,
        sceneIndex,
        stylePrompt: style,
      });
      const buffer = await renderStoryFrameBuffer({
        conversation,
        resolved,
        style,
        imageProvider,
      });
      if (!buffer) {
        logs.push(`Сцена #${sceneIndex + 1}: не удалось собрать story-промпт`);
        continue;
      }

      const anchor = scene.anchorMessageIndex ?? sceneIndex;
      const targetRef = `images/${namespace}/story-msg-${anchor + 1}.png`;
      const publicPath = await saveImageBuffer(buffer, targetRef);
      scene.image = publicPath;
      if (resolved.imagePrompt) {
        scene.imagePrompt = resolved.imagePrompt;
      }
      story.scenes = scenes;
      syncScenesToMessageAnchors(conversation);

      logs.push(
        `Сгенерирован story-кадр: сцена #${sceneIndex + 1} → ${publicPath} (${resolved.promptSource}, ${imageProvider})`,
      );
    }
    return logs;
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
    const buffer = await renderStoryFrameBuffer({
      conversation,
      resolved,
      style,
      imageProvider,
    });
    if (!buffer) {
      logs.push(`Сообщение #${messageIndex + 1}: не удалось собрать story-промпт`);
      continue;
    }

    const targetRef = `images/${namespace}/story-msg-${messageIndex + 1}.png`;
    const publicPath = await saveImageBuffer(buffer, targetRef);
    message.storyImage = publicPath;
    if (resolved.imagePrompt) {
      message.storyImagePrompt = resolved.imagePrompt;
    }

    logs.push(
      `Сгенерирован story-кадр: сообщение #${messageIndex + 1} → ${publicPath} (${resolved.promptSource}, ${imageProvider})`,
    );
  }

  return logs;
};

export const generateMissingConversationImages = async (
  conversation,
  {stylePrompt, storyStylePrompt, imageNamespace} = {},
) => {
  const logs = [];
  const canChatImages = isOpenRouterConfigured();
  const canStoryImages = isStoryImageGenerationConfigured() && isStoryVisual(conversation);

  if (!canChatImages && !canStoryImages) {
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
  if (canChatImages) {
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
        kind: "chat",
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
