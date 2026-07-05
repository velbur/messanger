/** Wan / local-gpu I2V: люди «летают» — только ambient. Veo: полная анимация по сцене. */
export const isStrictI2vMotionProvider = (provider) =>
  String(provider ?? "")
    .trim()
    .toLowerCase() === "local-gpu";

const LOOP_MOTION_PROMPT_STRICT =
  "Очень тонкое ambient-движение, формирующее бесшовный loop: финальный кадр визуально совпадает с первым (та же поза, свет, дым, дождь). Только крошечные циклические эффекты — «дыхание» света, мерцание, лёгкое покачивание. Все люди заморожены, ноги на земле. Никакого движения камеры, зума или дрейфа.";

const HOLD_MOTION_PROMPT_STRICT =
  "Короткое тонкое движение (2–4 с): только мягкие ambient-эффекты (смещение света, дымка, дождь, дым, колыхание штор). Все фигуры полностью заморожены — ноги на земле, без движения конечностей и головы. Финал — спокойная поза для hold. Без движения камеры, зума, панорамы или дрейфа.";

const AMBIENT_ONLY_MOTION_PROMPT =
  "Очень тонкое ambient-движение (2–4 с): мерцание света, мягкая дымка, лёгкий дождь или дым, колыхание штор. ВСЕ люди и персонажи полностью неподвижны — ноги на земле, замороженная поза, ноль движения тела и конечностей. Без ходьбы, прыжков, полёта, падения или парения. Без движения камеры. Финальный кадр спокойный.";

const LOOP_AMBIENT_ONLY_MOTION_PROMPT =
  "Очень тонкое бесшовное ambient-loop: только мерцание света, дымка, дождь, дым. ВСЕ люди заморожены, ноги на земле, одинаковая поза в начале и конце. Без движения тел, без движения камеры, зума или дрейфа.";

const LOOP_MOTION_PROMPT_VEO =
  "Очень тонкий бесшовный loop для иллюстрированного story-кадра: естественное циклическое движение (свет, атмосфера, мелкие жесты персонажей), финальный кадр совпадает с первым. Тот же стиль и композиция. Без смены сцены и новых объектов.";

const HOLD_MOTION_PROMPT_VEO =
  "Короткое кинематографичное движение (4–8 с) для иллюстрированного story-кадра: естественное движение по смыслу сцены — мимика, жесты, волосы, одежда, атмосфера, свет, окружение. Тот же стиль, персонажи и композиция. Лёгкий дрейф камеры допустим. Финал — спокойный, удерживаемый кадр.";

const NEUTRAL_MOTION_PROMPT_VEO =
  "Очень тонкое ambient-движение (4–8 с): мягкое смещение света, лёгкое движение атмосферы, колыхание штор или дыма. Сохранить иллюстрированный стиль и композицию. Спокойный финальный кадр.";

/** Эвристика: в imagePrompt упоминаются люди/персонажи. */
const PEOPLE_WORDS =
  "человек|люди|мужчина|женщина|девушка|парень|мальчик|девочка|ребёнок|ребенок|мама|папа|муж|жена|сосед|бабушка|дедушка|прохож|геро|персонаж|фигура|силуэт|лицо|руки|ноги|молодой|стоит|сидит|лежит|идёт|идет|бежит|прыгает|толкает|person|people|man|woman|girl|boy|child|character|figure|silhouette|face|standing|sitting|walking|running|jumping|couple|family";

const PEOPLE_IN_SCENE_PATTERN = new RegExp(`(?<![\\p{L}])(?:${PEOPLE_WORDS})(?![\\p{L}])`, "iu");

export const imagePromptLikelyHasPeople = (imagePrompt) =>
  PEOPLE_IN_SCENE_PATTERN.test(String(imagePrompt ?? "").trim());

export const describeMotionPromptMode = (imagePrompt, {loop = false, provider = "veo"} = {}) => {
  const strict = isStrictI2vMotionProvider(provider);
  if (strict && imagePromptLikelyHasPeople(imagePrompt)) {
    return "ambient-only-people";
  }
  const scene = String(imagePrompt ?? "").trim();
  if (!scene) {
    return loop ? "loop-default" : "hold-default";
  }
  return loop ? "loop-with-scene" : "hold-with-scene";
};

export const buildStoryMotionPrompt = (imagePrompt, {loop = false, provider = "veo", neutral = false} = {}) => {
  const strict = isStrictI2vMotionProvider(provider);

  if (neutral) {
    return strict ? AMBIENT_ONLY_MOTION_PROMPT : NEUTRAL_MOTION_PROMPT_VEO;
  }

  if (strict && imagePromptLikelyHasPeople(imagePrompt)) {
    return loop ? LOOP_AMBIENT_ONLY_MOTION_PROMPT : AMBIENT_ONLY_MOTION_PROMPT;
  }

  const prefix = loop
    ? strict
      ? LOOP_MOTION_PROMPT_STRICT
      : LOOP_MOTION_PROMPT_VEO
    : strict
      ? HOLD_MOTION_PROMPT_STRICT
      : HOLD_MOTION_PROMPT_VEO;

  const scene = String(imagePrompt ?? "").trim();
  if (!scene) {
    return prefix;
  }
  return `${prefix} Сцена: ${scene}`;
};
