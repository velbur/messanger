import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {
  resolveImageReferences,
  formatPriorFramesText,
} from "./image-references.mjs";
import {
  buildFrameBrief,
  buildKlingImagePrompt,
  buildFullDialogueTranscriptForLlm,
  readStylePrompt,
  KLING_PROMPT_MAX,
} from "./image-prompt.mjs";
import {chatCompletionJson, isXaiConfigured, getXaiModel} from "./xai-client.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const clampKlingPrompt = (text) => {
  const t = normalizeSpace(text);
  if (t.length <= KLING_PROMPT_MAX) {
    return t;
  }
  return `${t.slice(0, KLING_PROMPT_MAX - 1)}…`;
};

const buildSystemPrompt = ({hasReferences = false, stylePrompt = ""} = {}) => {
  const style = normalizeSpace(stylePrompt);
  return [
    "Ты помогаешь генерировать изображения к сообщениям в переписке (стиль WhatsApp-видео).",
    `Картинка — вложение в пузырь мессенджера (${CHAT_IMAGE_ASPECT_RATIO}, не весь экран Shorts), без UI чата и без текста на картинке.`,
    style
      ? `Общий стиль всех кадров (обязательно): ${style}`
      : "Стиль задаётся в общем промпте проекта.",
    "Тебе дают переписку до целевого сообщения (помечено ← ЦЕЛЕВОЕ СООБЩЕНИЕ) и, если есть, несколько реплик ПОСЛЕ него.",
    "Задача: понять контекст диалога и описать ТОЛЬКО то, что должно быть на фото в момент целевого сообщения.",
    "Реплики после фото — не новые кадры. Учитывай их только если уточняют содержимое целевого кадра (исправление, «имел в виду…», деталь сцены). Игнорируй, если они лишь двигают сюжет дальше.",
    "Правила:",
    "- Следуй смыслу реплик, а не буквальным ассоциациям (пустой вагон — без людей; схема/полоска — не деревья и не пейзаж).",
    "- «Она/он» в чате — из контекста; не рисуй портрет собеседника, если в подписи нет явного «селфи/лицо».",
    "- Если в подписи абстракция или схема — визуализируй её, а не случайный пейзаж.",
    hasReferences
      ? "- Есть предыдущие фото в чате (приложены или перечислены): ОБЯЗАТЕЛЬНО сохраняй тот же вагон/интерьер/персонажей/палитру/стиль. В imagePrompt явно напиши, что повторяется с референса, и что нового в этом кадре. Не меняй тип вагона или обстановку без указания в репликах."
      : "",
    "- imagePrompt: 2–4 предложения на русском, конкретная сцена для художника.",
    `- klingPrompt: один связный промпт на русском для Kling, ≤480 символов: сцена + тот же стиль, ${CHAT_IMAGE_ASPECT_RATIO}, без UI.`,
    'Ответ строго JSON: {"imagePrompt":"...","klingPrompt":"..."}',
  ]
    .filter(Boolean)
    .join("\n");
};

/**
 * Grok формирует imagePrompt и klingPrompt по полной переписке.
 */
