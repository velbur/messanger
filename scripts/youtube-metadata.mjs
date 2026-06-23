import {chatCompletion, isOpenRouterConfigured} from "./openrouter-client.mjs";

const parseJsonObject = (text) => {
  const raw = String(text ?? "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
};

/**
 * @param {{ conversation: object, displayTitle?: string, language?: "ru"|"en" }} opts
 */
export const generateYoutubeMetadata = async ({
  conversation,
  displayTitle = "",
  language = "ru",
}) => {
  if (!isOpenRouterConfigured()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env");
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const excerpt = messages.slice(0, 12).map((msg, index) => {
    const who = msg.author === "me" ? conversation?.myName ?? "Я" : conversation?.contactName ?? "?";
    const text = String(msg.text ?? "[фото]").trim().slice(0, 120);
    return `${index + 1}. ${who}: ${text}`;
  });

  const isEn = language === "en";
  const system = isEn
    ? `You write YouTube Shorts packaging. Reply with JSON only: {"description":"...","tags":["..."],"titleVariants":["..."]}. Description: 2-3 short lines + 1 question for comments. tags: 5-8 lowercase tags without #. titleVariants: 3 catchy titles, 2-7 words, no spoiler.`
    : `Ты пишешь упаковку для YouTube Shorts. Ответ — только JSON: {"description":"...","tags":["..."],"titleVariants":["..."]}. description: 2-3 короткие строки + 1 вопрос для комментариев. tags: 5-8 тегов без #. titleVariants: 3 цепляющих названия, 2-7 слов, без спойлера финала.`;

  const user = [
    isEn ? "Chat transcript:" : "Переписка:",
    excerpt.join("\n") || "(empty)",
    "",
    isEn ? `Working title: ${displayTitle || "—"}` : `Рабочее название: ${displayTitle || "—"}`,
  ].join("\n");

  const {text} = await chatCompletion({
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    temperature: 0.6,
    maxTokens: 800,
  });

  const data = parseJsonObject(text);
  const description = String(data.description ?? "").trim();
  const tags = Array.isArray(data.tags)
    ? data.tags.map((tag) => String(tag).trim().replace(/^#/, "")).filter(Boolean).slice(0, 12)
    : [];
  const titleVariants = Array.isArray(data.titleVariants)
    ? data.titleVariants.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
    : [];

  return {description, tags, titleVariants};
};
