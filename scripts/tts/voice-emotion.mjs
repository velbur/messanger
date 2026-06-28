import {chatCompletionJson, isOpenRouterConfigured} from "../openrouter-client.mjs";
import {isSpeechableText} from "./text-for-speech.mjs";

const EMOTION_MAX_LEN = 120;

const normalizeEmotion = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, EMOTION_MAX_LEN);

const buildTranscript = (messages, contactName) =>
  messages
    .map((message, index) => {
      const who = message.author === "me" ? "Я" : contactName || "Собеседник";
      const text = String(message.text ?? "").trim();
      return `#${index + 1} [${who}]: ${text || "—"}`;
    })
    .join("\n");

const SYSTEM_PROMPT = [
  "Ты режиссёр озвучки сюжетных Shorts. По переписке (это история с развитием) определи, с какой эмоцией актёр должен произнести КАЖДУЮ реплику.",
  "Эмоция обязана соответствовать повествованию и его динамике: страх, тревога, напряжение, непонимание, удивление, любопытство, радость, восторг, облегчение, грусть, разочарование, раздражение, злость, сарказм, нежность, спокойствие и т.п.",
  "Для каждой реплики верни короткую инструкцию для актёра на русском: эмоция + как произнести (темп, громкость, интонация). 3–8 слов, без кавычек.",
  "Учитывай контекст соседних реплик и нарастание/спад напряжения по ходу истории. НЕ делай все реплики одинаковыми — эмоции должны меняться по сюжету.",
  'Ответ строго JSON: {"emotions":[{"index":1,"emotion":"…"},…]}. index — номер реплики из ввода (нумерация с 1), для каждой реплики ровно один объект.',
].join("\n");

/**
 * Определяет эмоцию подачи для каждой реплики по всему сюжету (один LLM-запрос).
 * @param {{conversation: import('../../src/chat/schema.ts').ConversationInput}} opts
 * @returns {Promise<Map<number, string>>} ключ — индекс сообщения (с 0), значение — инструкция эмоции
 */
export const inferConversationEmotions = async ({conversation}) => {
  const result = new Map();
  if (!isOpenRouterConfigured()) {
    return result;
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (messages.length === 0) {
    return result;
  }

  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const transcript = buildTranscript(messages, contactName);

  const {data} = await chatCompletionJson({
    messages: [
      {role: "system", content: SYSTEM_PROMPT},
      {
        role: "user",
        content: [
          `Контакт: ${contactName}`,
          "Реплики переписки по порядку (их озвучивают вслух):",
          transcript,
          "Определи эмоцию подачи для каждой реплики, согласованно с развитием сюжета.",
        ].join("\n\n"),
      },
    ],
    temperature: 0.5,
    maxTokens: 1600,
  });

  const items = Array.isArray(data?.emotions) ? data.emotions : [];
  for (const item of items) {
    const index = Number(item?.index);
    const emotion = normalizeEmotion(item?.emotion);
    if (Number.isInteger(index) && index >= 1 && index <= messages.length && emotion) {
      result.set(index - 1, emotion);
    }
  }

  return result;
};

/**
 * Заполняет message.voiceEmotion для реплик без эмоции (мутирует conversation).
 * @returns {Promise<{filled: number, attempted: boolean}>}
 */
export const ensureConversationEmotions = async (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const missing = messages.some(
    (message) => isSpeechableText(message?.text) && !String(message?.voiceEmotion ?? "").trim(),
  );
  if (!missing) {
    return {filled: 0, attempted: false};
  }
  if (!isOpenRouterConfigured()) {
    return {filled: 0, attempted: false};
  }

  const emotions = await inferConversationEmotions({conversation});
  let filled = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!isSpeechableText(message?.text)) {
      continue;
    }
    if (String(message.voiceEmotion ?? "").trim()) {
      continue;
    }
    const inferred = emotions.get(index);
    if (inferred) {
      message.voiceEmotion = inferred;
      filled += 1;
    }
  }
  return {filled, attempted: true};
};
