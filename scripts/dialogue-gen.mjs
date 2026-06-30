import {readFile} from "node:fs/promises";
import path from "node:path";
import {formatConversationValidationError, messageSchema, parseConversation} from "../src/chat/schema.ts";
import {
  chatCompletionJson as openRouterChatCompletionJson,
  isOpenRouterConfigured,
} from "./openrouter-client.mjs";

import {seriesContentDir} from "./project-paths.mjs";
import {
  readPromptFile,
  renderPromptTemplate,
  promptKeyForShortsSystem,
  promptKeyForLogic,
  promptKeyForLogicRules,
} from "./dialogue-prompts.mjs";

export const isStoryVisualLayout = (layout) =>
  layout === "storySplit" || layout === "storyOverlay";

export const isVideoContentLayout = (layout) => layout === "video";

const normalizeContentMode = (mode) => {
  if (mode === "series") {
    return "series";
  }
  if (mode === "video") {
    return "video";
  }
  return "shorts";
};

const normalizeVideoLayout = (layout) =>
  isStoryVisualLayout(layout) ? layout : "chat";
import {resolveDialogueModel} from "./openrouter-dialogue-models.mjs";

const DIALOGUE_MAX_TOKENS = 16_000;

export const isDialogueLlmConfigured = () => isOpenRouterConfigured();

