import {readStoryStylePrompt} from "./image-prompt.mjs";
import {suggestStoryImagePrompt} from "./image-prompt-llm.mjs";
import {
  formatCharacterBible,
  getStoryCharacters,
  hasStoryCharacters,
  normalizeStoryCharacter,
} from "./story-characters.mjs";
import {ensureStoryVisualBible} from "./story-visual-bible.mjs";
import {chatCompletionJson as openRouterChatJson, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {computeSceneCountFromTarget, getStoryScenes, getStoryTargetDurationSec} from "./story-scene-timing.mjs";
import {syncScenesToMessageAnchors} from "./story-scene-sync.mjs";
import {
  applyStoryScenePlanToConversation,
  planStoryScenesByTime,
  planStoryScenePlacements,
} from "./story-scene-plan.mjs";

export {planStoryScenesByTime, planStoryScenePlacements};

const isStoryVisualLayout = (layout) => layout === "storySplit" || layout === "storyOverlay";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const buildDefaultCharacters = (conversation) => {
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  return [
    {
      id: "me",
      name: myName,
      role: "me",
      appearance:
        "взрослый человек, естественные черты лица, повседневная одежда; конкретный возраст, причёска и детали — по смыслу переписки",
    },
    {
      id: "them",
      name: contactName,
      role: "them",
      appearance:
        "взрослый человек, естественные черты лица, повседневная одежда; конкретный возраст, причёска и детали — по смыслу переписки",
    },
  ];
};

const extractStoryCharacters = async (conversation) => {
  if (!isOpenRouterConfigured()) {
    return buildDefaultCharacters(conversation);
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  const transcript = messages
    .map((message, index) => {
      const who = message.author === "me" ? myName : contactName;
      return `${index + 1}. ${who}: ${normalizeSpace(message.text)}`;
    })
    .join("\n");

  const {data} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: [
          "Ты арт-директор рисованного Shorts (детализированная иллюстрация, единый стиль).",
          "По переписке определи героев, которые могут появляться в кадрах.",
          "Для каждого героя задай стабильное описание внешности для иллюстратора (2–3 предложения): возраст, телосложение, волосы, лицо, одежда, отличительные детали.",
          "Главные герои переписки: id me (я) и them (собеседник). Дополнительные персонажи — id по имени латиницей.",
          'Ответ строго JSON: {"characters":[{"id":"me","name":"...","role":"me","appearance":"..."}]}',
        ].join("\n"),
      },
      {
        role: "user",
        content: [`Я: ${myName}`, `Собеседник: ${contactName}`, "", "Переписка:", transcript].join("\n"),
      },
    ],
    temperature: 0.2,
    maxTokens: 2000,
  });

  const parsed = Array.isArray(data?.characters)
    ? data.characters.map(normalizeStoryCharacter).filter(Boolean)
    : [];
  return parsed.length > 0 ? parsed : buildDefaultCharacters(conversation);
};

export const ensureStoryCharacters = async (conversation) => {
  if (!conversation || typeof conversation !== "object") {
    return conversation;
  }
  if (!conversation.story) {
    conversation.story = {};
  }

  const existing = getStoryCharacters(conversation);
  if (existing.length > 0 && existing.every((character) => character.appearance.length > 20)) {
    return conversation;
  }

  conversation.story.characters = await extractStoryCharacters(conversation);
  return conversation;
};

const ensureStorySceneSlots = (conversation) => {
  if (!conversation.story) {
    conversation.story = {};
  }
  if (!conversation.story.opening) {
    conversation.story.opening = {};
  }
  return conversation;
};

const collectExistingScenePlan = (conversation) => {
  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    const includeOpening = Boolean(
      conversation?.story?.opening?.image?.trim() ||
        conversation?.story?.opening?.imagePrompt?.trim() ||
        Object.hasOwn(conversation?.story?.opening ?? {}, "imagePrompt"),
    );
    return {
      includeOpening,
      scenes,
      messageIndices: scenes.map((s) => s.anchorMessageIndex),
      rationale: "",
    };
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageIndices = messages
    .map((message, index) =>
      message.storyImage?.trim() || message.storyImagePrompt?.trim() ? index : -1,
    )
    .filter((index) => index >= 0);
  const includeOpening = Boolean(
    conversation?.story?.opening?.image?.trim() ||
      conversation?.story?.opening?.imagePrompt?.trim() ||
      Object.hasOwn(conversation?.story?.opening ?? {}, "imagePrompt"),
  );
  return {includeOpening, scenes: [], messageIndices, rationale: ""};
};

