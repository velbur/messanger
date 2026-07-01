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
import {
  appendSceneCharacterAppearances,
  formatCharacterBible,
  hasStoryCharacters,
} from "./story-characters.mjs";

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
    `Формат ${CHAT_IMAGE_ASPECT_RATIO}, рисованная иллюстрация-вложение в чат, одна сцена, без UI чата и без текста. Не фото, не фотореализм.`,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildStorySystemPrompt = ({hasReferences = false, stylePrompt = "", hasCharacters = false} = {}) => {
  const style = normalizeSpace(stylePrompt);
  return [
    "Ты помогаешь генерировать рисованные сюжетные кадры для вертикального Shorts (9:16, полный экран, переписка поверх или снизу).",
    `Картинка — вертикальная иллюстрация на весь экран (${STORY_IMAGE_ASPECT_RATIO}), не UI чата, без текста на картинке.`,
    style
      ? `Общий стиль всех кадров (обязательно): ${style}`
      : "Стиль: рисованная иллюстрация, сториборд, не фотореализм.",
    "Опиши establishing shot / атмосферу момента истории, как кадр художника-иллюстратора.",
    "Запрещены формулировки «фото», «фотореализм», «снято на камеру», «shot on 35mm», «как в кино».",
    hasReferences
      ? "- Есть предыдущие кадры сюжета: сохраняй интерьер, персонажей и палитру."
      : "",
    hasCharacters
      ? [
          "- Есть справочник героев с фиксированной внешностью.",
          "- Если герой виден в кадре — вставь его внешность из справочника дословно (возраст, волосы, лицо, одежда).",
          "- Если кадр только предмет, улица, интерьер без людей — не описывай внешность героев.",
          "- charactersInFrame: массив id героев, которые реально видны в кадре; [] если людей нет.",
        ].join("\n")
      : "",
    "- imagePrompt: 2–4 предложения на русском, конкретная сцена для иллюстратора.",
    hasCharacters
      ? 'Ответ строго JSON: {"imagePrompt":"...","charactersInFrame":["me"]}'
      : 'Ответ строго JSON: {"imagePrompt":"..."}',
  ]
    .filter(Boolean)
    .join("\n");
};

const parseStoryLlmResponse = (data, conversation) => {
  const imagePrompt = normalizeSpace(data?.imagePrompt);
  if (!imagePrompt) {
    throw new Error("LLM не вернул story imagePrompt");
  }
  const rawIds = Array.isArray(data?.charactersInFrame) ? data.charactersInFrame : [];
  const charactersInFrame = rawIds.map((id) => normalizeSpace(id)).filter(Boolean);
  const enrichedPrompt = appendSceneCharacterAppearances(imagePrompt, conversation, charactersInFrame);
  return {imagePrompt: enrichedPrompt, charactersInFrame};
};

const llmStoryOpeningPrompt = async (conversation, style) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const dialogue = buildFullDialogueTranscriptForLlm(
    messages,
    Math.min(2, Math.max(0, messages.length - 1)),
    contactName,
  );
  const characterBible = formatCharacterBible(conversation);
  const hasCharacters = hasStoryCharacters(conversation);
  const {data, model} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: buildStorySystemPrompt({stylePrompt: style, hasCharacters}),
      },
      {
        role: "user",
        content: [
          `Контакт: ${contactName}`,
          "Цель: establishing shot до начала переписки",
          characterBible ? `Справочник героев:\n${characterBible}` : "",
          dialogue.text ? `Контекст будущей переписки:\n${dialogue.text}` : "",
          "Опиши рисованный establishing shot для верхней панели 9:16.",
          hasCharacters
            ? "Обычно в opening нет крупных планов лиц — покажи место и настроение; charactersInFrame чаще всего []."
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.25,
    maxTokens: 1200,
  });
  const parsed = parseStoryLlmResponse(data, conversation);
  return {
    imagePrompt: parsed.imagePrompt,
    charactersInFrame: parsed.charactersInFrame,
    promptSource: "openrouter",
    llmModel: model,
    imageReferences: null,
  };
};

const llmStoryMessagePrompt = async (conversation, messageIndex, style) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения для story-кадра");
  }
  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const dialogue = buildFullDialogueTranscriptForLlm(messages, messageIndex, contactName);
  const characterBible = formatCharacterBible(conversation);
  const hasCharacters = hasStoryCharacters(conversation);
  const {data, model} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: buildStorySystemPrompt({stylePrompt: style, hasCharacters}),
      },
      {
        role: "user",
        content: [
          `Контакт: ${contactName}`,
          `Целевое сообщение №${messageIndex + 1}`,
          characterBible ? `Справочник героев (внешность фиксирована):\n${characterBible}` : "",
          dialogue.text,
          "Опиши рисованный кадр сцены для верхней панели в момент этого сообщения.",
          hasCharacters
            ? "Включай описание внешности только для героев, которые реально видны в кадре."
            : "",
        ].join("\n\n"),
      },
    ],
    temperature: 0.25,
    maxTokens: 1200,
  });
  const parsed = parseStoryLlmResponse(data, conversation);
  return {
    imagePrompt: parsed.imagePrompt,
    charactersInFrame: parsed.charactersInFrame,
    promptSource: "openrouter",
    llmModel: model,
    imageReferences: null,
  };
};

export const suggestStoryImagePrompt = async ({
  conversation,
  messageIndex = null,
  stylePrompt,
  kind,
  force = false,
}) => {
  const resolvedKind = kind ?? (messageIndex == null ? "opening" : "message");
  const style = normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());

  if (resolvedKind === "opening") {
    const manual = normalizeSpace(conversation?.story?.opening?.imagePrompt);
    if (manual && !force) {
      return {imagePrompt: manual, promptSource: "manual", skippedLlm: true, imageReferences: null};
    }
    if (!isOpenRouterConfigured()) {
      throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
    }
    return llmStoryOpeningPrompt(conversation, style);
  }

  if (messageIndex == null || messageIndex < 0) {
    throw new Error("Укажите messageIndex для story-кадра сообщения");
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const manual = normalizeSpace(messages[messageIndex]?.storyImagePrompt);
  if (manual && !force) {
    return {imagePrompt: manual, promptSource: "manual", skippedLlm: true, imageReferences: null};
  }
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
  }
  return llmStoryMessagePrompt(conversation, messageIndex, style);
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
    return llmStoryMessagePrompt(conversation, messageIndex, style);
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
    `Рисованная иллюстрация сцены. Вертикальный формат ${STORY_IMAGE_ASPECT_RATIO} на весь экран, без UI чата и без текста. Запрещены фото, фотореализм и гиперреализм.`,
  ]
    .filter(Boolean)
    .join(" ");
};