const resolveDialogueLlm = (model) => {
  if (!isOpenRouterConfigured()) {
    return null;
  }
  const resolvedModel = resolveDialogueModel(model);
  return {
    provider: "openrouter",
    model: resolvedModel,
    completeJson: async (options) =>
      openRouterChatCompletionJson({
        ...options,
        model: options.model ?? resolvedModel,
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
  language = "ru",
  withStoryVisual = false,
  storyLayout = "storyOverlay",
  withVideoLayout = false,
  videoTextMode = "narration",
} = {}) => {
  const resolvedMyName =
    language === "en" && (myName === "Алиса" || myName === "Я") ? "Me" : myName;

  if (language === "en") {
    const lines = ["JSON format:", "{"];
    if (withDisplayTitle) {
      lines.push('  "displayTitle": "catchy video title in English, 2–7 words",');
    }
    lines.push(
      '  "contactName": "contact name in chat header",',
      `  "myName": "${resolvedMyName}",`,
      '  "wallpaper": "default" | "dark",',
    );
    if (withVideoLayout) {
      lines.push('  "layout": "video",');
      lines.push(
        `  "video": { "textMode": "${videoTextMode === "chat" ? "chat" : "narration"}" },`,
      );
    } else if (withStoryVisual) {
      lines.push(`  "layout": "${storyLayout}",`);
      lines.push('  "story": {');
      lines.push('    "opening": {');
      lines.push('      "imagePrompt": "illustrated establishing scene before the chat starts"');
      lines.push("    }");
      lines.push("  },");
    }
    lines.push(
      '  "messages": [',
      "    {",
      '      "author": "me" | "them",',
      '      "text": "message text",',
      '      "sentAt": "HH:MM"',
      "    },",
    );
    if (withStoryVisual) {
      lines.push(
        "    {",
        '      "author": "them",',
        '      "text": "plot turn line",',
        '      "storyImagePrompt": "illustrated scene for the top panel at this beat",',
        '      "sentAt": "HH:MM"',
        "    },",
      );
    } else if (!withStoryVisual) {
      lines.push(
        "    {",
        '      "author": "them",',
        '      "imagePrompt": "photo description for the artist",',
        '      "sentAt": "HH:MM"',
        "    },",
      );
    }
    if (fullConversation) {
      lines.push(
        "    /* …continue messages: full chat from start to finish,",
        "       as many messages as the user brief requires… */",
      );
    }
    lines.push("  ]", "}");
    return lines;
  }

  const lines = ["Формат JSON:", "{"];
  if (withDisplayTitle) {
    lines.push('  "displayTitle": "название ролика на русском, 2–7 слов",');
  }
  lines.push(
    '  "contactName": "имя собеседника в шапке чата",',
    `  "myName": "${resolvedMyName}",`,
    '  "wallpaper": "default" | "dark",',
  );
  if (withVideoLayout) {
    lines.push('  "layout": "video",');
    lines.push(
      `  "video": { "textMode": "${videoTextMode === "chat" ? "chat" : "narration"}" },`,
    );
  } else if (withStoryVisual) {
    lines.push(`  "layout": "${storyLayout}",`);
    lines.push('  "story": {');
    lines.push('    "opening": {');
    lines.push('      "imagePrompt": "рисованный establishing shot до начала переписки"');
    lines.push("    }");
    lines.push("  },");
  }
  lines.push(
    '  "messages": [',
    "    {",
    '      "author": "me" | "them",',
    '      "text": "текст сообщения",',
    '      "sentAt": "HH:MM"',
    "    },",
  );
  if (withStoryVisual) {
    lines.push(
      "    {",
      '      "author": "them",',
      '      "text": "реплика на повороте сюжета",',
      '      "storyImagePrompt": "рисованный кадр для верхней панели в этот момент",',
      '      "sentAt": "HH:MM"',
      "    },",
    );
  } else if (!withStoryVisual) {
    lines.push(
      "    {",
      '      "author": "them",',
      '      "imagePrompt": "описание фото для художника",',
      '      "sentAt": "HH:MM"',
      "    },",
    );
  }
  if (fullConversation) {
    lines.push(
      "    /* …продолжай messages: вся переписка от начала до финала,",
      "       столько сообщений, сколько требует задание пользователя… */",
    );
  }
  lines.push("  ]", "}");
  return lines;
};

const buildEmojiRules = (language = "ru") => {
  const noSkullRule =
    language === "en"
      ? "- Never use skull emoji (💀 ☠️)."
      : "- Не используй череп в emoji (💀 ☠️).";

  if (language === "en") {
    return [
      noSkullRule,
      "- Use emoji in text where it fits messaging: irony, softening, warm reaction, quick joke.",
      "- Don't put emoji in every line; skip them in tense, scary, or desperate moments.",
      "- Match emoji density and tone to the user brief — funny, eerie, romantic, etc.",
    ];
  }

  return [
    noSkullRule,
    "- Используй emoji в text там, где это уместно в переписке: ирония, смягчение, тёплая реакция, короткая шутка.",
    "- Не ставь emoji в каждой реплике и не используй их в напряжённых, страшных или отчаянных моментах.",
    "- Плотность и тон emoji бери из задания пользователя — весёлый, мистический, романтичный и т.д.",
  ];
};

const buildShortsNameRules = (language = "ru") => {
  if (language === "en") {
    return [
      "- Invent new characters for this story; contactName should be fresh and fit the plot.",
      "- Don't reuse names from other videos or chats (Chris, Emma, Max, etc.) unless the user named a character.",
      "- If no name in the brief — pick something plausible but not cliché for WhatsApp.",
    ];
  }
  return [
    "- Придумай новых героев для этой истории; contactName — свежее имя по сюжету.",
    "- Не повторяй имена из других роликов и чужих переписок (Кирилл, Лена, Макс и т.п.), если пользователь явно не назвал героя.",
    "- Если в задании нет имени — выбери небанальное, но правдоподобное для WhatsApp.",
  ];
};

const buildImageRules = (imageCount = 0, {ussrStyle = false, language = "ru"} = {}) => {
  if (imageCount <= 0) {
    return [
      ...(language === "en"
        ? [
            "- Text messages only. Do not use imagePrompt or image.",
            "- If the scene needs a photo, the character describes it in text.",
          ]
        : [
            "- Только текстовые сообщения. Не используй imagePrompt и image.",
            "- Если в сцене нужно фото, герой описывает это словами в text.",
          ]),
    ];
  }
  const countRule =
    imageCount === 1
      ? language === "en"
        ? "- Exactly 1 photo message with imagePrompt (no image field). text optional: short plain caption or empty."
        : "- Ровно 1 фото-сообщение с imagePrompt (без поля image). text необязателен: короткая подпись или пусто."
      : language === "en"
        ? `- Up to ${imageCount} photo messages with imagePrompt (no image field) — as many as fit the scene, but no more than ${imageCount}. text optional.`
        : `- До ${imageCount} фото-сообщений с imagePrompt (без поля image) — столько, сколько уместно сцене, но не больше ${imageCount}. text необязателен.`;
  const bracketRule =
    language === "en"
      ? "- Never put photo/frame descriptions in square brackets in text (no «[photo …]», «[image]», or any […] annotations). Visual description belongs only in imagePrompt."
      : "- В text никогда не пиши описание фото в квадратных скобках (запрещено «[фото …]», «[картинка]» и любые […] с пояснением кадра). Описание кадра — только в imagePrompt.";
  if (language === "en") {
    return [
      countRule,
      bracketRule,
      ussrStyle
        ? "- imagePrompt: 1–3 sentences describing the photo (everyday USSR 1984 scene)."
        : "- imagePrompt: 1–3 sentences describing what should be in the photo.",
      ussrStyle
        ? "- Insert photos where a character sends proof: price tag, street, food, ticket, etc."
        : "- Insert photo messages where they strengthen the plot per the user brief.",
    ];
  }
  return [
    countRule,
    bracketRule,
    ussrStyle
      ? "- imagePrompt: 1–3 предложения, что должно быть на фото (бытовая сцена СССР 1984)."
      : "- imagePrompt: 1–3 предложения, что должно быть на фото.",
    ussrStyle
      ? "- Вставляй фото там, где герой присылает доказательство: ценник, улица, еда, билет и т.п."
      : "- Вставляй фото-сообщения там, где это усиливает сюжет по заданию пользователя.",
  ];
};

const buildStoryImageRules = ({language = "ru", videoLayout = "storyOverlay"} = {}) => {
  const layoutValue = normalizeVideoLayout(videoLayout);
  const noBubbleRule =
    language === "en"
      ? "- Text-only chat: never use image, imagePrompt, or imageEditPrompt in messages."
      : "- Только текст в переписке: никогда не используй image, imagePrompt и imageEditPrompt в messages.";

  if (language === "en") {
    return [
      `- layout must be "${layoutValue}".`,
      "- story.opening.imagePrompt: illustrated establishing scene before messages appear (night, location, mood).",
      "- story.opening.animation: video (default).",
      "- On 3–6 key messages (hook, turn, climax, finale) add storyImagePrompt — wide illustrated scene for the top panel.",
      "- storyImagePrompt changes on plot beats, not on every line. Hold previous frame between beats.",
      "- storyImagePrompt describes the scene/environment as a drawn illustration, not a photo. No chat UI or text overlays.",
      "- Never use words like photo, photorealistic, cinematic, shot on camera in storyImagePrompt.",
      noBubbleRule,
      "- Never put frame descriptions in square brackets in text.",
    ];
  }

  return [
    `- layout обязательно "${layoutValue}".`,
    "- story.opening.imagePrompt: рисованный establishing shot до появления сообщений (ночь, место, настроение).",
    "- story.opening.animation: video (по умолчанию).",
    "- На 3–6 ключевых сообщениях (хук, поворот, кульминация, финал) добавь storyImagePrompt — широкий рисованный кадр для верхней панели.",
    "- storyImagePrompt меняется на поворотах сюжета, не на каждой реплике.",
    "- storyImagePrompt описывает сцену/обстановку как иллюстрацию, не как фото. Без UI чата и без текста на кадре.",
    "- Не пиши в storyImagePrompt слова «фото», «фотореализм», «кинематографичный», «снято на камеру».",
    noBubbleRule,
    "- В text не пиши описание кадра в квадратных скобках.",
  ];
};

const buildHookRules = (language = "ru", mode = "shorts") => {
  if (mode !== "shorts") {
    return [];
  }
  return language === "en"
    ? [
        "- First message (messages[0]) is the hook: conflict, absurdity, or mystery in at most ~12 words.",
        "- No weak openers: not «Hi», «Hey», «Listen», «I have a question».",
        "- The reader must instantly want to know what happens next; don't pad the opening.",
      ]
    : [
        "- Первое сообщение (messages[0]) — крючок: конфликт, абсурд или странность, не длиннее ~12 слов.",
        "- Без слабых начал: не «Привет», «Слушай», «У меня вопрос», «Ну что».",
        "- Читатель сразу должен захотеть узнать, что будет дальше; не раздувай завязку.",
      ];
};

const buildMessageCountRules = (messageCount, language = "ru") => {
  if (messageCount == null) {
    return language === "en"
      ? [
          "- Choose the number of messages from the user's brief — as many as the scene needs.",
          "- If the brief does not specify a limit, pick a natural length for the format without padding.",
          "- If the brief explicitly states a limit (e.g. «10 messages», «up to 15 lines») — follow it strictly.",
        ]
      : [
          "- Число сообщений определи из задания пользователя — столько, сколько нужно сцене.",
          "- Если лимит в задании не указан — выбери естественную длину для формата, без воды и растягивания.",
          "- Если в задании явно указан лимит (например «10 сообщений», «до 15 реплик») — строго соблюдай его.",
        ];
  }
  if (language === "en") {
    return [
      `- messages array: at most ${messageCount} messages.`,
      "- If the scene needs fewer lines — keep it shorter, don't pad for volume.",
    ];
  }
  return [
    `- В массиве messages — не больше ${messageCount} сообщений.`,
    "- Если сцене достаточно меньше реплик — пиши короче, не растягивай ради объёма.",
  ];
};

const buildVideoMessageCountRules = (messageCount, language = "ru") => {
  if (messageCount == null) {
    return language === "en"
      ? [
          "- Choose script length (messages count) from the user's brief.",
          "- If no limit is stated — pick a natural length for a horizontal video script, without filler.",
          "- If the brief explicitly states a message/beat limit — follow it strictly.",
        ]
      : [
          "- Длину сценария (число реплик в messages) определи из задания пользователя.",
          "- Если лимит не указан — выбери естественную длину для горизонтального ролика, без воды.",
          "- Если в задании явно указан лимит реплик/сообщений — строго соблюдай его.",
        ];
  }
  return buildMessageCountRules(messageCount, language);
};

const buildContextImageRules = ({language = "ru", ussrStyle = false} = {}) => {
  const styleHint = ussrStyle
    ? language === "en"
      ? "- imagePrompt: 1–3 sentences, everyday USSR 1984 scene."
      : "- imagePrompt: 1–3 предложения, бытовая сцена СССР 1984."
    : language === "en"
      ? "- imagePrompt: 1–3 sentences describing what should be in the photo."
      : "- imagePrompt: 1–3 предложения, что должно быть на фото.";
  const bracketRule =
    language === "en"
      ? "- Never put photo descriptions in square brackets in text. Visual description belongs only in imagePrompt."
      : "- В text не пиши описание фото в квадратных скобках. Описание кадра — только в imagePrompt.";
  return language === "en"
    ? [
        "- Choose how many photo messages (imagePrompt) fit the user's brief: 0 if text alone works; otherwise as many as the scene needs (usually 0–2 for Shorts).",
        "- If the brief says «no photos» / «text only» — use 0 photo messages.",
        "- If the brief explicitly states a photo count — follow it strictly.",
        styleHint,
        bracketRule,
        ussrStyle
          ? "- Place photos where they help the USSR-era scene, not at random."
          : "- Place photos where they help the joke or story beat, not at random.",
      ]
    : [
        "- Число фото-сообщений (imagePrompt) выбери по заданию: 0, если хватает текста; иначе столько, сколько уместно сцене (для Shorts обычно 0–2).",
        "- Если в задании «без фото» / только текст — не добавляй imagePrompt.",
        "- Если в задании явно указано число фото — строго соблюдай его.",
        styleHint,
        bracketRule,
        ussrStyle
          ? "- Вставляй фото там, где они помогают бытовой сцене СССР, а не ради количества."
          : "- Вставляй фото там, где они усиливают шутку или сюжетный ход, а не ради количества.",
      ];
};

const parseCountFromPatterns = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value >= 0) {
        return value;
      }
    }
  }
  return null;
};

