import {HARDCODED_PROMPTS, SHORTS_STYLES_META} from "./dialogue-prompts-content.mjs";

export const renderPromptTemplate = (template, vars = {}) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

export const readPromptFile = async (key) => HARDCODED_PROMPTS[key] ?? "";

export const readShortsStylesMeta = async () => SHORTS_STYLES_META;

export const promptKeyForShortsSystem = (language) =>
  language === "en" ? "shorts-system-en" : "shorts-system-ru";

export const promptKeyForLogic = (language) =>
  language === "en" ? "dialogue-logic-en" : "dialogue-logic-ru";

export const promptKeyForLogicRules = (language) =>
  language === "en" ? "logic-rules-en" : "logic-rules-ru";

export const promptKeyForShortsStyle = (style, language) => {
  const normalizedStyle = style === "mystic" ? "mystic" : style === "story" ? "story" : "fun";
  const lang = language === "en" ? "en" : "ru";
  return `shorts-style-${normalizedStyle}-${lang}`;
};
