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
          "Ты арт-директор фотореалистичного Shorts.",
          "По переписке определи героев, которые могут появляться в кадрах.",
          "Для каждого героя задай стабильное описание внешности (2–3 предложения): возраст, телосложение, волосы, лицо, одежда, отличительные детали.",
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

  let sceneCount = 0;

  const openingPrompt = normalizeSpace(conversation.story?.opening?.imagePrompt);
  if (!openingPrompt || forcePrompts) {
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
  }

  const messages = conversation.messages ?? [];
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex];
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
  const messages = conversation?.messages ?? [];
  if (!normalizeSpace(conversation?.story?.opening?.imagePrompt)) {
    return true;
  }
  return messages.some((message) => !normalizeSpace(message.storyImagePrompt));
};