export const suggestImagePromptWithGrok = async ({
  conversation,
  messageIndex,
  stylePrompt,
}) => {
  if (!isXaiConfigured()) {
    throw new Error("Grok API не настроен (XAI_API_KEY)");
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения");
  }

  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const message = messages[messageIndex];
  const frame = buildFrameBrief({message, messageIndex, messages, contactName});
  const dialogue = buildFullDialogueTranscriptForLlm(messages, messageIndex, contactName);
  const refs = await resolveImageReferences(messages, messageIndex);
  const style =
    normalizeSpace(stylePrompt) || normalizeSpace(await readStylePrompt());

  const who = message.author === "me" ? "Я" : contactName;
  const caption = frame.caption || "—";
  const mustNot = frame.mustNotShow?.join("; ") || "—";

  const priorText = formatPriorFramesText(refs.priorFrames, refs.referenceImages);

  const userText = [
    `Контакт в шапке чата: ${contactName}`,
    `Целевое сообщение: №${messageIndex + 1}, автор: ${who}`,
    `Подпись к фото (text): ${caption}`,
    `Не рисовать (подсказка): ${mustNot}`,
    `Общий стиль проекта: ${style}`,
    priorText,
    dialogue.truncated
      ? `Переписка до целевого (${dialogue.messageCount} реплик, в запросе последние ${dialogue.linesIncluded}):`
      : `Переписка до целевого сообщения (${dialogue.messageCount} реплик):`,
    dialogue.text,
    dialogue.hasFutureContext
      ? [
          dialogue.futureTruncated
            ? `Последующие реплики (${dialogue.futureMessageCount}, показано ${dialogue.futureLinesIncluded}; учитывай только уточняющие):`
            : `Последующие реплики (${dialogue.futureMessageCount}; учитывай только если уточняют целевой кадр):`,
          dialogue.futureText,
        ].join("\n")
      : "",
    refs.referenceImages.length
      ? "Ниже — изображения предыдущих кадров в хронологическом порядке (последнее ближе к целевому моменту)."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userContent = [{type: "text", text: userText}];
  for (const ref of refs.referenceImages) {
    userContent.push({
      type: "image_url",
      image_url: {url: ref.dataUrl, detail: "low"},
    });
    userContent.push({
      type: "text",
      text: `↑ Фото к сообщению №${ref.messageIndex + 1}${ref.caption ? `: «${ref.caption.slice(0, 200)}»` : ""}`,
    });
  }

  const {data, model} = await chatCompletionJson({
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          hasReferences: refs.hasReferences,
          stylePrompt: style,
        }),
      },
      {role: "user", content: userContent},
    ],
    temperature: 0.25,
    maxTokens: 1200,
  });

  const imagePrompt = normalizeSpace(data?.imagePrompt);
  let klingPrompt = normalizeSpace(data?.klingPrompt);

  if (!imagePrompt) {
    throw new Error("Grok не вернул imagePrompt");
  }
  if (!klingPrompt) {
    klingPrompt = buildKlingImagePrompt({
      stylePrompt: style,
      contactName: conversation?.contactName,
      messages,
      messageIndex,
      sceneOverride: imagePrompt,
    });
  } else {
    klingPrompt = clampKlingPrompt(klingPrompt);
  }

  return {
    imagePrompt,
    klingPrompt,
    grokModel: model ?? getXaiModel(),
    dialogueMessageCount: dialogue.messageCount,
    dialogueTruncated: dialogue.truncated,
    futureMessageCount: dialogue.futureMessageCount,
    futureContextIncluded: dialogue.hasFutureContext,
    imageReferences: refs,
  };
};

/**
 * Сцена для Kling: ручной imagePrompt → иначе Grok → иначе эвристика в buildKlingImagePrompt.
 */
export const resolveFramePrompts = async ({
  conversation,
  messageIndex,
  stylePrompt,
  useGrok = true,
}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const message = messages[messageIndex];
  const style = normalizeSpace(stylePrompt);
  const frame = buildFrameBrief({
    message,
    messageIndex,
    messages,
    contactName: conversation?.contactName,
  });

  const manualPrompt = frame.customPrompt;
  if (manualPrompt) {
    const klingPrompt = buildKlingImagePrompt({
      stylePrompt: style,
      contactName: conversation?.contactName,
      messages,
      messageIndex,
      sceneOverride: manualPrompt,
    });
    const imageReferences = await resolveImageReferences(messages, messageIndex);
    return {
      frame,
      imagePrompt: manualPrompt,
      klingPrompt,
      grokUsed: false,
      promptSource: "manual",
      imageReferences,
    };
  }

  const imageReferences = await resolveImageReferences(messages, messageIndex);

  if (useGrok && isXaiConfigured()) {
    const grok = await suggestImagePromptWithGrok({
      conversation,
      messageIndex,
      stylePrompt: style,
    });
    return {
      frame,
      imagePrompt: grok.imagePrompt,
      klingPrompt: grok.klingPrompt,
      grokUsed: true,
      promptSource: "grok",
      grokModel: grok.grokModel,
      dialogueMessageCount: grok.dialogueMessageCount,
      dialogueTruncated: grok.dialogueTruncated,
      imageReferences: grok.imageReferences ?? imageReferences,
    };
  }

  const klingPrompt = buildKlingImagePrompt({
    stylePrompt: style,
    contactName: conversation?.contactName,
    messages,
    messageIndex,
  });

  return {
    frame,
    imagePrompt: null,
    klingPrompt,
    grokUsed: false,
    promptSource: "heuristic",
    imageReferences,
  };
};

/**
 * Промпт для API генерации картинки (Grok Imagine — без лимита 500 символов Kling).
 */
export const buildImageGenerationPrompt = ({
  imagePrompt,
  klingPrompt,
  stylePrompt,
  provider = "kling",
}) => {
  const style = normalizeSpace(stylePrompt);
  const scene = normalizeSpace(imagePrompt) || normalizeSpace(klingPrompt);
  if (!scene) {
    return "";
  }

  if (provider === "grok") {
    const parts = [
      scene,
      style ? `Стиль: ${style}` : "",
      `Формат ${CHAT_IMAGE_ASPECT_RATIO}, вложение в чат, одна сцена, без UI чата и без текста на картинке.`,
    ].filter(Boolean);
    return parts.join(" ");
  }

  const compact = scene.length > 480 ? `${scene.slice(0, 479)}…` : scene;
  return compact;
};