export const parsePromptGenerationLimits = (prompt) => {
  const text = String(prompt ?? "");
  const limits = {messageCount: null, imageCount: null};
  if (!text.trim()) {
    return limits;
  }

  if (/\b(?:без\s+фото|no\s+photos?|text\s+only|только\s+текст)\b/i.test(text)) {
    limits.imageCount = 0;
  }

  const imageCount =
    limits.imageCount ??
    parseCountFromPatterns(text, [
      /(?:^|[\s,.:;—-])(?:до|не\s+больше|не\s+более|максимум|max|up\s+to)\s*(\d{1,2})\s*(?:фото|photos?)/i,
      /(?:^|[\s,.:;—-])ровно\s*(\d{1,2})\s*(?:фото|photos?)/i,
      /(?:^|[\s,.:;—-])(\d{1,2})\s*(?:фото|photos?)/i,
    ]);
  if (imageCount != null) {
    limits.imageCount = Math.max(0, Math.min(imageCount, 15));
  }

  const messageCount = parseCountFromPatterns(text, [
    /(?:^|[\s,.:;—-])(?:до|не\s+больше|не\s+более|максимум|max|up\s+to)\s*(\d{1,2})\s*(?:сообщ|реплик|messages?)/i,
    /(?:^|[\s,.:;—-])ровно\s*(\d{1,2})\s*(?:сообщ|реплик|messages?)/i,
    /(?:^|[\s,.:;—-])(\d{1,2})\s*(?:сообщений|сообщения|реплик|messages?)/i,
  ]);
  if (messageCount != null) {
    limits.messageCount = Math.max(1, Math.min(messageCount, 80));
  }

  return limits;
};

const messageCountUserHint = (messageCount, language = "ru") => {
  if (messageCount == null) {
    return null;
  }
  return language === "en"
    ? `At most ${messageCount} messages in messages.`
    : `Не больше ${messageCount} сообщений в messages.`;
};

const buildLanguageRules = (language = "ru", mode = "shorts") => {
  if (language === "en") {
    return [
      "- All dialogue text and contactName must be in English.",
      "- Write for a native English-speaking audience. Do not translate Russian jokes, idioms, slang, or humor patterns into English.",
      "- Tone, references, rhythm, and punchlines must feel natural in English chat culture — not like localized Russian comedy.",
      mode === "shorts"
        ? "- displayTitle: catchy title in English, 2–7 words."
        : "",
    ].filter(Boolean);
  }
  return [
    "- Вся переписка (text, contactName" +
      (mode === "shorts" ? ", displayTitle" : "") +
      ") — на русском.",
    mode === "shorts" ? "- displayTitle: цепляющее название на русском, 2–7 слов." : "",
  ].filter(Boolean);
};