export const enrichStoryVisualDialogue = async (conversation, {stylePrompt, forcePrompts = true} = {}) => {
  if (!isStoryVisualLayout(conversation?.layout)) {
    return {conversation, enriched: false, sceneCount: 0};
  }

  if (!isOpenRouterConfigured()) {
    await ensureStoryCharacters(conversation);
    ensureStorySceneSlots(conversation);
    return {conversation, enriched: false, sceneCount: 0, skippedReason: "openrouter_not_configured"};
  }

  const style = normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());
  await ensureStoryCharacters(conversation);
  await ensureStoryVisualBible(conversation);
  ensureStorySceneSlots(conversation);

  if (!conversation.story.targetDurationSec) {
    conversation.story.targetDurationSec = getStoryTargetDurationSec(conversation);
  }

  let scenePlan;
  if (forcePrompts) {
    scenePlan = await planStoryScenesByTime(conversation);
    applyStoryScenePlanToConversation(conversation, scenePlan);
  } else {
    scenePlan = collectExistingScenePlan(conversation);
    syncScenesToMessageAnchors(conversation);
  }

  let sceneCount = 0;
  const targetSec = getStoryTargetDurationSec(conversation);
  const plannedSceneCount = scenePlan.scenes?.length ?? scenePlan.messageIndices?.length ?? 0;

  const openingPrompt = normalizeSpace(conversation.story?.opening?.imagePrompt);
  if (scenePlan.includeOpening && (!openingPrompt || forcePrompts)) {
    const opening = await suggestStoryImagePrompt({
      conversation,
      kind: "opening",
      stylePrompt: style,
      force: forcePrompts || !openingPrompt,
    });
    if (opening.imagePrompt) {
      conversation.story.opening.imagePrompt = opening.imagePrompt;
      sceneCount += 1;
    }
  } else if (!scenePlan.includeOpening && conversation.story?.opening) {
    delete conversation.story.opening.imagePrompt;
  }

  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
      const scene = scenes[sceneIndex];
      const existing = normalizeSpace(scene.imagePrompt);
      if (existing && !forcePrompts) {
        continue;
      }

      const result = await suggestStoryImagePrompt({
        conversation,
        sceneIndex,
        kind: "scene",
        stylePrompt: style,
        force: forcePrompts || !existing,
      });

      if (result.imagePrompt) {
        scene.imagePrompt = result.imagePrompt;
        sceneCount += 1;
      }
      if (Array.isArray(result.charactersInFrame)) {
        scene.storySceneCharacters = result.charactersInFrame;
      }
    }
    conversation.story.scenes = scenes;
    syncScenesToMessageAnchors(conversation);
  } else {
    const messages = conversation.messages ?? [];
    for (const messageIndex of scenePlan.messageIndices ?? []) {
      const message = messages[messageIndex];
      if (!message) {
        continue;
      }
      const existing = normalizeSpace(message.storyImagePrompt);
      if (existing && !forcePrompts) {
        continue;
      }

      const result = await suggestStoryImagePrompt({
        conversation,
        messageIndex,
        kind: "message",
        stylePrompt: style,
        force: forcePrompts || !existing,
      });

      if (result.imagePrompt) {
        message.storyImagePrompt = result.imagePrompt;
        sceneCount += 1;
      }
      if (Array.isArray(result.charactersInFrame)) {
        message.storySceneCharacters = result.charactersInFrame;
      } else {
        delete message.storySceneCharacters;
      }
    }
  }

  const planRationale = [
    scenePlan.rationale,
    `~${plannedSceneCount} сцен на ${targetSec} с (цель ${computeSceneCountFromTarget(conversation)} кадров)`,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    conversation,
    enriched: true,
    sceneCount,
    frameCount: plannedSceneCount + (scenePlan.includeOpening ? 1 : 0),
    plannedMessageIndices: scenePlan.messageIndices ?? scenes.map((s) => s.anchorMessageIndex),
    plannedScenes: scenes,
    includeOpening: scenePlan.includeOpening,
    planRationale,
    targetDurationSec: targetSec,
    characterCount: getStoryCharacters(conversation).length,
    characterBible: formatCharacterBible(conversation),
  };
};

export const storyVisualNeedsEnrichment = (conversation) => {
  if (!isStoryVisualLayout(conversation?.layout)) {
    return false;
  }
  if (!hasStoryCharacters(conversation)) {
    return true;
  }

  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    const includeOpening = Boolean(
      conversation?.story?.opening?.image?.trim() ||
        conversation?.story?.opening?.imagePrompt?.trim() ||
        Object.hasOwn(conversation?.story?.opening ?? {}, "imagePrompt"),
    );
    if (includeOpening && !normalizeSpace(conversation?.story?.opening?.imagePrompt)) {
      return true;
    }
    return scenes.some((scene) => !normalizeSpace(scene.imagePrompt));
  }

  const {includeOpening, messageIndices} = collectExistingScenePlan(conversation);
  if (messageIndices.length === 0 && !includeOpening) {
    return true;
  }
  const messages = conversation?.messages ?? [];
  if (includeOpening && !normalizeSpace(conversation?.story?.opening?.imagePrompt)) {
    return true;
  }
  return messageIndices.some((index) => !normalizeSpace(messages[index]?.storyImagePrompt));
};
