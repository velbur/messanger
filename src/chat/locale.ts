import type {ConversationInput, MessageInput} from "./schema";

export type MessengerLocale = {
  contactStatus: string;
  contactStatusTyping: string;
  inputPlaceholder: string;
};

export const MESSENGER_LOCALE_RU: MessengerLocale = {
  contactStatus: "в сети",
  contactStatusTyping: "печатает...",
  inputPlaceholder: "Сообщение",
};

export const MESSENGER_LOCALE_EN: MessengerLocale = {
  contactStatus: "online",
  contactStatusTyping: "typing...",
  inputPlaceholder: "Message",
};

const RU_STATUSES = new Set([
  MESSENGER_LOCALE_RU.contactStatus,
  "в сети",
  "онлайн",
]);

const RU_TYPING = new Set([
  MESSENGER_LOCALE_RU.contactStatusTyping,
  "печатает...",
  "печатает…",
]);

const EN_STATUSES = new Set([MESSENGER_LOCALE_EN.contactStatus, "online"]);
const EN_TYPING = new Set([MESSENGER_LOCALE_EN.contactStatusTyping, "typing..."]);

const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LATIN_RE = /[A-Za-z]/;

const detectLanguageFromMessages = (messages: MessageInput[] = []): "en" | "ru" | null => {
  let latin = 0;
  let cyrillic = 0;

  for (const message of messages) {
    const text = message.text ?? "";
    for (const char of text) {
      if (CYRILLIC_RE.test(char)) {
        cyrillic += 1;
      } else if (LATIN_RE.test(char)) {
        latin += 1;
      }
    }
  }

  const total = latin + cyrillic;
  if (total < 12) {
    return null;
  }
  if (latin >= cyrillic * 1.2) {
    return "en";
  }
  if (cyrillic >= latin * 1.2) {
    return "ru";
  }
  return null;
};

export const isEnglishConversation = (
  conversation: Pick<ConversationInput, "locale" | "myName" | "contactStatus" | "messages">,
): boolean => {
  if (conversation.locale === "en") {
    return true;
  }
  if (conversation.locale === "ru") {
    return false;
  }

  const fromMessages = detectLanguageFromMessages(conversation.messages);
  if (fromMessages === "en") {
    return true;
  }
  if (fromMessages === "ru") {
    return false;
  }

  const myName = conversation.myName?.trim();
  const status = conversation.contactStatus?.trim().toLowerCase();
  if (myName === "Me" || myName === "You") {
    return true;
  }
  if (status === "online") {
    return true;
  }
  return false;
};

export const getMessengerLocale = (
  conversation: Pick<ConversationInput, "locale" | "myName" | "contactStatus" | "messages">,
): MessengerLocale =>
  isEnglishConversation(conversation) ? MESSENGER_LOCALE_EN : MESSENGER_LOCALE_RU;

const isDefaultStatus = (value: string | undefined, ruSet: Set<string>, enSet: Set<string>) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return true;
  }
  return ruSet.has(trimmed) || enSet.has(trimmed);
};

export const normalizeMessengerLocale = (conversation: ConversationInput): ConversationInput => {
  const locale = getMessengerLocale(conversation);
  const useEn = isEnglishConversation(conversation);
  const status = conversation.contactStatus?.trim();
  const typing = conversation.contactStatusTyping?.trim();

  const nextStatus = isDefaultStatus(status, RU_STATUSES, EN_STATUSES)
    ? locale.contactStatus
    : status || locale.contactStatus;
  const nextTyping = isDefaultStatus(typing, RU_TYPING, EN_TYPING)
    ? locale.contactStatusTyping
    : typing || locale.contactStatusTyping;

  let nextMyName = conversation.myName;
  if (useEn && (nextMyName === "Я" || nextMyName === "Алиса")) {
    nextMyName = "Me";
  } else if (!useEn && nextMyName === "Me") {
    nextMyName = "Я";
  }

  return {
    ...conversation,
    locale: useEn ? "en" : "ru",
    contactStatus: nextStatus,
    contactStatusTyping: nextTyping,
    myName: nextMyName,
  };
};