export const normalizeGenerationOptions = ({
  prompt,
  messageCount,
  imageCount,
  includeImages,
  language,
  mode,
} = {}) => {
  const fromPrompt = parsePromptGenerationLimits(prompt);
  const normalizedMode = normalizeContentMode(mode);

  const mc = Number(messageCount);
  const resolvedMessageCount =
    Number.isFinite(mc) && mc > 0
      ? Math.min(Math.round(mc), 80)
      : fromPrompt.messageCount;

  let resolvedImageCount;
  const ic = Number(imageCount);
  if (Number.isFinite(ic)) {
    resolvedImageCount = Math.max(0, Math.min(Math.round(ic), 15));
  } else if (fromPrompt.imageCount != null) {
    resolvedImageCount = fromPrompt.imageCount;
  } else if (includeImages === false) {
    resolvedImageCount = 0;
  } else {
    resolvedImageCount = null;
  }

  return {
    messageCount: resolvedMessageCount,
    imageCount: resolvedImageCount,
    language: language === "en" ? "en" : "ru",
  };
};

const imageCountUserHint = (imageCount, language = "ru") => {
  if (imageCount == null) {
    return language === "en"
      ? "Choose how many photo messages to include based on the brief (0 unless photos help the story)."
      : "Число фото-сообщений выбери по заданию (0, если хватает текста; иначе столько, сколько уместно сцене).";
  }
  if (imageCount <= 0) {
    return language === "en"
      ? "Text messages only — no imagePrompt, no image."
      : "Только текстовые сообщения, без imagePrompt и без image.";
  }
  if (imageCount === 1) {
    return language === "en"
      ? "Add exactly 1 photo message with imagePrompt (no text)."
      : "Добавь ровно 1 фото-сообщение с imagePrompt (без text).";
  }
  return language === "en"
    ? `Add up to ${imageCount} photo messages with imagePrompt (no text), as many as fit the scene.`
    : `Добавь до ${imageCount} фото-сообщений с imagePrompt (без text), сколько уместно сцене.`;
};

const buildTemplateVars = async ({
  imageCount = null,
  messageCount = null,
  language = "ru",
  mode = "shorts",
  ussrStyle = false,
  videoLayout = "chat",
  videoTextMode = "narration",
} = {}) => {
  const logicRules = await readPromptFile(promptKeyForLogicRules(language));
  const isVideoMode = mode === "video";
  const storyVisual = !isVideoMode && isStoryVisualLayout(videoLayout);
  const storyLayout = normalizeVideoLayout(videoLayout);
  const ussr = ussrStyle || mode === "series";
  return {
    JSON_FORMAT: buildJsonFormatBlock({
      withDisplayTitle: mode === "shorts" || mode === "video",
      myName:
        mode === "shorts" || mode === "video"
          ? language === "en"
            ? "Me"
            : "Я"
          : language === "en"
            ? "Alice"
            : "Алиса",
      fullConversation: mode === "shorts" || mode === "video",
      language,
      withStoryVisual: storyVisual,
      storyLayout,
      withVideoLayout: isVideoMode,
      videoTextMode,
    }).join("\n"),
    LANGUAGE_RULES: buildLanguageRules(language, mode).join("\n"),
    MESSAGE_COUNT_RULES: (isVideoMode
      ? buildVideoMessageCountRules(messageCount, language)
      : buildMessageCountRules(messageCount, language)
    ).join("\n"),
    LOGIC_RULES: logicRules,
    HOOK_RULES: buildHookRules(language, mode).join("\n"),
    EMOJI_RULES: buildEmojiRules(language).join("\n"),
    IMAGE_RULES: isVideoMode
      ? imageCount == null
        ? buildContextImageRules({language, ussrStyle: false}).join("\n")
        : buildImageRules(imageCount, {language}).join("\n")
      : storyVisual
        ? buildStoryImageRules({language, videoLayout: storyLayout}).join("\n")
        : imageCount == null
          ? buildContextImageRules({language, ussrStyle: ussr}).join("\n")
          : buildImageRules(imageCount, {
              ussrStyle: ussr,
              language,
            }).join("\n"),
    SHORTS_NAME_RULES: buildShortsNameRules(language).join("\n"),
    STORY_PLAN: "",
    LITERARY_EDITOR: "",
  };
};

export const buildFullUserPrompt = async ({
  prompt,
  language = "ru",
  mode = "shorts",
} = {}) => String(prompt ?? "").trim();

const buildSeriesSystemPrompt = async ({
  imageCount = 0,
  messageCount = 20,
  language = "ru",
  seriesId = DEFAULT_SERIES_ID,
} = {}) => {
  const seriesDir = seriesContentDir(seriesId);
  const storyPlan = await readOptionalFile(path.join(seriesDir, "story-plan.md"));
  const literaryEditor = await readOptionalFile(path.join(seriesDir, "literary-editor.md"));

  const template = await readPromptFile("series-system");
  if (!template) {
    throw new Error("Файл prompts/series-system.txt не найден");
  }
  const vars = await buildTemplateVars({
    imageCount,
    messageCount,
    language,
    mode: "series",
    ussrStyle: true,
  });
  vars.STORY_PLAN = storyPlan ? `План истории:\n${storyPlan}` : "";
  vars.LITERARY_EDITOR = literaryEditor ? `Литературный редактор:\n${literaryEditor}` : "";
  return renderPromptTemplate(template, vars);
};

const buildShortsSystemPrompt = async ({
  imageCount = 0,
  messageCount = 20,
  language = "ru",
  videoLayout = "chat",
  mode = "shorts",
  videoTextMode = "narration",
} = {}) => {
  const key = promptKeyForShortsSystem(language);
  const template = await readPromptFile(key);
  if (!template) {
    throw new Error(`Файл prompts/${key.replace(/-/g, "-")}.txt не найден`);
  }
  return renderPromptTemplate(
    template,
    await buildTemplateVars({
      imageCount,
      messageCount,
      language,
      mode,
      videoLayout,
      videoTextMode,
    }),
  );
};

