import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {
  resolveImageReferences,
  formatPriorFramesText,
} from "./image-references.mjs";
import {
  buildFrameBrief,
  buildHeuristicScenePrompt,
  buildFullDialogueTranscriptForLlm,
  readStylePrompt,
  readStoryStylePrompt,
} from "./image-prompt.mjs";
import {
  chatCompletionJson as openRouterChatJson,
  getOpenRouterTextModel,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

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
    "Реплики после фото — не новые кадры. Учитывай их только если уточняют содержимое целевого кадра.",
    "Правила:",
    "- Следуй смыслу реплик, а не буквальным ассоциациям.",
    "- «Она/он» в чате — из контекста; не рисуй портрет собеседника без явного «селфи/лицо».",
    hasReferences
      ? "- Есть предыдущие фото в чате: сохраняй тот же интерьер/персонажей/палитру. В imagePrompt явно напиши, что повторяется с референса."
      : "",
    "- imagePrompt: 2–4 предложения на русском, конкретная сцена для художника.",
    'Ответ строго JSON: {"imagePrompt":"..."}',
  ]
    .filter(Boolean)
    .join("\n");
};

const buildFramePromptContext = async ({conversation, messageIndex, stylePrompt}) => {
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
    `Черновик imagePrompt (если есть): ${normalizeSpace(message.imagePrompt) || "—"}`,
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
            ? `Последующие реплики (${dialogue.futureMessageCount}, показано ${dialogue.futureLinesIncluded}):`
            : `Последующие реплики (${dialogue.futureMessageCount}):`,
          dialogue.futureText,
        ].join("\n")
      : "",
    refs.referenceImages.length
      ? "Ниже — изображения предыдущих кадров в хронологическом порядке."
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

  return {messages, frame, dialogue, refs, style, userContent};
};

export const suggestImagePrompt = async ({conversation, messageIndex, stylePrompt}) => {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
  }

  const {messages, dialogue, refs, style, userContent} = await buildFramePromptContext({
    conversation,
    messageIndex,
    stylePrompt,
  });

  const {data, model} = await openRouterChatJson({
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
  if (!imagePrompt) {
    throw new Error("LLM не вернул imagePrompt");
  }

  return {
    imagePrompt,
    llmModel: model ?? getOpenRouterTextModel(),
    dialogueMessageCount: dialogue.messageCount,
    dialogueTruncated: dialogue.truncated,
    futureMessageCount: dialogue.futureMessageCount,
    futureContextIncluded: dialogue.hasFutureContext,
    imageReferences: refs,
    promptSource: "openrouter",
  };
};

export const resolveFramePrompts = async ({conversation, messageIndex, stylePrompt}) => {
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
    const imageReferences = await resolveImageReferences(messages, messageIndex);
    return {
      frame,
      imagePrompt: manualPrompt,
      promptSource: "manual",
      imageReferences,
    };
  }

  if (isOpenRouterConfigured()) {
    const llm = await suggestImagePrompt({conversation, messageIndex, stylePrompt: style});
    return {
      frame,
      imagePrompt: llm.imagePrompt,
      promptSource: "openrouter",
      llmModel: llm.llmModel,
      dialogueMessageCount: llm.dialogueMessageCount,
      dialogueTruncated: llm.dialogueTruncated,
      imageReferences: llm.imageReferences,
    };
  }

  const imageReferences = await resolveImageReferences(messages, messageIndex);
  const imagePrompt = buildHeuristicScenePrompt({
    stylePrompt: style,
    contactName: conversation?.contactName,
    messages,
    messageIndex,
  });

  return {
    frame,
    imagePrompt,
    promptSource: "heuristic",
    imageReferences,
  };
};

