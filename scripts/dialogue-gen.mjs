import {readFile} from "node:fs/promises";
import path from "node:path";
import {parseConversation} from "../src/chat/schema.ts";
import {
  chatCompletionJson as openRouterChatCompletionJson,
  getOpenRouterTextModel,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";

import {seriesContentDir} from "./project-paths.mjs";

const DIALOGUE_MAX_TOKENS = 16_000;

export const isDialogueLlmConfigured = () => isOpenRouterConfigured();

const resolveDialogueLlm = () => {
  if (!isOpenRouterConfigured()) {
    return null;
  }
  return {
    provider: "openrouter",
    model: getOpenRouterTextModel(),
    completeJson: async (options) =>
      openRouterChatCompletionJson({
        ...options,
        maxTokens: options.maxTokens ?? DIALOGUE_MAX_TOKENS,
      }),
  };
};

const DEFAULT_SERIES_ID = "usssr";

const readOptionalFile = async (filePath) => {
  try {
    return (await readFile(filePath, "utf8")).trim();
  } catch {
    return "";
  }
};

const buildJsonFormatBlock = ({
  withDisplayTitle = false,
  myName = "Алиса",
  fullConversation = false,
} = {}) => {
  const lines = [
    "Формат JSON:",
    "{",
  ];
  if (withDisplayTitle) {
    lines.push(
      '  "displayTitle": "название ролика на русском, 2–7 слов",',
    );
  }
  lines.push(
    '  "contactName": "имя собеседника в шапке чата",',
    '  "contactStatus": "в сети",',
    `  "myName": "${myName}",`,
    '  "wallpaper": "default" | "dark",',
    '  "messages": [',
    "    {",
    '      "author": "me" | "them",',
    '      "text": "текст сообщения",',
    '      "sentAt": "HH:MM"',
    "    },",
    "    {",
    '      "author": "them",',
    '      "imagePrompt": "описание фото для художника",',
    '      "sentAt": "HH:MM"',
    "    },",
  );
  if (fullConversation) {
    lines.push(
      "    /* …продолжай messages: вся переписка от начала до финала,",
      "       столько сообщений, сколько требует задание пользователя… */",
    );
  }
  lines.push("  ]", "}");
  return lines;
};

const buildImageRules = (includeImages, {ussrStyle = false} = {}) => {
  if (includeImages) {
    return [
      "- Для фото-сообщений используй только imagePrompt без text и без image.",
      ussrStyle
        ? "- imagePrompt: 1–3 предложения, что должно быть на фото (бытовая сцена СССР 1984)."
        : "- imagePrompt: 1–3 предложения, что должно быть на фото.",
      ussrStyle
        ? "- Вставляй фото там, где герой присылает доказательство: ценник, улица, еда, билет и т.п."
        : "- Вставляй фото-сообщения там, где это усиливает сюжет по заданию пользователя.",
    ];
  }
  return [
    "- Только текстовые сообщения. Не используй imagePrompt и image.",
    "- Если в сцене нужно фото, герой описывает это словами в text.",
  ];
};

const buildSeriesSystemPrompt = async ({includeImages = true, seriesId = DEFAULT_SERIES_ID} = {}) => {
  const seriesDir = seriesContentDir(seriesId);
  const storyPlan = await readOptionalFile(path.join(seriesDir, "story-plan.md"));
  const literaryEditor = await readOptionalFile(path.join(seriesDir, "literary-editor.md"));

  return [
    "Ты пишешь переписку для генератора видео в стиле WhatsApp.",
    "Это часть большой серии — учитывай общий сюжет и характеры героев.",
    "Ответ — строго один JSON-объект без markdown и пояснений.",
    "",
    ...buildJsonFormatBlock(),
    "",
    "Правила:",
    "- author: me = Алиса (2026), them = Даня (1984) или другое имя контакта.",
    "- Короткие реплики, как в мессенджере. Длинные мысли разбивай на несколько сообщений.",
    "- sentAt — время в формате HH:MM, логично растёт по ходу сцены.",
    ...buildImageRules(includeImages, {ussrStyle: true}),
    "- Не добавляй системные сообщения, третьих персонажей в чате, хоррор и мистику.",
    "- Можно добавить intro, endCard, music только если это явно просит пользователь.",
    "",
    storyPlan ? `План истории:\n${storyPlan}` : "",
    literaryEditor ? `Литературный редактор:\n${literaryEditor}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildShortsSystemPrompt = ({includeImages = true} = {}) =>
  [
    "Ты пишешь самостоятельную переписку для генератора видео в стиле WhatsApp.",
    "Каждый диалог — отдельная история без связи с другими.",
    "Ответ — строго один JSON-объект без markdown и пояснений.",
    "",
    ...buildJsonFormatBlock({withDisplayTitle: true, myName: "Я", fullConversation: true}),
    "",
    "Правила:",
    "- displayTitle: цепляющее название на русском для списка роликов.",
    "- Герои — новые для этой истории. myName — «Я» или имя из задания пользователя.",
    "- contactName — имя собеседника по сюжету; не используй Алису, Даню, СССР и серию «Пока в СССР», если пользователь явно не просит.",
    "- Каждая реплика короткая, как в мессенджере; длинные мысли разбивай на несколько сообщений.",
    "- messages — полная переписка целиком: от первого сообщения до финала сцены.",
    "- Не обрывай историю, пока задание пользователя не выполнено.",
    "- sentAt — время в формате HH:MM, логично растёт по ходу сцены.",
    "- Длину, тон, жанр и финал бери только из задания пользователя.",
    "- Не ссылайся на предыдущие части или другие истории.",
    ...buildImageRules(includeImages, {ussrStyle: false}),
    "- Не добавляй системные сообщения и третьих персонажей в чате.",
    "- Не добавляй intro, endCard, music — только displayTitle и переписку.",
  ].join("\n");

const buildRefineSystemPrompt = async ({
  includeImages = true,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
} = {}) => {
  const base =
    mode === "series"
      ? await buildSeriesSystemPrompt({includeImages, seriesId})
      : buildShortsSystemPrompt({includeImages});

  return [
    base,
    "",
    "Режим доработки:",
    "- Пользователь присылает уже готовую переписку и замечания.",
    "- Верни полный обновлённый JSON переписки с учётом правок.",
    "- Не начинай с нуля: сохраняй удачные реплики и структуру, меняй только то, что просят.",
    "- Если в исходнике есть image или imagePrompt — сохраняй, если пользователь не просит убрать.",
    mode === "shorts"
      ? "- Если в исходнике был displayTitle — сохрани или улучши по смыслу; иначе не добавляй."
      : "",
    mode === "shorts"
      ? "- Не подменяй героев на Алису/Даню и не уводи сюжет в серию «Пока в СССР», если пользователь не просит."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildSystemPrompt = async ({mode = "shorts", includeImages = true, seriesId = DEFAULT_SERIES_ID} = {}) => {
  if (mode === "series") {
    return buildSeriesSystemPrompt({includeImages, seriesId});
  }
  return buildShortsSystemPrompt({includeImages});
};

const buildUserPrompt = ({prompt, previousMessages, includeImages = true, mode = "shorts"}) => {
  const parts = [
    mode === "series"
      ? "Напиши новую часть переписки по этому заданию:"
      : "Напиши самостоятельную переписку по этому заданию:",
    prompt.trim(),
    includeImages
      ? "В переписке должны быть отдельные фото-сообщения с imagePrompt (без text)."
      : "Только текстовые сообщения, без imagePrompt и без image.",
  ];

  if (mode === "series" && Array.isArray(previousMessages) && previousMessages.length > 0) {
    parts.push(
      "",
      "Контекст предыдущих частей серии (учитывай, но не повторяй дословно):",
      JSON.stringify(previousMessages.slice(-30), null, 2),
    );
  }

  if (mode === "shorts") {
    parts.push("", "Не используй контекст из других историй — только это задание.");
    parts.push(
      "Не используй Алису, Даню и сеттинг СССР, если в задании нет прямой отсылки к ним.",
    );
    parts.push("", "Обязательно добавь displayTitle на русском.");
  }

  parts.push("", "Верни только валидный JSON.");
  return parts.join("\n");
};

const buildShortsExpandUserPrompt = ({prompt, conversation, displayTitle, includeImages}) => {
  const draft = displayTitle ? {displayTitle, ...conversation} : conversation;
  return [
    "Задание пользователя:",
    prompt.trim(),
    "",
    "Ниже черновик переписки. Разверни и допиши его до полного завершения сцены по заданию.",
    "Сохрани удачные реплики, добавь развитие, детали, диалог и финал.",
    "Верни полный JSON с полным массивом messages — не обрывай историю на полпути.",
    includeImages
      ? "Можно добавить фото-сообщения с imagePrompt (без text)."
      : "Только текстовые сообщения, без imagePrompt и без image.",
    "",
    "Черновик:",
    JSON.stringify(draft, null, 2),
    "",
    "Верни только полный JSON.",
  ].join("\n");
};

const buildRefineUserPrompt = ({conversation, refinePrompt, includeImages = true}) => {
  const parts = [
    "Доработай текущую переписку по этим замечаниям:",
    refinePrompt.trim(),
    includeImages
      ? "Сохрани или добавь фото-сообщения с imagePrompt там, где это уместно."
      : "Только текстовые сообщения, без imagePrompt и без image.",
    "",
    "Текущая переписка:",
    JSON.stringify(conversation, null, 2),
    "",
    "Верни только полный обновлённый JSON.",
  ];
  return parts.join("\n");
};

const validateConversation = (input) => {
  try {
    return parseConversation(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Невалидный JSON диалога: ${message}`);
  }
};