const buildRefineSystemPrompt = async ({
  imageCount = 0,
  messageCount = 20,
  language = "ru",
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  videoLayout = "chat",
} = {}) => {
  const base =
    mode === "series"
      ? await buildSeriesSystemPrompt({imageCount, messageCount, language, seriesId})
      : await buildShortsSystemPrompt({imageCount, messageCount, language, videoLayout});

  return [
    base,
    "",
    language === "en" ? "Refinement mode:" : "Режим доработки:",
    language === "en"
      ? "- User sends an existing chat and revision notes."
      : "- Пользователь присылает уже готовую переписку и замечания.",
    language === "en"
      ? "- Return the full updated chat JSON with revisions applied."
      : "- Верни полный обновлённый JSON переписки с учётом правок.",
    language === "en"
      ? "- Don't start from scratch: keep strong lines and structure, change only what is requested."
      : "- Не начинай с нуля: сохраняй удачные реплики и структуру, меняй только то, что просят.",
    language === "en"
      ? "- If the source has image or imagePrompt — keep them unless the user asks to remove."
      : "- Если в исходнике есть image или imagePrompt — сохраняй, если пользователь не просит убрать.",
    mode === "shorts"
      ? language === "en"
        ? "- If the source had displayTitle — keep or improve it; otherwise don't add one."
        : "- Если в исходнике был displayTitle — сохрани или улучши по смыслу; иначе не добавляй."
      : "",
    mode === "shorts"
      ? language === "en"
        ? "- Don't swap characters for Alice/Danya or drift into the «Back in the USSR» series unless the user asks."
        : "- Не подменяй героев на Алису/Даню и не уводи сюжет в серию «Пока в СССР», если пользователь не просит."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildSystemPrompt = async ({
  mode = "shorts",
  imageCount = 0,
  messageCount = 20,
  language = "ru",
  seriesId = DEFAULT_SERIES_ID,
  videoLayout = "chat",
  videoTextMode = "narration",
} = {}) => {
  if (mode === "series") {
    return buildSeriesSystemPrompt({imageCount, messageCount, language, seriesId});
  }
  return buildShortsSystemPrompt({
    imageCount,
    messageCount,
    language,
    videoLayout: mode === "video" ? "video" : videoLayout,
    mode,
    videoTextMode,
  });
};

const buildUserPrompt = async ({
  prompt,
  previousMessages,
  imageCount = null,
  messageCount = null,
  language = "ru",
  mode = "shorts",
}) => {
  const parts = [
    mode === "series"
      ? language === "en"
        ? "Write a new part of the chat from this brief:"
        : "Напиши новую часть переписки по этому заданию:"
      : language === "en"
        ? "Write a standalone chat transcript from this brief:"
        : "Напиши самостоятельную переписку по этому заданию:",
    prompt.trim(),
    imageCountUserHint(imageCount, language),
    messageCountUserHint(messageCount, language),
    language === "en"
      ? "Write the dialogue in English for a native English-speaking audience. Humor and voice must be originally English, not translated from Russian."
      : "Пиши переписку на русском.",
    language === "en"
      ? "Keep the dialogue logically consistent from first message to finale."
      : "Держи логическую состоятельность переписки от первого сообщения до финала.",
  ].filter(Boolean);

  if (mode === "series" && Array.isArray(previousMessages) && previousMessages.length > 0) {
    parts.push(
      "",
      language === "en"
        ? "Context from previous series parts (use it, but don't repeat verbatim):"
        : "Контекст предыдущих частей серии (учитывай, но не повторяй дословно):",
      JSON.stringify(previousMessages.slice(-30), null, 2),
    );
  }

  if (mode === "shorts") {
    parts.push(
      "",
      language === "en"
        ? "Don't use context from other stories — only this brief."
        : "Не используй контекст из других историй — только это задание.",
    );
    parts.push(
      language === "en"
        ? "Don't use Alice, Danya, or USSR setting unless the brief explicitly references them."
        : "Не используй Алису, Даню и сеттинг СССР, если в задании нет прямой отсылки к ним.",
    );
    parts.push(
      language === "en"
        ? "Invent character names for this story; don't copy contactName from other dialogues."
        : "Имена героев придумай заново для этой истории; не копируй contactName из чужих диалогов.",
    );
    parts.push(
      "",
      language === "en" ? "Add displayTitle in English." : "Обязательно добавь displayTitle на русском.",
    );
  }

  parts.push("", language === "en" ? "Return only valid JSON." : "Верни только валидный JSON.");
  return parts.join("\n");
};

const buildShortsExpandUserPrompt = ({
  prompt,
  conversation,
  displayTitle,
  imageCount = null,
  messageCount = null,
  language = "ru",
}) => {
  const draft = displayTitle ? {displayTitle, ...conversation} : conversation;
  if (language === "en") {
    return [
      "User brief:",
      prompt.trim(),
      "",
      "Draft below. Expand it into a complete scene per the brief.",
      "Keep strong lines, add development, detail, dialogue, and a finale.",
      "If the draft name or plot doesn't match the brief — fix contactName and characters per the brief.",
      "Return full JSON with the complete messages array — don't stop halfway.",
      messageCountUserHint(messageCount, language),
      "Write the dialogue in English for a native English-speaking audience. Humor and voice must be originally English, not translated from Russian.",
      "Keep the dialogue logically consistent from first message to finale.",
      imageCountUserHint(imageCount, language),
      "",
      "Draft:",
      JSON.stringify(draft, null, 2),
      "",
      "Return only the full JSON.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "Задание пользователя:",
    prompt.trim(),
    "",
    "Ниже черновик переписки. Разверни и допиши его до полного завершения сцены по заданию.",
    "Сохрани удачные реплики, добавь развитие, детали, диалог и финал.",
    "Если в черновике имя или сюжет не совпадают с заданием — исправь contactName и героев по заданию.",
    "Верни полный JSON с полным массивом messages — не обрывай историю на полпути.",
    messageCountUserHint(messageCount, language),
    "Пиши переписку на русском.",
    "Держи логическую состоятельность переписки от первого сообщения до финала.",
    imageCountUserHint(imageCount, language),
    "",
    "Черновик:",
    JSON.stringify(draft, null, 2),
    "",
    "Верни только полный JSON.",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildRegenerateMessageSystemPrompt = async ({
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
} = {}) => {
  const base = await buildSystemPrompt({mode, includeImages: true, seriesId});
  return [
    base,
    "",
    "Режим переписывания одной реплики:",
    "- Пользователь указывает одно сообщение в готовой переписке.",
    "- Верни только JSON вида {\"message\":{...}} — один объект сообщения.",
    "- author не меняй. image, imagePrompt, imageEditPrompt сохраняй как в оригинале, если пользователь не просит иначе.",
    "- Перепиши text: сделай реплику естественнее для WhatsApp, без кринжа и штампов; emoji — где уместно.",
    "- sentAt можно слегка подправить (±1–2 мин), формат HH:MM.",
  ].join("\n");
};

const buildRegenerateMessageUserPrompt = ({
  conversation,
  messageIndex,
  instruction,
}) => {
  const messages = conversation.messages;
  const target = messages[messageIndex];
  const who =
    target.author === "me"
      ? conversation.myName?.trim() || "Я"
      : conversation.contactName?.trim() || "Собеседник";
  const before = messages.slice(0, messageIndex);
  const after = messages.slice(messageIndex + 1);

  return [
    instruction?.trim() ||
      "Перепиши эту реплику: сделай естественнее, убери неуклюжие формулировки. Смысл и тон сцены сохрани.",
    "",
    `Целевое сообщение №${messageIndex + 1} (${who}):`,
    JSON.stringify(target, null, 2),
    "",
    "Контекст до:",
    before.length > 0 ? JSON.stringify(before, null, 2) : "(нет)",
    "",
    "Контекст после:",
    after.length > 0 ? JSON.stringify(after, null, 2) : "(нет)",
    "",
    'Верни только JSON: {"message":{...}}',
  ].join("\n");
};

const buildRefineUserPrompt = ({
  conversation,
  refinePrompt,
  imageCount = null,
  messageCount = null,
  language = "ru",
}) => {
  const imageHint =
    imageCount === 0
      ? language === "en"
        ? "Text messages only — no imagePrompt, no image."
        : "Только текстовые сообщения, без imagePrompt и без image."
      : imageCountUserHint(imageCount, language);
  const parts = [
    language === "en"
      ? "Refine the current chat per these notes:"
      : "Доработай текущую переписку по этим замечаниям:",
    refinePrompt.trim(),
    imageHint,
    messageCountUserHint(messageCount, language),
    language === "en"
      ? "Keep the dialogue in English for a native English-speaking audience."
      : "Переписка на русском.",
    "",
    language === "en" ? "Current chat:" : "Текущая переписка:",
    JSON.stringify(conversation, null, 2),
    "",
    language === "en" ? "Return only the full updated JSON." : "Верни только полный обновлённый JSON.",
  ].filter(Boolean);
  return parts.join("\n");
};

const validateConversation = (input) => {
  try {
    return parseConversation(input);
  } catch (error) {
    const formatted = formatConversationValidationError(error);
    throw new Error(
      formatted ? `Невалидный JSON диалога: ${formatted}` : `Невалидный JSON диалога: ${error}`,
    );
  }
};

const GENERIC_MESSAGE_IMAGE_RE = /^images\/msg-\d+\.(png|jpe?g|webp|gif)$/i;

const removeGenericGeneratedImageRefs = (conversation) => {
  for (const message of conversation?.messages ?? []) {
    const image = String(message.image ?? "").trim();
    if (GENERIC_MESSAGE_IMAGE_RE.test(image)) {
      delete message.image;
    }
  }
  return conversation;
};

const applyVideoDefaults = (conversation, textMode = "narration") => {
  if (!conversation || typeof conversation !== "object") {
    return conversation;
  }
  conversation.layout = "video";
  conversation.video = {textMode: textMode === "chat" ? "chat" : "narration"};
  delete conversation.story;
  delete conversation.hookText;
  if (Array.isArray(conversation.messages)) {
    for (const message of conversation.messages) {
      delete message.storyImage;
      delete message.storyImagePrompt;
      delete message.storyVideo;
      delete message.storyVideoDurationMs;
      delete message.storyVideoProfile;
      delete message.storyVideoLoop;
      delete message.storySfx;
    }
  }
  return conversation;
};

const applyStoryVisualDefaults = (conversation, videoLayout = "storyOverlay") => {
  if (!conversation || typeof conversation !== "object") {
    return conversation;
  }
  conversation.layout = isStoryVisualLayout(videoLayout) ? videoLayout : "storyOverlay";
  if (!conversation.story) {
    conversation.story = {};
  }
  if (!conversation.story.opening) {
    conversation.story.opening = {};
  }
  if (!conversation.story.opening.animation) {
    conversation.story.opening.animation = "video";
  }
  if (Array.isArray(conversation.messages)) {
    for (const message of conversation.messages) {
      delete message.image;
      delete message.imagePrompt;
      delete message.imageEditPrompt;
    }
  }
  return conversation;
};

const parseGeneratedPayload = (data, mode, {videoLayout = "chat", videoTextMode = "narration"} = {}) => {
  const normalizedMode = normalizeContentMode(mode);
  if (normalizedMode !== "shorts" && normalizedMode !== "video") {
    return {conversation: validateConversation(data), displayTitle: ""};
  }

  if (!data || typeof data !== "object") {
    return {conversation: validateConversation(data), displayTitle: ""};
  }

  const raw = {...data};
  const displayTitle = String(raw.displayTitle ?? "").trim();
  delete raw.displayTitle;
  let conversation = removeGenericGeneratedImageRefs(validateConversation(raw));
  if (normalizedMode === "video") {
    conversation = applyVideoDefaults(conversation, videoTextMode);
    return {conversation, displayTitle};
  }

  const targetLayout = isStoryVisualLayout(conversation.layout)
    ? conversation.layout
    : isStoryVisualLayout(videoLayout)
      ? videoLayout
      : null;
  if (targetLayout) {
    conversation = applyStoryVisualDefaults(conversation, targetLayout);
  }
  return {conversation, displayTitle};
};

const runChatJsonGeneration = async ({messages, maxAttempts = 3, parseResult, completeJson, language = "ru"}) => {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const chatMessages = [...messages];
      if (lastError) {
        chatMessages.push({
          role: "user",
          content:
            language === "en"
              ? `Previous response was invalid: ${lastError}. Fix it and return only JSON.`
              : `Предыдущий ответ невалиден: ${lastError}. Исправь и верни только JSON.`,
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

const buildLogicSystemPrompt = async ({
  mode = "shorts",
  imageCount = 0,
  messageCount = 20,
  language = "ru",
} = {}) => {
  const key = promptKeyForLogic(language);
  const template = await readPromptFile(key);
  if (!template) {
    throw new Error(`Файл prompts/${key}.txt не найден`);
  }
  return renderPromptTemplate(
    template,
    await buildTemplateVars({
      imageCount,
      messageCount,
      language,
      mode,
      ussrStyle: mode === "series",
    }),
  );
};

const buildLogicUserPrompt = ({
  prompt,
  conversation,
  displayTitle,
  messageCount = null,
  language = "ru",
  mode = "shorts",
}) => {
  const draft = displayTitle && mode === "shorts" ? {displayTitle, ...conversation} : conversation;
  const countHint = messageCountUserHint(messageCount, language);
  if (language === "en") {
    return [
      "User brief:",
      prompt?.trim() || "(not provided)",
      "",
      "Check and fix logic in the draft below. Do not change wording unless required for logic.",
      countHint,
      "",
      "Draft:",
      JSON.stringify(draft, null, 2),
      "",
      "Return only the full valid JSON.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "Задание пользователя:",
    prompt?.trim() || "(не указано)",
    "",
    "Проверь и исправь логику в черновике ниже. Не меняй формулировки без необходимости для логики.",
    countHint,
    "",
    "Черновик:",
    JSON.stringify(draft, null, 2),
    "",
    "Верни только полный валидный JSON.",
  ]
    .filter(Boolean)
    .join("\n");
};

export const checkDialogueLogic = async ({
  prompt,
  conversation,
  displayTitle,
  mode = "shorts",
  imageCount,
  messageCount,
  language = "ru",
  model,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm(model);
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!conversation || typeof conversation !== "object") {
    throw new Error("Текущая переписка обязательна");
  }

  const normalizedMode = mode === "series" ? "series" : mode === "video" ? "video" : "shorts";
  const gen = normalizeGenerationOptions({
    prompt,
    messageCount,
    imageCount,
    language,
    mode: normalizedMode,
  });
  const validated = validateConversation(conversation);
  const before = JSON.stringify(validated);
  const system = await buildLogicSystemPrompt({
    mode: normalizedMode,
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
  });
  const user = buildLogicUserPrompt({
    prompt,
    conversation: validated,
    displayTitle,
    messageCount: gen.messageCount,
    language: gen.language,
    mode: normalizedMode,
  });
  const parseMode = normalizedMode === "shorts" ? "shorts" : "series";
  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    language: gen.language,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: fixed, displayTitle: fixedTitle} = parseGeneratedPayload(data, parseMode);
      return {conversation: fixed, displayTitle: fixedTitle, mode: normalizedMode};
    },
  });
  return {
    ...result,
    provider: llm.provider,
    logicRevised: JSON.stringify(result.conversation) !== before,
  };
};

const expandShortsDialogue = async ({
  prompt,
  conversation,
  displayTitle,
  imageCount,
  messageCount,
  language,
  videoLayout = "chat",
  system,
  completeJson,
  maxAttempts,
}) => {
  const user = buildShortsExpandUserPrompt({
    prompt,
    conversation,
    displayTitle,
    imageCount,
    messageCount,
    language,
  });
  return runChatJsonGeneration({
    maxAttempts,
    completeJson,
    language,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: expanded, displayTitle: expandedTitle} = parseGeneratedPayload(
        data,
        "shorts",
        {videoLayout},
      );
      return {conversation: expanded, displayTitle: expandedTitle, mode: "shorts"};
    },
  });
};

export const resolveGenerationVideoLayout = ({videoLayout, conversation, mode = "shorts"} = {}) => {
  if (normalizeContentMode(mode) === "video") {
    return "video";
  }
  if (normalizeContentMode(mode) !== "shorts") {
    return "chat";
  }
  if (isStoryVisualLayout(videoLayout)) {
    return videoLayout;
  }
  if (conversation && isStoryVisualLayout(conversation.layout)) {
    return conversation.layout;
  }
  return "chat";
};

export const generateDialogue = async ({
  prompt,
  videoLayout = "storyOverlay",
  textMode = "narration",
  previousMessages,
  includeImages,
  imageCount,
  messageCount,
  language,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  model,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm(model);
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!prompt?.trim()) {
    throw new Error("Промпт диалога обязателен");
  }

  const normalizedMode = normalizeContentMode(mode);
  const gen = normalizeGenerationOptions({
    prompt,
    messageCount,
    imageCount,
    includeImages,
    language,
    mode: normalizedMode,
  });
  const contextMessages =
    normalizedMode === "series" && Array.isArray(previousMessages) && previousMessages.length > 0
      ? previousMessages
      : undefined;

  const genVideoLayout = resolveGenerationVideoLayout({videoLayout, mode: normalizedMode});

  const fullPrompt = await buildFullUserPrompt({
    prompt,
    language: gen.language,
    mode: normalizedMode,
  });

  const system = await buildSystemPrompt({
    mode: normalizedMode,
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
    seriesId,
    videoLayout: genVideoLayout,
    videoTextMode: textMode,
  });
  const user = await buildUserPrompt({
    prompt: fullPrompt,
    previousMessages: contextMessages,
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
    mode: normalizedMode,
  });

  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    language: gen.language,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation, displayTitle} = parseGeneratedPayload(data, normalizedMode, {
        videoLayout: genVideoLayout,
        videoTextMode: textMode,
      });
      return {conversation, displayTitle, mode: normalizedMode};
    },
  });

  let finalResult = {...result, provider: llm.provider};

  if (normalizedMode === "shorts") {
    const draftCount = result.conversation?.messages?.length ?? 0;
    try {
      const expanded = await expandShortsDialogue({
        prompt: fullPrompt,
        conversation: result.conversation,
        displayTitle: result.displayTitle,
        imageCount: gen.imageCount,
        messageCount: gen.messageCount,
        language: gen.language,
        videoLayout: genVideoLayout,
        system,
        completeJson: llm.completeJson,
        maxAttempts,
      });
      const expandedCount = expanded.conversation?.messages?.length ?? 0;
      if (expandedCount > draftCount) {
        finalResult = {
          ...expanded,
          provider: llm.provider,
          attempts: result.attempts + expanded.attempts,
          expandedFrom: draftCount,
        };
      }
    } catch {
      /* черновик лучше, чем ничего */
    }
  }

  return {...finalResult, provider: llm.provider};
};