export const buildImageGenerationPrompt = ({imagePrompt, stylePrompt}) => {
  const style = normalizeSpace(stylePrompt);
  const scene = normalizeSpace(imagePrompt);
  if (!scene) {
    return "";
  }

  return [
    scene,
    style ? `Стиль: ${style}` : "",
    `Реалистичное фото с телефона. Формат ${CHAT_IMAGE_ASPECT_RATIO}, вложение в чат, одна сцена, без UI чата и без текста на картинке.`,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildStorySystemPrompt = ({hasReferences = false, stylePrompt = ""} = {}) => {
  const style = normalizeSpace(stylePrompt);
  return [
    "Ты помогаешь генерировать рисованные сюжетные кадры для story-split видео (верхняя панель, переписка снизу).",
    `Картинка — широкая иллюстрация сцены (${STORY_IMAGE_ASPECT_RATIO}), не UI чата, без текста на картинке.`,
    style
      ? `Общий стиль всех кадров (обязательно): ${style}`
      : "Стиль: рисованная иллюстрация, сториборд, не фотореализм.",
    "Опиши establishing shot / атмосферу момента истории, как кадр художника-иллюстратора.",
    "Запрещены формулировки «фото», «фотореализм», «снято на камеру», «как в кино».",
    hasReferences
      ? "- Есть предыдущие кадры сюжета: сохраняй интерьер, персонажей и палитру."
      : "",
    "- imagePrompt: 2–4 предложения на русском, конкретная сцена для иллюстратора.",
    'Ответ строго JSON: {"imagePrompt":"..."}',
  ]
    .filter(Boolean)
    .join("\n");
};

export const resolveStoryFramePrompts = async ({
  conversation,
  messageIndex = null,
  stylePrompt,
  kind = "message",
}) => {
  const style = normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];

  if (kind === "opening") {
    const manual = normalizeSpace(conversation?.story?.opening?.imagePrompt);
    if (manual) {
      return {imagePrompt: manual, promptSource: "manual", imageReferences: null};
    }

    const contactName = conversation?.contactName?.trim() || "Собеседник";
    const dialogue = buildFullDialogueTranscriptForLlm(
      messages,
      Math.min(2, Math.max(0, messages.length - 1)),
      contactName,
    );
    const imagePrompt = [
      "Рисованная establishing-сцена до начала переписки.",
      dialogue.text ? `Контекст будущей переписки:\n${dialogue.text}` : "",
      "Покажи обстановку и настроение иллюстрацией, без UI телефона и без текста на кадре.",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {imagePrompt, promptSource: "heuristic", imageReferences: null};
  }

  if (messageIndex == null || messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения для story-кадра");
  }

  const message = messages[messageIndex];
  const manual = normalizeSpace(message.storyImagePrompt);
  if (manual) {
    return {imagePrompt: manual, promptSource: "manual", imageReferences: null};
  }

  if (isOpenRouterConfigured()) {
    const contactName = conversation?.contactName?.trim() || "Собеседник";
    const dialogue = buildFullDialogueTranscriptForLlm(messages, messageIndex, contactName);
    const {data, model} = await openRouterChatJson({
      messages: [
        {role: "system", content: buildStorySystemPrompt({stylePrompt: style})},
        {
          role: "user",
          content: [
            `Контакт: ${contactName}`,
            `Целевое сообщение №${messageIndex + 1}`,
            dialogue.text,
            "Опиши кинематографичный кадр сцены для верхней панели в момент этого сообщения.",
          ].join("\n\n"),
        },
      ],
      temperature: 0.25,
      maxTokens: 1200,
    });
    const imagePrompt = normalizeSpace(data?.imagePrompt);
    if (!imagePrompt) {
      throw new Error("LLM не вернул story imagePrompt");
    }
    return {imagePrompt, promptSource: "openrouter", llmModel: model, imageReferences: null};
  }

  const frame = buildFrameBrief({message, messageIndex, messages, contactName: conversation?.contactName});
  return {
    imagePrompt: buildHeuristicScenePrompt({
      stylePrompt: style,
      contactName: conversation?.contactName,
      messages,
      messageIndex,
      sceneOverride: frame.caption,
    }),
    promptSource: "heuristic",
    imageReferences: null,
  };
};

export const buildStoryImageGenerationPrompt = ({imagePrompt, stylePrompt}) => {
  const style = normalizeSpace(stylePrompt);
  const scene = normalizeSpace(imagePrompt);
  if (!scene) {
    return "";
  }

  return [
    scene,
    style ? `Стиль: ${style}` : "",
    `Рисованная иллюстрация сцены. Формат ${STORY_IMAGE_ASPECT_RATIO}, широкий план, без UI чата и без текста. Запрещены фото, фотореализм и гиперреализм.`,
  ]
    .filter(Boolean)
    .join(" ");
};
