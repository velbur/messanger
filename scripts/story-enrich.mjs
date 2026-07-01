import {readStoryStylePrompt} from "./image-prompt.mjs";
import {suggestStoryImagePrompt} from "./image-prompt-llm.mjs";
import {
  formatCharacterBible,
  getStoryCharacters,
  hasStoryCharacters,
  normalizeStoryCharacter,
} from "./story-characters.mjs";
import {chatCompletionJson as openRouterChatJson, isOpenRouterConfigured} from "./openrouter-client.mjs";

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

const computeSceneBudget = (messageCount) => {
  if (messageCount <= 6) {
    return {min: 2, max: 4};
  }
  if (messageCount <= 15) {
    return {min: 3, max: 6};
  }
  if (messageCount <= 30) {
    return {min: 5, max: 10};
  }
  if (messageCount <= 50) {
    return {min: 8, max: 14};
  }
  return {min: 10, max: 18};
};

const fallbackStoryScenePlan = (messageCount) => {
  if (messageCount <= 0) {
    return {includeOpening: true, messageIndices: [], rationale: "fallback"};
  }
  const {max} = computeSceneBudget(messageCount);
  const step = Math.max(2, Math.ceil(messageCount / max));
  const indices = [];
  for (let index = 0; index < messageCount; index += step) {
    indices.push(index);
  }
  if (!indices.includes(0)) {
    indices.unshift(0);
  }
  if (messageCount > 3 && !indices.includes(messageCount - 1)) {
    indices.push(messageCount - 1);
  }
  return {
    includeOpening: true,
    messageIndices: [...new Set(indices)].sort((a, b) => a - b),
    rationale: "равномерная сетка (fallback)",
  };
};

const normalizeStoryScenePlan = (data, messageCount) => {
  const includeOpening = data?.includeOpening !== false;
  const raw = Array.isArray(data?.messageIndices) ? data.messageIndices : [];
  const messageIndices = [...new Set(
    raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((index) => Number.isFinite(index) && index >= 0 && index < messageCount),
  )].sort((a, b) => a - b);

  if (messageIndices.length === 0 && messageCount > 0) {
    messageIndices.push(0);
  }

  const rationale = normalizeSpace(data?.rationale);
  return {includeOpening, messageIndices, rationale};
};

/** По всей переписке выбирает, на каких сообщениях нужен сюжетный кадр (не на каждом). */
export const planStoryScenePlacements = async (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageCount = messages.length;
  if (messageCount === 0) {
    return {includeOpening: true, messageIndices: [], rationale: ""};
  }

  if (!isOpenRouterConfigured()) {
    return fallbackStoryScenePlan(messageCount);
  }

  const {min, max} = computeSceneBudget(messageCount);
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  const transcript = messages
    .map((message, index) => {
      const who = message.author === "me" ? myName : contactName;
      return `${index}. ${who}: ${normalizeSpace(message.text)}`;
    })
    .join("\n");

  try {
    const {data} = await openRouterChatJson({
      messages: [
        {
          role: "system",
          content: [
            "Ты монтажёр рисованного Shorts: переписка внизу, сменяющиеся иллюстрации 9:16 сверху.",
            "По всей переписке выбери, на каких сообщениях нужен новый сюжетный кадр.",
            "Не ставь кадр на каждую реплику — только на смысловые повороты: новая локация, ключевая находка, эмоциональный пик, визуальная разгадка, смена обстановки.",
            "Серия коротких реплик без смены сцены — один кадр на группу.",
            `Цель: ${min}–${max} кадров на ${messageCount} сообщений (не больше ${max}).`,
            "messageIndices — 0-based индексы сообщений с кадрами, по возрастанию, без дубликатов.",
            "includeOpening: true — establishing shot до чата; false — сразу первый кадр на сообщении (если оно в списке).",
            'Ответ строго JSON: {"includeOpening":true,"messageIndices":[0,5,12],"rationale":"кратко по-русски"}',
          ].join("\n"),
        },
        {
          role: "user",
          content: [`Я: ${myName}`, `Собеседник: ${contactName}`, "", "Переписка:", transcript].join("\n"),
        },
      ],
      temperature: 0.2,
      maxTokens: 1200,
    });

    return normalizeStoryScenePlan(data, messageCount);
  } catch {
    return fallbackStoryScenePlan(messageCount);
  }
};

const messageHasStoryFrameSlot = (message) =>
  Boolean(message?.storyImage?.trim()) ||
  Boolean(message?.storyImagePrompt?.trim()) ||
  Object.hasOwn(message ?? {}, "storyImagePrompt");

const collectExistingStoryFrameIndices = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageIndices = messages
    .map((message, index) => (messageHasStoryFrameSlot(message) ? index : -1))
    .filter((index) => index >= 0);
  const includeOpening = Boolean(
    conversation?.story?.opening?.image?.trim() ||
      conversation?.story?.opening?.imagePrompt?.trim() ||
      Object.hasOwn(conversation?.story?.opening ?? {}, "imagePrompt"),
  );
  return {includeOpening, messageIndices};
};

const clearStoryFrameSlot = (message) => {
  delete message.storyImage;
  delete message.storyImagePrompt;
  delete message.storySceneCharacters;
  delete message.storyVideo;
  delete message.storyVideoLoop;
  delete message.storyVideoDurationMs;
};

const applyStoryScenePlan = (conversation, {includeOpening, messageIndices}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const planned = new Set(messageIndices);

  for (let index = 0; index < messages.length; index += 1) {
    if (!planned.has(index)) {
      clearStoryFrameSlot(messages[index]);
    }
  }

  ensureStorySceneSlots(conversation);
  if (!includeOpening) {
    if (conversation.story?.opening) {
      delete conversation.story.opening.image;
      delete conversation.story.opening.imagePrompt;
    }
  }
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
  ensureStorySceneSlots(conversation);

  let scenePlan;
  if (forcePrompts) {
    scenePlan = await planStoryScenePlacements(conversation);
    applyStoryScenePlan(conversation, scenePlan);
  } else {
    scenePlan = collectExistingStoryFrameIndices(conversation);
  }

  let sceneCount = 0;

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

  const messages = conversation.messages ?? [];
  for (const messageIndex of scenePlan.messageIndices) {
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

  return {
    conversation,
    enriched: true,
    sceneCount,
    frameCount: scenePlan.messageIndices.length + (scenePlan.includeOpening ? 1 : 0),
    plannedMessageIndices: scenePlan.messageIndices,
    includeOpening: scenePlan.includeOpening,
    planRationale: scenePlan.rationale ?? "",
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
  const {includeOpening, messageIndices} = collectExistingStoryFrameIndices(conversation);
  if (messageIndices.length === 0 && !includeOpening) {
    return true;
  }
  const messages = conversation?.messages ?? [];
  if (includeOpening && !normalizeSpace(conversation?.story?.opening?.imagePrompt)) {
    return true;
  }
  return messageIndices.some((index) => !normalizeSpace(messages[index]?.storyImagePrompt));
};
