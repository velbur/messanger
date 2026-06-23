import {getOpenRouterTextModel} from "./openrouter-client.mjs";

/** Модели OpenRouter, подходящие для JSON-диалогов (переписка, логика, доработка). */
export const DIALOGUE_MODEL_PRESETS = [
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    hint: "Лучшее качество диалогов, юмора и логики",
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    hint: "Сильный баланс качества и скорости",
  },
  {
    id: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    hint: "Быстрее и дешевле для черновиков",
  },
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    hint: "Живые диалоги, хорошая связность сцены",
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    label: "Claude 3.7 Sonnet",
    hint: "Стабильный стиль переписки",
  },
  {
    id: "google/gemini-2.5-pro-preview",
    label: "Gemini 2.5 Pro",
    hint: "Длинные сцены, уверенный русский",
  },
  {
    id: "google/gemini-2.5-flash-preview",
    label: "Gemini 2.5 Flash",
    hint: "Быстрая генерация и проверка логики",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek V3",
    hint: "Недорого, неплохие сценарии",
  },
  {
    id: "meta-llama/llama-4-maverick",
    label: "Llama 4 Maverick",
    hint: "Open-source альтернатива",
  },
];

const presetIds = () => new Set(DIALOGUE_MODEL_PRESETS.map((item) => item.id));

export const listDialogueModels = () => {
  const defaultId = getOpenRouterTextModel();
  const models = [...DIALOGUE_MODEL_PRESETS];
  if (defaultId && !presetIds().has(defaultId)) {
    models.unshift({
      id: defaultId,
      label: defaultId,
      hint: "Из OPENROUTER_TEXT_MODEL в .env",
    });
  }
  return {models, defaultId, shortsDefaultId: "google/gemini-2.5-pro-preview"};
};

export const resolveDialogueModel = (requested) => {
  const defaultId = getOpenRouterTextModel();
  const trimmed = typeof requested === "string" ? requested.trim() : "";
  if (!trimmed) {
    return defaultId;
  }
  if (presetIds().has(trimmed) || trimmed === defaultId) {
    return trimmed;
  }
  throw new Error(`Модель не в списке для диалогов: ${trimmed}`);
};

export const findDialogueModelLabel = (modelId) => {
  const item = DIALOGUE_MODEL_PRESETS.find((entry) => entry.id === modelId);
  return item?.label ?? modelId;
};
