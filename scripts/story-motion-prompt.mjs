/** Wan / local-gpu I2V: люди «летают» — только ambient. Veo: полная анимация по сцене. */
export const isStrictI2vMotionProvider = (provider) =>
  String(provider ?? "")
    .trim()
    .toLowerCase() === "local-gpu";

const LOOP_MOTION_PROMPT_STRICT =
  "Very subtle ambient motion that forms a perfect seamless loop: the final frame must be visually identical to the first frame (same pose, light, smoke, rain position). Only tiny cyclical effects — breathing light, flicker, gentle sway. All people frozen still, feet on ground. Absolutely no camera travel, zoom, or drift forward/backward.";

const HOLD_MOTION_PROMPT_STRICT =
  "One short subtle motion (2–4 seconds): gentle ambient effects only (light shift, haze, rain, smoke, curtain sway). All figures remain completely frozen — feet on ground, no limb or head movement. Settle on a stable final pose. No camera move, zoom, pan, or drift. Last frame calm and holdable for a gentle zoom afterward.";

const AMBIENT_ONLY_MOTION_PROMPT =
  "Very subtle ambient motion only (2–4 seconds): light flicker, soft atmospheric haze, gentle rain or smoke drift, curtain sway. ALL people and characters must remain completely still — feet firmly on ground, frozen pose, zero body movement, zero limb motion. No walking, jumping, flying, falling, or floating. No camera movement. Final frame calm and holdable.";

const LOOP_AMBIENT_ONLY_MOTION_PROMPT =
  "Very subtle seamless ambient loop: light flicker, haze, rain, smoke only. ALL people frozen still, feet on ground, identical pose start and end. No body movement, no camera travel, zoom, or drift.";

const LOOP_MOTION_PROMPT_VEO =
  "Very subtle seamless loop for an illustrated story frame: natural cyclical motion (light, atmosphere, small character beats) where the final frame matches the first. Same art style and composition throughout. No scene change or new objects.";

const HOLD_MOTION_PROMPT_VEO =
  "One short cinematic motion (4–8 seconds) for an illustrated story frame: natural movement that fits the scene — expressions, gestures, hair, clothes, atmosphere, light, and environment. Keep the same art style, characters, and composition. Gentle camera drift is ok. End on a calm, holdable final frame.";

const NEUTRAL_MOTION_PROMPT_VEO =
  "Very subtle ambient motion (4–8 seconds): soft light shift, gentle atmospheric movement, curtains or smoke drift. Keep illustrated style and composition. Calm final frame.";

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
  return `${prefix} Scene: ${scene}`;
};
