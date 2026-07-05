import {
  buildStoryMotionPrompt,
  describeMotionPromptMode,
  imagePromptLikelyHasPeople,
  isStrictI2vMotionProvider,
} from "./story-motion-prompt.mjs";
import {buildFullDialogueTranscriptForLlm} from "./image-prompt.mjs";
import {formatCharacterBible} from "./story-characters.mjs";
import {formatVisualBible, hasStoryVisualBible} from "./story-visual-bible.mjs";
import {
  collectPriorStoryFrames,
  formatPriorStoryFramesText,
} from "./story-image-references.mjs";
import {chatCompletionJson as openRouterChatJson, isOpenRouterConfigured} from "./openrouter-client.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const dialogueIndexForTarget = (conversation, target) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (target.kind === "opening") {
    return Math.min(2, Math.max(0, messages.length - 1));
  }
  return target.messageIndex;
};

const buildVideoMotionSystemPrompt = (provider = "veo") => {
  const strict = isStrictI2vMotionProvider(provider);
  return [
    strict
      ? "Ты режиссёр короткой I2V-анимации для рисованного story-кадра (image-to-video, 2–4 секунды)."
      : "Ты режиссёр короткой анимации story-кадра для Veo (image-to-video, 4–8 секунд).",
    "По контексту истории опиши ТОЛЬКО движение в кадре: камера, свет, атмосфера, действия персонажей и предметов.",
    strict
      ? "Люди в кадре — только ambient (дым, дождь, свет); тела и конечности заморожены, если не сказано иначе в реплике."
      : "Если в кадре люди — допускай естественные жесты, мимику и мелкие действия по смыслу реплики; без резких смен позы и без «летающих» тел.",
    "Не пересказывай всю сцену — исходный кадр уже нарисован; опиши как он «оживает».",
    "Без текста, UI, субтитров. Без резкой смены локации или появления новых объектов.",
    "Ответ строго JSON: {\"motionPrompt\":\"...\"} — 1–3 предложения на английском для video model.",
  ].join("\n");
};

/**
 * @param {object} conversation
 * @param {{ kind: string, messageIndex: number, imagePrompt?: string, label: string, caption?: string }} target
 * @param {{ loop?: boolean, force?: boolean, provider?: string }} options
 */
export const resolveStoryVideoMotionPrompt = async (
  conversation,
  target,
  {loop = false, force = false, provider = "veo"} = {},
) => {
  const holder = target.holder ?? {};
  const manual = normalizeSpace(holder.storyVideoPrompt);
  if (manual && !force) {
    return {
      motionPrompt: manual,
      promptSource: "manual",
      motionMode: describeMotionPromptMode(target.imagePrompt, {loop, provider}),
    };
  }

  const imagePrompt = normalizeSpace(target.imagePrompt);
  const fallback = buildStoryMotionPrompt(imagePrompt, {loop, provider});
  const motionMode = describeMotionPromptMode(imagePrompt, {loop, provider});

  if (!isOpenRouterConfigured()) {
    return {motionPrompt: fallback, promptSource: "heuristic", motionMode};
  }

  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const dialogue = buildFullDialogueTranscriptForLlm(
    conversation?.messages ?? [],
    dialogueIndexForTarget(conversation, target),
    contactName,
  );
  const visualBible = formatVisualBible(conversation);
  const characterBible = formatCharacterBible(conversation);
  const priorFrames = collectPriorStoryFrames(conversation, {
    messageIndex: target.kind === "opening" ? null : target.messageIndex,
    kind: target.kind === "opening" ? "opening" : "message",
  });
  const priorText = formatPriorStoryFramesText(priorFrames, []);
  const strict = isStrictI2vMotionProvider(provider);

  const {data, model} = await openRouterChatJson({
    messages: [
      {role: "system", content: buildVideoMotionSystemPrompt(provider)},
      {
        role: "user",
        content: [
          `Сцена: ${target.label}`,
          imagePrompt ? `Описание кадра (уже нарисован): ${imagePrompt}` : "",
          visualBible ? `Visual bible (преемственность):\n${visualBible}` : "",
          characterBible ? `Герои:\n${characterBible}` : "",
          priorText,
          dialogue.text ? `Контекст переписки:\n${dialogue.text}` : "",
          loop
            ? "Нужен бесшовный loop: финальный кадр ≈ первый."
            : strict
              ? "Один короткий проход 2–4 с, финальный кадр спокойный для hold."
              : "Один проход 4–8 с, финальный кадр спокойный для hold.",
          strict && motionMode === "ambient-only-people"
            ? "В кадре есть люди — только ambient-движение, без движения тел."
            : "",
          "Сформируй motionPrompt для I2V.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  const motionPrompt = normalizeSpace(data?.motionPrompt);
  if (!motionPrompt) {
    return {motionPrompt: fallback, promptSource: "heuristic", motionMode, llmModel: model};
  }

  return {
    motionPrompt,
    promptSource: "openrouter",
    motionMode,
    llmModel: model,
    usedVisualBible: hasStoryVisualBible(conversation),
  };
};

export {buildStoryMotionPrompt, describeMotionPromptMode, imagePromptLikelyHasPeople};
