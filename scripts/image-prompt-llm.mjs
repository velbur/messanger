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
import {
  formatPriorStoryFramesText,
  resolveStoryImageReferences,
} from "./story-image-references.mjs";
import {formatVisualBible, hasStoryVisualBible} from "./story-visual-bible.mjs";
import {getStoryScenes} from "./story-scene-timing.mjs";

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

const buildStorySystemPrompt = ({hasReferences = false, stylePrompt = "", hasCharacters = false, hasVisualBible = false} = {}) => {
  const style = normalizeSpace(stylePrompt);
  return [
    "Ты помогаешь генерировать рисованные сюжетные кадры для вертикального Shorts (9:16, полный экран, переписка поверх или снизу).",
    `Картинка — вертикальная иллюстрация на весь экран (${STORY_IMAGE_ASPECT_RATIO}), не UI чата, без текста на картинке.`,
    style
      ? `Общий стиль всех кадров (обязательно): ${style}`
      : "Стиль: рисованная иллюстрация, сториборд, не фотореализм.",
    "Опиши establishing shot / атмосферу момента истории, как кадр художника-иллюстратора.",
    "Запрещены формулировки «фото», «фотореализм», «снято на камеру», «shot on 35mm», «как в кино».",
    "Визуальная преемственность внутри одной истории обязательна:",
    "- Повторяющиеся объекты (машины, одежда, мебель, животные) сохраняют цвет, форму и ключевые детали между кадрами.",
    "- Меняй объект только если переписка явно описывает изменение (покраска, покупка, переодевание).",
    "- Если в предыдущем кадре машина зелёная — в новом она зелёная, пока история не говорит обратное.",
    hasVisualBible
      ? "- Есть visual bible — следуй ему как главному источнику фиксированных деталей."
      : "",
    hasReferences
      ? "- Есть предыдущие story-кадры: сохраняй интерьер, персонажей, объекты и палитру; в imagePrompt явно укажи, что повторяется с предыдущих кадров."
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

const buildStoryFramePromptContext = async ({
  conversation,
  messageIndex = null,
  kind = "message",
  stylePrompt = "",
}) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const style =
    normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());
  const characterBible = formatCharacterBible(conversation);
  const visualBible = formatVisualBible(conversation);
  const hasCharacters = hasStoryCharacters(conversation);
  const refs = await resolveStoryImageReferences(conversation, {messageIndex, kind});
  const priorText = formatPriorStoryFramesText(refs.priorFrames, refs.referenceImages);

  const dialogueIndex =
    kind === "opening"
      ? Math.min(2, Math.max(0, messages.length - 1))
      : messageIndex;
  const dialogue = buildFullDialogueTranscriptForLlm(messages, dialogueIndex ?? 0, contactName);

  const userText = [
    `Контакт: ${contactName}`,
    kind === "opening"
      ? "Цель: establishing shot до начала переписки"
      : `Целевое сообщение №${(messageIndex ?? 0) + 1}`,
    characterBible ? `Справочник героев (внешность фиксирована):\n${characterBible}` : "",
    visualBible ? `Visual bible (объекты, цвета, локации — фиксированы):\n${visualBible}` : "",
    priorText,
    dialogue.text ? `Контекст переписки:\n${dialogue.text}` : "",
    kind === "opening"
      ? "Опиши рисованный establishing shot для верхней панели 9:16."
      : "Опиши рисованный кадр сцены для верхней панели в момент этого сообщения.",
    hasCharacters && kind !== "opening"
      ? "Включай описание внешности только для героев, которые реально видны в кадре."
      : hasCharacters && kind === "opening"
        ? "Обычно в opening нет крупных планов лиц — покажи место и настроение; charactersInFrame чаще всего []."
        : "",
    refs.referenceImages.length
      ? "Ниже — предыдущие story-кадры в хронологическом порядке (сохраняй преемственность)."
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
    const label =
      ref.kind === "opening"
        ? "↑ Story opening"
        : `↑ Story-кадр к сообщению №${ref.messageIndex + 1}`;
    userContent.push({
      type: "text",
      text: `${label}${ref.imagePrompt ? `: «${ref.imagePrompt.slice(0, 180)}»` : ""}`,
    });
  }

  return {
    style,
    refs,
    userContent,
    hasCharacters,
    hasVisualBible: hasStoryVisualBible(conversation),
    dialogue,
  };
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
  const {refs, userContent, hasCharacters, hasVisualBible} = await buildStoryFramePromptContext({
    conversation,
    kind: "opening",
    stylePrompt: style,
  });
  const {data, model} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: buildStorySystemPrompt({
          hasReferences: refs.hasReferences,
          stylePrompt: style,
          hasCharacters,
          hasVisualBible,
        }),
      },
      {role: "user", content: userContent},
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
    imageReferences: refs,
  };
};

