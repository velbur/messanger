import {
  assignStorySceneTimeSlots,
  getStoryScenes,
} from "./story-scene-timing.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const isSceneMessage = (message) => message?.display === "scene";

/** Индексы немых scene-реплик — обязательные якоря story-слотов. */
export const sceneMessageAnchorIndices = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return messages.map((message, index) => (isSceneMessage(message) ? index : -1)).filter((index) => index >= 0);
};

/** Добавляет scene-реплики в план сцен (messageFrom = messageTo = index). */
export const mergeSceneMessageAnchors = (conversation, scenes = []) => {
  const silentAnchors = sceneMessageAnchorIndices(conversation);
  if (!silentAnchors.length) {
    return scenes;
  }

  const messages = conversation?.messages ?? [];
  const merged = [...scenes];
  const existing = new Set(merged.map((scene) => scene.anchorMessageIndex));

  for (const anchorIndex of silentAnchors) {
    if (existing.has(anchorIndex)) {
      continue;
    }
    const message = messages[anchorIndex];
    const beat =
      normalizeSpace(message?.text) ||
      normalizeSpace(message?.storyImagePrompt) ||
      `Немая сцена ${anchorIndex + 1}`;
    merged.push({
      id: `scene-msg-${anchorIndex + 1}`,
      beat,
      anchorMessageIndex: anchorIndex,
      messageFrom: anchorIndex,
      messageTo: anchorIndex,
      imagePrompt: normalizeSpace(message?.storyImagePrompt) || undefined,
      image: normalizeSpace(message?.storyImage) || undefined,
      storySceneCharacters: message?.storySceneCharacters,
    });
    existing.add(anchorIndex);
  }

  return merged.sort((a, b) => a.anchorMessageIndex - b.anchorMessageIndex);
};

const clearStoryFrameSlot = (message) => {
  delete message.storyImage;
  delete message.storyImagePrompt;
  delete message.storySceneCharacters;
  delete message.storyVideo;
  delete message.storyVideoLoop;
  delete message.storyVideoDurationMs;
};

/** Промпты и image с scenes[] → anchor messages (для timeline / Wan). */
export const syncScenesToMessageAnchors = (conversation) => {
  const scenes = getStoryScenes(conversation);
  if (!scenes.length) {
    return conversation;
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const anchorSet = new Set(scenes.map((s) => s.anchorMessageIndex));
  const sceneAnchors = new Set(sceneMessageAnchorIndices(conversation));

  for (let index = 0; index < messages.length; index += 1) {
    if (!anchorSet.has(index) && !sceneAnchors.has(index)) {
      clearStoryFrameSlot(messages[index]);
    }
  }

  for (const scene of scenes) {
    const message = messages[scene.anchorMessageIndex];
    if (!message) {
      continue;
    }
    const prompt = normalizeSpace(scene.imagePrompt);
    if (prompt) {
      message.storyImagePrompt = prompt;
    }
    const image = normalizeSpace(scene.image);
    if (image) {
      message.storyImage = image;
    }
    if (Array.isArray(scene.storySceneCharacters) && scene.storySceneCharacters.length > 0) {
      message.storySceneCharacters = scene.storySceneCharacters;
    }
  }

  return conversation;
};

export const applyStoryScenesPlan = (conversation, {includeOpening, scenes}) => {
  if (!conversation.story) {
    conversation.story = {};
  }
  const mergedScenes = mergeSceneMessageAnchors(conversation, scenes);
  conversation.story.scenes = mergedScenes;

  const anchorIndices = mergedScenes.map((s) => s.anchorMessageIndex);
  applyLegacyMessageIndices(conversation, {includeOpening, messageIndices: anchorIndices});
  syncScenesToMessageAnchors(conversation);
  return conversation;
};

/** Очищает storyImage* на сообщениях вне плана (legacy + scenes). */
export const applyLegacyMessageIndices = (conversation, {includeOpening, messageIndices}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const planned = new Set(messageIndices);
  const sceneAnchors = new Set(sceneMessageAnchorIndices(conversation));

  for (let index = 0; index < messages.length; index += 1) {
    if (!planned.has(index) && !sceneAnchors.has(index)) {
      clearStoryFrameSlot(messages[index]);
    }
  }

  if (!conversation.story) {
    conversation.story = {};
  }
  if (!conversation.story.opening) {
    conversation.story.opening = {};
  }
  if (!includeOpening && conversation.story.opening) {
    delete conversation.story.opening.image;
    delete conversation.story.opening.imagePrompt;
  }

  return conversation;
};

export const enrichScenesWithTimelineMs = (conversation, scenes) =>
  assignStorySceneTimeSlots(conversation, scenes);

export const scenesFromLegacyMessageIndices = (conversation, {includeOpening, messageIndices, rationale = ""}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  const sorted = [...new Set(messageIndices)].sort((a, b) => a - b);

  const scenes = sorted.map((anchorIndex, order) => {
    const prevAnchor = order > 0 ? sorted[order - 1] : 0;
    const messageFrom = order === 0 ? 0 : prevAnchor;
    const messageTo = anchorIndex;
    const anchorMessage = messages[anchorIndex];
    const beat =
      isSceneMessage(anchorMessage)
        ? normalizeSpace(anchorMessage?.text).slice(0, 200) ||
          normalizeSpace(anchorMessage?.storyImagePrompt).slice(0, 200)
        : normalizeSpace(anchorMessage?.text).slice(0, 200);
    const resolvedBeat =
      beat || `Сцена ${order + 1}: реплика ${anchorIndex + 1}`;

    return {
      id: `scene-${order + 1}`,
      beat: resolvedBeat,
      anchorMessageIndex: anchorIndex,
      messageFrom,
      messageTo,
      imagePrompt: normalizeSpace(anchorMessage?.storyImagePrompt) || undefined,
      image: normalizeSpace(anchorMessage?.storyImage) || undefined,
      storySceneCharacters: anchorMessage?.storySceneCharacters,
    };
  });

  return {
    includeOpening,
    scenes: enrichScenesWithTimelineMs(conversation, scenes),
    rationale,
    messageIndices: sorted,
  };
};

export {clearStoryFrameSlot};
