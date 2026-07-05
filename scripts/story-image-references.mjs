import {isImageUrl} from "./image-assets.mjs";
import {loadPublicImageDataUrl} from "./image-references.mjs";
import {getStoryScenes} from "./story-scene-timing.mjs";

const MAX_STORY_VISION_REFERENCES = 2;

const frameLabel = (frame) => {
  if (frame.kind === "opening") {
    return "opening (до переписки)";
  }
  if (frame.kind === "scene") {
    return `сцена ${(frame.sceneIndex ?? 0) + 1}`;
  }
  return `сообщение №${frame.messageIndex + 1}`;
};

const pushOpeningFrame = (frames, conversation) => {
  const opening = conversation?.story?.opening;
  const openingImage = String(opening?.image ?? "").trim();
  const openingPrompt = String(opening?.imagePrompt ?? "").trim();
  if (openingImage || openingPrompt) {
    frames.push({
      kind: "opening",
      messageIndex: null,
      sceneIndex: null,
      ref: openingImage,
      imagePrompt: openingPrompt || undefined,
      caption: "establishing shot",
      fileKind: openingImage ? (isImageUrl(openingImage) ? "url" : "local") : "prompt-only",
    });
  }
};

const pushSceneFrames = (frames, conversation, beforeSceneIndex) => {
  const scenes = getStoryScenes(conversation);
  const limit = typeof beforeSceneIndex === "number" ? beforeSceneIndex : scenes.length;

  for (let i = 0; i < limit && i < scenes.length; i += 1) {
    const scene = scenes[i];
    const ref = String(scene?.image ?? "").trim();
    const imagePrompt = String(scene?.imagePrompt ?? "").trim();
    if (!ref && !imagePrompt) {
      continue;
    }
    frames.push({
      kind: "scene",
      sceneIndex: i,
      messageIndex: scene.anchorMessageIndex,
      ref,
      imagePrompt: imagePrompt || undefined,
      caption: String(scene.beat ?? "").trim().slice(0, 160),
      fileKind: ref ? (isImageUrl(ref) ? "url" : "local") : "prompt-only",
    });
  }
};

const pushMessageFrames = (frames, conversation, messageIndex) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const limit = typeof messageIndex === "number" && messageIndex >= 0 ? messageIndex : messages.length;

  for (let i = 0; i < limit && i < messages.length; i += 1) {
    const message = messages[i];
    const ref = String(message?.storyImage ?? "").trim();
    const imagePrompt = String(message?.storyImagePrompt ?? "").trim();
    if (!ref && !imagePrompt) {
      continue;
    }
    frames.push({
      kind: "message",
      messageIndex: i,
      sceneIndex: null,
      ref,
      imagePrompt: imagePrompt || undefined,
      caption: String(message?.text ?? "").trim().slice(0, 160),
      fileKind: ref ? (isImageUrl(ref) ? "url" : "local") : "prompt-only",
    });
  }
};

/**
 * Story-кадры до текущего (opening + scenes или messages).
 */
export const collectPriorStoryFrames = (
  conversation,
  {messageIndex = null, sceneIndex = null, kind = "message"} = {},
) => {
  if (kind === "opening") {
    return [];
  }

  const frames = [];
  pushOpeningFrame(frames, conversation);

  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    if (kind === "scene" && typeof sceneIndex === "number") {
      pushSceneFrames(frames, conversation, sceneIndex);
    } else if (kind === "message" && typeof messageIndex === "number") {
      const sceneIdx = scenes.findIndex((s) => s.anchorMessageIndex === messageIndex);
      if (sceneIdx >= 0) {
        pushSceneFrames(frames, conversation, sceneIdx);
      } else {
        pushSceneFrames(frames, conversation, scenes.length);
        pushMessageFrames(frames, conversation, messageIndex);
      }
    } else {
      pushSceneFrames(frames, conversation, scenes.length);
    }
    return frames;
  }

  pushMessageFrames(frames, conversation, messageIndex);
  return frames;
};

export const resolveStoryImageReferences = async (conversation, options) => {
  const priorFrames = collectPriorStoryFrames(conversation, options);
  const referenceImages = [];

  for (
    let i = priorFrames.length - 1;
    i >= 0 && referenceImages.length < MAX_STORY_VISION_REFERENCES;
    i -= 1
  ) {
    const frame = priorFrames[i];
    if (!frame.ref || frame.fileKind !== "local") {
      continue;
    }
    const dataUrl = await loadPublicImageDataUrl(frame.ref);
    if (!dataUrl) {
      continue;
    }
    referenceImages.unshift({...frame, dataUrl});
  }

  const primaryReference =
    referenceImages.length > 0 ? referenceImages[referenceImages.length - 1] : null;

  return {
    priorFrames,
    referenceImages,
    primaryReference,
    hasReferences: referenceImages.length > 0 || priorFrames.some((f) => f.imagePrompt),
  };
};

export const formatPriorStoryFramesText = (priorFrames, referenceImages = []) => {
  if (!priorFrames.length) {
    return "";
  }
  const loadedKeys = new Set(
    referenceImages.map((r) =>
      r.kind === "opening"
        ? "opening"
        : r.kind === "scene"
          ? `scene:${r.sceneIndex}`
          : `msg:${r.messageIndex}`,
    ),
  );
  const lines = priorFrames.map((frame) => {
    const label = frameLabel(frame);
    const hasFile =
      frame.kind === "opening"
        ? loadedKeys.has("opening")
        : frame.kind === "scene"
          ? loadedKeys.has(`scene:${frame.sceneIndex}`)
          : loadedKeys.has(`msg:${frame.messageIndex}`);
    const prompt = frame.imagePrompt ? ` промпт: «${frame.imagePrompt.slice(0, 200)}»` : "";
    const cap = frame.caption ? ` смысл: «${frame.caption.slice(0, 120)}»` : "";
    const fileNote = frame.ref
      ? hasFile
        ? " [изображение ниже]"
        : " [файл недоступен — опирайся на промпт]"
      : " [только промпт]";
    return `- ${label}${cap}${prompt}${fileNote}`;
  });

  return [
    "Предыдущие story-кадры этой истории (хронология):",
    "Сохраняй визуальную преемственность: те же герои, объекты, цвета и детали, пока переписка явно не говорит об изменении.",
    lines.join("\n"),
  ].join("\n");
};