const llmStoryMessagePrompt = async (conversation, messageIndex, style) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения для story-кадра");
  }
  const {refs, userContent, hasCharacters, hasVisualBible} = await buildStoryFramePromptContext({
    conversation,
    messageIndex,
    kind: "message",
    stylePrompt: style,
  });
  const {data, model} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: buildStorySystemPrompt({
          hasReferences: refs.hasReferences,
          stylePrompt: style,
          hasCharacters,
          hasVisualBible,
        }),
      },
      {role: "user", content: userContent},
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
    imageReferences: refs,
  };
};

const buildSceneDialogueExcerpt = (conversation, scene) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";
  const from = Math.max(0, scene.messageFrom ?? scene.anchorMessageIndex ?? 0);
  const to = Math.min(messages.length - 1, scene.messageTo ?? scene.anchorMessageIndex ?? from);

  return messages
    .slice(from, to + 1)
    .map((message, offset) => {
      const index = from + offset;
      const who = message.author === "me" ? myName : contactName;
      return `${index}. ${who}: ${normalizeSpace(message.text)}`;
    })
    .join("\n");
};

const buildStoryScenePromptContext = async ({
  conversation,
  sceneIndex,
  stylePrompt = "",
}) => {
  const scenes = getStoryScenes(conversation);
  const scene = scenes[sceneIndex];
  if (!scene) {
    throw new Error("Некорректный индекс story-сцены");
  }

  const contactName = conversation?.contactName?.trim() || "Собеседник";
  const style =
    normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());
  const characterBible = formatCharacterBible(conversation);
  const visualBible = formatVisualBible(conversation);
  const hasCharacters = hasStoryCharacters(conversation);
  const refs = await resolveStoryImageReferences(conversation, {sceneIndex, kind: "scene"});
  const priorText = formatPriorStoryFramesText(refs.priorFrames, refs.referenceImages);
  const excerpt = buildSceneDialogueExcerpt(conversation, scene);
  const durationHint =
    scene.estimatedStartMs != null && scene.estimatedEndMs != null
      ? `Окно ~${((scene.estimatedEndMs - scene.estimatedStartMs) / 1000).toFixed(1)} с`
      : "Окно ~4–6 с";

  const userText = [
    `Контакт: ${contactName}`,
    `Сцена ${sceneIndex + 1} (${scene.id}): ${durationHint}`,
    `Смысловая нагрузка (beat): ${scene.beat}`,
    characterBible ? `Справочник героев:\n${characterBible}` : "",
    visualBible ? `Visual bible:\n${visualBible}` : "",
    priorText,
    excerpt ? `Реплики этой сцены (сообщения ${scene.messageFrom}–${scene.messageTo}):\n${excerpt}` : "",
    "Опиши один рисованный кадр 9:16 для всего смыслового блока (~4–6 с), не для одной реплики.",
    hasCharacters
      ? "Включай внешность только для героев, видимых в кадре."
      : "",
    refs.referenceImages.length
      ? "Ниже — предыдущие story-кадры (сохраняй преемственность)."
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
    const label =
      ref.kind === "opening"
        ? "↑ Story opening"
        : ref.kind === "scene"
          ? `↑ Story-сцена ${(ref.sceneIndex ?? 0) + 1}`
          : `↑ Story-кадр к сообщению №${(ref.messageIndex ?? 0) + 1}`;
    userContent.push({
      type: "text",
      text: `${label}${ref.imagePrompt ? `: «${ref.imagePrompt.slice(0, 180)}»` : ""}`,
    });
  }

  return {style, refs, userContent, hasCharacters, hasVisualBible: hasStoryVisualBible(conversation), scene};
};

