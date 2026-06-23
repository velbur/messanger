import {
  readPromptFile,
  writePromptFile,
  renderPromptTemplate,
} from "./dialogue-prompts.mjs";
import {
  chatCompletion,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";

const CORPUS_SUMMARY_KEY = "shorts-corpus-summary";
const CORPUS_SYSTEM_KEY = "shorts-corpus-system";

const stripCorpusBoilerplate = (text) => {
  const trimmed = String(text ?? "").trim();
  if (!trimmed || trimmed.includes("_(Пока пусто")) {
    return "";
  }
  return trimmed;
};

export const readShortsCorpusSummary = async () => stripCorpusBoilerplate(await readPromptFile(CORPUS_SUMMARY_KEY));

const buildCorpusUserPrompt = ({currentSummary, title, dialoguePrompt, conversation}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const excerpt = messages.slice(0, 24).map((msg, index) => {
    const who = msg.author === "me" ? conversation?.myName ?? "Я" : conversation?.contactName ?? "Собеседник";
    const text = String(msg.text ?? msg.imagePrompt ?? "[фото]").trim().slice(0, 200);
    return `${index + 1}. ${who}: ${text}`;
  });

  return [
    "Текущая сводка корпуса:",
    currentSummary || "(пусто)",
    "",
    "Новый сохранённый Shorts:",
    `Название: ${title || "—"}`,
    `Промпт автора: ${dialoguePrompt || "—"}`,
    `contactName: ${conversation?.contactName ?? "—"}`,
    `Сообщений: ${messages.length}`,
    "",
    "Фрагмент переписки:",
    excerpt.length > 0 ? excerpt.join("\n") : "(нет сообщений)",
    "",
    "Верни обновлённую сводку корпуса в Markdown.",
  ].join("\n");
};

export const updateShortsCorpusSummary = async ({
  title,
  dialoguePrompt,
  conversation,
}) => {
  if (!isOpenRouterConfigured()) {
    return {updated: false, reason: "openrouter_not_configured"};
  }

  const currentSummary = await readShortsCorpusSummary();
  const system = await readPromptFile(CORPUS_SYSTEM_KEY);
  if (!system) {
    return {updated: false, reason: "missing_corpus_system_prompt"};
  }

  const user = buildCorpusUserPrompt({
    currentSummary,
    title,
    dialoguePrompt,
    conversation,
  });

  const {text} = await chatCompletion({
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    temperature: 0.35,
    maxTokens: 4000,
  });

  const nextSummary = String(text ?? "").trim();

  if (!nextSummary) {
    return {updated: false, reason: "empty_llm_response"};
  }

  const header = "# Корпус Shorts\n\n";
  await writePromptFile(CORPUS_SUMMARY_KEY, `${header}${nextSummary.replace(/^#+\s*Корпус Shorts\s*\n*/i, "")}`);
  return {updated: true};
};