const parseGeneratedPayload = (data, mode) => {
  if (mode !== "shorts" || !data || typeof data !== "object") {
    return {conversation: validateConversation(data), displayTitle: ""};
  }

  const raw = {...data};
  const displayTitle = String(raw.displayTitle ?? "").trim();
  delete raw.displayTitle;
  const conversation = validateConversation(raw);
  return {conversation, displayTitle};
};

const runChatJsonGeneration = async ({messages, maxAttempts = 3, parseResult, completeJson}) => {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const chatMessages = [...messages];
      if (lastError) {
        chatMessages.push({
          role: "user",
          content: `Предыдущий ответ невалиден: ${lastError}. Исправь и верни только JSON.`,
        });
      }

      const {data, model} = await completeJson({
        messages: chatMessages,
        temperature: 0.45,
        maxTokens: DIALOGUE_MAX_TOKENS,
      });

      const parsed = parseResult(data);
      return {...parsed, model, attempts: attempt + 1};
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError || "Не удалось сгенерировать диалог");
};

const expandShortsDialogue = async ({
  prompt,
  conversation,
  displayTitle,
  includeImages,
  system,
  completeJson,
  maxAttempts,
}) => {
  const user = buildShortsExpandUserPrompt({prompt, conversation, displayTitle, includeImages});
  return runChatJsonGeneration({
    maxAttempts,
    completeJson,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: expanded, displayTitle: expandedTitle} = parseGeneratedPayload(data, "shorts");
      return {conversation: expanded, displayTitle: expandedTitle, mode: "shorts"};
    },
  });
};

