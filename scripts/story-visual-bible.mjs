import {chatCompletionJson as openRouterChatJson, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {formatCharacterBible, hasStoryCharacters} from "./story-characters.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const MIN_BIBLE_LENGTH = 40;

const buildTranscript = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  const myName = normalizeSpace(conversation?.myName) || "Я";
  return messages
    .map((message, index) => {
      const who = message.author === "me" ? myName : contactName;
      return `${index + 1}. ${who}: ${normalizeSpace(message.text)}`;
    })
    .join("\n");
};

const formatBibleFromLlm = (data) => {
  const rules = normalizeSpace(data?.continuityRules);
  const props = Array.isArray(data?.keyProps)
    ? data.keyProps
        .map((item) => {
          if (!item || typeof item !== "object") {
            return "";
          }
          const name = normalizeSpace(item.name);
          const description = normalizeSpace(item.description);
          const mutable = item.mutable === true;
          if (!name || !description) {
            return "";
          }
          return `- ${name}: ${description}${mutable ? " (может меняться по сюжету)" : " (фиксировано до явного изменения в истории)"}`;
        })
        .filter(Boolean)
    : [];
  const locations = Array.isArray(data?.locations)
    ? data.locations.map((value) => normalizeSpace(value)).filter(Boolean)
    : [];
  const palette = normalizeSpace(data?.palette);

  const parts = [];
  if (rules) {
    parts.push(`Правила преемственности: ${rules}`);
  }
  if (palette) {
    parts.push(`Палитра и освещение: ${palette}`);
  }
  if (locations.length) {
    parts.push(`Локации:\n${locations.map((loc) => `- ${loc}`).join("\n")}`);
  }
  if (props.length) {
    parts.push(`Ключевые объекты и детали:\n${props.join("\n")}`);
  }

  return parts.join("\n\n").trim();
};

/**
 * Извлекает visual bible из переписки (OpenRouter) и сохраняет в story.visualBible.
 */
export const ensureStoryVisualBible = async (conversation, {force = false} = {}) => {
  if (!conversation || typeof conversation !== "object") {
    return conversation;
  }
  if (!conversation.story) {
    conversation.story = {};
  }

  const existing = normalizeSpace(conversation.story.visualBible);
  if (!force && existing.length >= MIN_BIBLE_LENGTH) {
    return conversation;
  }

  if (!isOpenRouterConfigured()) {
    return conversation;
  }

  const transcript = buildTranscript(conversation);
  if (!transcript) {
    return conversation;
  }

  const characterBible = formatCharacterBible(conversation);
  const {data} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: [
          "Ты арт-директор рисованного вертикального Shorts.",
          "По переписке составь справочник визуальной преемственности для всех кадров одной истории.",
          "Зафиксируй повторяющиеся объекты (машины, одежда, интерьер, животные) с точными цветами и деталями.",
          "Отмечай mutable:true только если переписка явно описывает изменение (покраска, новая одежда, переезд).",
          "Ответ строго JSON:",
          '{"continuityRules":"...","palette":"...","locations":["..."],"keyProps":[{"name":"...","description":"...","mutable":false}]}',
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          characterBible ? `Герои:\n${characterBible}` : "",
          "Переписка:",
          transcript,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.2,
    maxTokens: 1800,
  });

  const bible = formatBibleFromLlm(data);
  if (bible.length >= MIN_BIBLE_LENGTH) {
    conversation.story.visualBible = bible;
  }

  return conversation;
};

export const formatVisualBible = (conversation) =>
  normalizeSpace(conversation?.story?.visualBible);

/** Короткая выжимка visual bible для FLUX (лимит ~512 токенов на промпт). */
export const compactVisualBible = (visualBible, maxLen = 280) => {
  const bible = normalizeSpace(visualBible);
  if (!bible) {
    return "";
  }

  const parts = [];
  const rulesMatch = bible.match(/Правила преемственности:\s*[^.]+\.?/);
  const paletteMatch = bible.match(/Палитра и освещение:\s*[^.]+\.?/);
  if (rulesMatch) {
    parts.push(rulesMatch[0].trim());
  }
  if (paletteMatch) {
    parts.push(paletteMatch[0].trim());
  }

  let compact = parts.join(" ");
  if (!compact) {
    compact = bible;
  }
  if (compact.length > maxLen) {
    return `${compact.slice(0, maxLen - 1).trim()}…`;
  }
  return compact;
};

export const hasStoryVisualBible = (conversation) =>
  formatVisualBible(conversation).length >= MIN_BIBLE_LENGTH;

/** @deprecated alias */
export const getStoryVisualBible = formatVisualBible;