export const refineDialogue = async ({
  conversation,
  refinePrompt,
  includeImages,
  imageCount,
  messageCount,
  language,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  videoLayout,
  model,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm(model);
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!refinePrompt?.trim()) {
    throw new Error("Промпт доработки обязателен");
  }
  if (!conversation || typeof conversation !== "object") {
    throw new Error("Текущая переписка обязательна");
  }

  const normalizedMode = normalizeContentMode(mode);
  const gen = normalizeGenerationOptions({
    prompt: refinePrompt,
    messageCount,
    imageCount,
    includeImages,
    language,
    mode: normalizedMode,
  });
  const validated = validateConversation(conversation);
  const genVideoLayout = resolveGenerationVideoLayout({
    videoLayout,
    conversation: validated,
    mode: normalizedMode,
  });
  const system = await buildRefineSystemPrompt({
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
    mode: normalizedMode,
    seriesId,
    videoLayout: genVideoLayout,
  });
  const user = buildRefineUserPrompt({
    conversation: validated,
    refinePrompt,
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
  });

  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    language: gen.language,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: updated, displayTitle} = parseGeneratedPayload(
        data,
        normalizedMode,
        {videoLayout: genVideoLayout},
      );
      return {conversation: updated, displayTitle, mode: normalizedMode};
    },
  });

  return {...result, provider: llm.provider};
};

