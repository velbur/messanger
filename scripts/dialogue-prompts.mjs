import path from "node:path";
import {readFile, writeFile, mkdir} from "node:fs/promises";
import {HARDCODED_PROMPTS, SHORTS_STYLES_META} from "./dialogue-prompts-content.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROMPTS_DIR = path.join(ROOT, "prompts");
const CORPUS_SUMMARY_FILE = path.join(PROMPTS_DIR, "shorts-corpus-summary.md");
const CORPUS_SUMMARY_KEY = "shorts-corpus-summary";

export const renderPromptTemplate = (template, vars = {}) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

export const readPromptFile = async (key) => {
  if (key === CORPUS_SUMMARY_KEY) {
    try {
      const text = await readFile(CORPUS_SUMMARY_FILE, "utf8");
      return text.trim();
    } catch {
      return "";
    }
  }
  return HARDCODED_PROMPTS[key] ?? "";
};

export const writePromptFile = async (key, content) => {
  if (key !== CORPUS_SUMMARY_KEY) {
    throw new Error("Системные промпты заданы в коде (dialogue-prompts-content.mjs)");
  }
  const trimmed = String(content ?? "").trim();
  if (!trimmed) {
    throw new Error("Промпт не может быть пустым");
  }
  await mkdir(PROMPTS_DIR, {recursive: true});
  await writeFile(CORPUS_SUMMARY_FILE, `${trimmed}\n`, "utf8");
  return trimmed;
};

export const readShortsStylesMeta = async () => SHORTS_STYLES_META;

export const promptKeyForShortsSystem = (language) =>
  language === "en" ? "shorts-system-en" : "shorts-system-ru";

export const promptKeyForLogic = (language) =>
  language === "en" ? "dialogue-logic-en" : "dialogue-logic-ru";

export const promptKeyForLogicRules = (language) =>
  language === "en" ? "logic-rules-en" : "logic-rules-ru";

export const promptKeyForShortsStyle = (style, language) => {
  const normalizedStyle = style === "mystic" ? "mystic" : "fun";
  const lang = language === "en" ? "en" : "ru";
  return `shorts-style-${normalizedStyle}-${lang}`;
};