export const generateDialogue = async ({
  prompt,
  previousMessages,
  includeImages = true,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm();
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!prompt?.trim()) {
    throw new Error("Промпт диалога обязателен");
  }

  const normalizedMode = mode === "series" ? "series" : "shorts";
  const contextMessages =
    normalizedMode === "series" && Array.isArray(previousMessages) ? previousMessages : undefined;

  const system = await buildSystemPrompt({mode: normalizedMode, includeImages, seriesId});
  const user = buildUserPrompt({
    prompt,
    previousMessages: contextMessages,
    includeImages,
    mode: normalizedMode,
  });

  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation, displayTitle} = parseGeneratedPayload(data, normalizedMode);
      return {conversation, displayTitle, mode: normalizedMode};
    },
  });

  if (normalizedMode !== "shorts") {
    return {...result, provider: llm.provider};
  }

  const draftCount = result.conversation?.messages?.length ?? 0;
  try {
    const expanded = await expandShortsDialogue({
      prompt,
      conversation: result.conversation,
      displayTitle: result.displayTitle,
      includeImages,
      system,
      completeJson: llm.completeJson,
      maxAttempts,
    });
    const expandedCount = expanded.conversation?.messages?.length ?? 0;
    if (expandedCount > draftCount) {
      return {
        ...expanded,
        provider: llm.provider,
        attempts: result.attempts + expanded.attempts,
        expandedFrom: draftCount,
      };
    }
  } catch {
    /* черновик лучше, чем ничего */
  }

  return {...result, provider: llm.provider};
};

export const refineDialogue = async ({
  conversation,
  refinePrompt,
  includeImages = true,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm();
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!refinePrompt?.trim()) {
    throw new Error("Промпт доработки обязателен");
  }
  if (!conversation || typeof conversation !== "object") {
    throw new Error("Текущая переписка обязательна");
  }

  const normalizedMode = mode === "series" ? "series" : "shorts";
  const validated = validateConversation(conversation);
  const system = await buildRefineSystemPrompt({includeImages, mode: normalizedMode, seriesId});
  const user = buildRefineUserPrompt({
    conversation: validated,
    refinePrompt,
    includeImages,
  });

  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: updated, displayTitle} = parseGeneratedPayload(data, normalizedMode);
      return {conversation: updated, displayTitle, mode: normalizedMode};
    },
  });

  return {...result, provider: llm.provider};
};