export const regenerateMessage = async ({
  conversation,
  messageIndex,
  instruction,
  mode = "shorts",
  seriesId = DEFAULT_SERIES_ID,
  model,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm(model);
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!conversation || typeof conversation !== "object") {
    throw new Error("Текущая переписка обязательна");
  }

  const normalizedMode = mode === "series" ? "series" : "shorts";
  const validated = validateConversation(conversation);
  const messages = validated.messages;

  if (typeof messageIndex !== "number" || messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения");
  }

  const target = messages[messageIndex];
  if (!String(target.text ?? "").trim()) {
    throw new Error("У сообщения нет текста для переписывания");
  }

  const system = await buildRegenerateMessageSystemPrompt({
    mode: normalizedMode,
    seriesId,
  });
  const user = buildRegenerateMessageUserPrompt({
    conversation: validated,
    messageIndex,
    instruction,
  });

  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const raw = data?.message;
      if (!raw || typeof raw !== "object") {
        throw new Error("Ответ должен содержать поле message");
      }

      const merged = {
        ...target,
        ...raw,
        author: target.author,
        image: target.image ?? raw.image,
        imagePrompt: target.imagePrompt ?? raw.imagePrompt,
        imageEditPrompt: target.imageEditPrompt ?? raw.imageEditPrompt,
      };

      const message = messageSchema.parse(merged);
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = message;
      const updatedConversation = validateConversation({
        ...validated,
        messages: updatedMessages,
      });

      return {conversation: updatedConversation, message, messageIndex};
    },
  });

  return {...result, provider: llm.provider, mode: normalizedMode};
};