const llmStoryScenePrompt = async (conversation, sceneIndex, style) => {
  const {refs, userContent, hasCharacters, hasVisualBible, scene} =
    await buildStoryScenePromptContext({conversation, sceneIndex, stylePrompt: style});

  const {data, model} = await openRouterChatJson({
    messages: [
      {
        role: "system",
        content: buildStorySystemPrompt({
          hasReferences: refs.hasReferences,
          stylePrompt: style,
          hasCharacters,
          hasVisualBible,
        }),
      },
      {role: "user", content: userContent},
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
    imageReferences: refs,
    beat: scene.beat,
  };
};

export const resolveStoryScenePrompts = async ({
  conversation,
  sceneIndex,
  stylePrompt,
}) => {
  const scenes = getStoryScenes(conversation);
  const scene = scenes[sceneIndex];
  if (!scene) {
    throw new Error("Некорректный индекс story-сцены");
  }

  const style = normalizeSpace(stylePrompt) || normalizeSpace(await readStoryStylePrompt());
  const manual = normalizeSpace(scene.imagePrompt);
  if (manual) {
    return {imagePrompt: manual, promptSource: "manual", imageReferences: null, beat: scene.beat};
  }

  if (isOpenRouterConfigured()) {
    return llmStoryScenePrompt(conversation, sceneIndex, style);
  }

  const refs = await resolveStoryImageReferences(conversation, {sceneIndex, kind: "scene"});
  const priorText = formatPriorStoryFramesText(refs.priorFrames, refs.referenceImages);
  const visualBible = formatVisualBible(conversation);
  const imagePrompt = [
    `Рисованная иллюстрация: ${scene.beat}`,
    visualBible ? `Visual bible: ${visualBible}` : "",
    priorText,
    style ? `Стиль: ${style}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {imagePrompt, promptSource: "heuristic", imageReferences: refs, beat: scene.beat};
};

export const suggestStoryImagePrompt = async ({
  conversation,
  messageIndex = null,
  sceneIndex = null,
  stylePrompt,
  kind,
  force = false,
}) => {
  const resolvedKind =
    kind ?? (sceneIndex != null ? "scene" : messageIndex == null ? "opening" : "message");
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

  if (resolvedKind === "scene") {
    if (sceneIndex == null || sceneIndex < 0) {
      throw new Error("Укажите sceneIndex для story-сцены");
    }
    const scenes = getStoryScenes(conversation);
    const manual = normalizeSpace(scenes[sceneIndex]?.imagePrompt);
    if (manual && !force) {
      return {imagePrompt: manual, promptSource: "manual", skippedLlm: true, imageReferences: null};
    }
    if (!isOpenRouterConfigured()) {
      throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY)");
    }
    return llmStoryScenePrompt(conversation, sceneIndex, style);
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

    if (isOpenRouterConfigured()) {
      return llmStoryOpeningPrompt(conversation, style);
    }

    const contactName = conversation?.contactName?.trim() || "Собеседник";
    const dialogue = buildFullDialogueTranscriptForLlm(
      messages,
      Math.min(2, Math.max(0, messages.length - 1)),
      contactName,
    );
    const visualBible = formatVisualBible(conversation);
    const imagePrompt = [
      "Рисованная establishing-сцена до начала переписки.",
      visualBible ? `Visual bible:\n${visualBible}` : "",
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
  const refs = await resolveStoryImageReferences(conversation, {messageIndex, kind: "message"});
  const priorText = formatPriorStoryFramesText(refs.priorFrames, refs.referenceImages);
  const visualBible = formatVisualBible(conversation);
  return {
    imagePrompt: [
      buildHeuristicScenePrompt({
        stylePrompt: style,
        contactName: conversation?.contactName,
        messages,
        messageIndex,
        sceneOverride: frame.caption,
      }),
      visualBible ? `Visual bible: ${visualBible}` : "",
      priorText,
    ]
      .filter(Boolean)
      .join("\n\n"),
    promptSource: "heuristic",
    imageReferences: refs,
  };
};

export const buildStoryImageGenerationPrompt = ({imagePrompt, stylePrompt, visualBible = ""}) => {
  const style = normalizeSpace(stylePrompt);
  const scene = normalizeSpace(imagePrompt);
  const bible = normalizeSpace(visualBible);
  if (!scene) {
    return "";
  }

  return [
    scene,
    bible ? `Преемственность истории: ${bible}` : "",
    style ? `Стиль: ${style}` : "",
    `Рисованная иллюстрация сцены. Вертикальный формат ${STORY_IMAGE_ASPECT_RATIO} на весь экран, без UI чата и без текста. Запрещены фото, фотореализм и гиперреализм.`,
  ]
    .filter(Boolean)
    .join(" ");
};
