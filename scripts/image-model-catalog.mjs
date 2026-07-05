/** Каталог image-моделей OpenRouter для UI и A/B (compare:images). */
export const IMAGE_MODEL_CATALOG = [
  {
    id: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    scopes: ["chat", "story"],
    hint: "Быстро, ~$0.04/кадр — дефолт",
  },
  {
    id: "google/gemini-3.1-flash-image",
    label: "Gemini 3.1 Flash Image",
    scopes: ["chat", "story"],
    hint: "Новее Flash, быстрее 2.5",
  },
  {
    id: "google/gemini-3-pro-image",
    label: "Gemini 3 Pro Image",
    scopes: ["story"],
    hint: "Лучше консистентность персонажей",
  },
  {
    id: "openai/gpt-5.4-image-2",
    label: "GPT-5.4 Image 2",
    scopes: ["chat", "story"],
    hint: "Выше детализация и рассуждение",
  },
  {
    id: "openai/gpt-5-image-mini",
    label: "GPT-5 Image Mini",
    scopes: ["chat"],
    hint: "Дешевле для чата 4:3",
  },
];

export const modelsForScope = (scope) =>
  IMAGE_MODEL_CATALOG.filter((item) => item.scopes.includes(scope));

export const normalizeImageModelId = (value, {scope, fallback}) => {
  const id = String(value ?? "").trim();
  if (!id) {
    return fallback;
  }
  const known = IMAGE_MODEL_CATALOG.some((item) => item.id === id);
  if (known && scope && !IMAGE_MODEL_CATALOG.find((item) => item.id === id)?.scopes.includes(scope)) {
    return fallback;
  }
  return id;
};