export const regenerateEnding = async ({
  conversation,
  displayTitle,
  tailCount = 3,
  messageCount,
  imageCount = 0,
  language,
  videoLayout,
  mode = "shorts",
  model,
  maxAttempts = 3,
}) => {
  const llm = resolveDialogueLlm(model);
  if (!llm) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — только ChatGPT через OpenRouter)");
  }
  if (!conversation || typeof conversation !== "object") {
    throw new Error("Текущая переписка обязательна");
  }

  const normalizedMode = mode === "series" ? "series" : "shorts";
  const gen = normalizeGenerationOptions({
    messageCount,
    imageCount,
    language,
    mode: normalizedMode,
  });
  const validated = validateConversation(conversation);
  const messages = validated.messages;
  const safeTail = Math.max(1, Math.min(Math.round(tailCount) || 3, messages.length - 1));
  const keepCount = messages.length - safeTail;
  const prefix = messages.slice(0, keepCount);

  const genVideoLayout = resolveGenerationVideoLayout({
    videoLayout,
    conversation: validated,
    mode: normalizedMode,
  });

  const system = await buildSystemPrompt({
    mode: normalizedMode,
    imageCount: gen.imageCount,
    messageCount: gen.messageCount,
    language: gen.language,
    videoLayout: genVideoLayout,
  });

  const draft = displayTitle && normalizedMode === "shorts" ? {displayTitle, ...validated} : validated;
  const countRule =
    gen.messageCount == null
      ? gen.language === "en"
        ? "Keep total message count similar to the draft unless the brief requires otherwise."
        : "Общее число сообщений сохрани сопоставимым с черновиком, если задание не требует иного."
      : gen.language === "en"
        ? `Total messages must not exceed ${gen.messageCount}.`
        : `Всего сообщений — не больше ${gen.messageCount}.`;
  const user =
    gen.language === "en"
      ? [
          "Rewrite only the ending of this chat.",
          `Keep messages 1..${keepCount} exactly as in the draft (same text, order, images).`,
          `Replace the last ${safeTail} message(s) with a stronger finale that fits the setup.`,
          countRule,
          "",
          "Draft:",
          JSON.stringify({...draft, messages}, null, 2),
          "",
          "Return the full valid JSON.",
        ].join("\n")
      : [
          "Перепиши только финал этой переписки.",
          `Сообщения 1..${keepCount} оставь как в черновике (тот же текст, порядок, фото).`,
          `Последние ${safeTail} сообщения замени на более сильный финал, согласованный с завязкой.`,
          countRule,
          "",
          "Черновик:",
          JSON.stringify({...draft, messages}, null, 2),
          "",
          "Верни полный валидный JSON.",
        ].join("\n");

  const parseMode = normalizedMode === "shorts" ? "shorts" : "series";
  const result = await runChatJsonGeneration({
    maxAttempts,
    completeJson: llm.completeJson,
    language: gen.language,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user},
    ],
    parseResult: (data) => {
      const {conversation: updated, displayTitle: updatedTitle} = parseGeneratedPayload(data, parseMode, {
        videoLayout: genVideoLayout,
      });
      return {conversation: updated, displayTitle: updatedTitle, mode: normalizedMode};
    },
  });

  return {...result, provider: llm.provider, regeneratedFrom: keepCount};
};
