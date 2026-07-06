/** Каталог story video-моделей для UI (Veo через OpenRouter). */
export const STORY_VIDEO_MODEL_CATALOG = [
  {
    id: "google/veo-3.1-lite",
    label: "Veo 3.1 Lite",
    provider: "veo",
    hint: "Быстрее и дешевле — дефолт",
  },
  {
    id: "google/veo-3.1",
    label: "Veo 3.1",
    provider: "veo",
    hint: "Выше качество motion",
  },
];

export const modelsForVideoProvider = (provider) =>
  STORY_VIDEO_MODEL_CATALOG.filter((item) => item.provider === provider);

export const normalizeStoryVideoModelId = (value, {fallback}) => {
  const id = String(value ?? "").trim();
  if (!id) {
    return fallback;
  }
  return id;
};
