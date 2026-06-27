import {z} from "zod";
import {expandEmojis} from "./emoji";
import {normalizeMessengerLocale} from "./locale";
import {sanitizeMessageText} from "./message-text";
import {stripChatBubbleImages} from "./story";

export const storySfxCueSchema = z.object({
  id: z.string().min(1),
  volume: z.number().min(0).max(1).optional(),
  pan: z.number().min(-1).max(1).optional(),
  loop: z.boolean().optional(),
  delayMs: z.number().min(0).max(8000).optional(),
});

export const messageSchema = z
  .object({
    author: z.enum(["me", "them"]),
    /** Текст или подпись к изображению */
    text: z
      .string()
      .optional()
      .default("")
      .transform(sanitizeMessageText),
    /** Путь в public/ или URL (http/https) — URL скачивается при рендере */
    image: z
      .string()
      .min(1)
      .transform((value) => value.replace(/^\/+/, ""))
      .optional(),
    /** Явный промпт для генерации этого кадра; иначе собирается автоматически через OpenRouter */
    imagePrompt: z.string().min(1).optional(),
    /** Правки к уже сгенерированному кадру (image-to-image) */
    imageEditPrompt: z.string().min(1).optional(),
    /** Кадр сюжета в верхней панели (storySplit) */
    storyImage: z
      .string()
      .min(1)
      .transform((value) => value.replace(/^\/+/, ""))
      .optional(),
    /** Промпт для генерации кадра сюжета сверху */
    storyImagePrompt: z.string().min(1).optional(),
    /** Анимация story-кадра (OpenRouter Veo), public/images/… */
    storyVideo: z
      .string()
      .min(1)
      .transform((value) => value.replace(/^\/+/, ""))
      .optional(),
    /** Длительность storyVideo, мс */
    storyVideoDurationMs: z.number().min(100).max(60000).optional(),
    /** Профиль видео-модели; при смене MP4 перегенерируется */
    storyVideoProfile: z.string().min(1).optional(),
    /** true — бесшовный loop (редко); false/нет поля — один проход + hold на PNG */
    storyVideoLoop: z.boolean().optional(),
    /** Правки к уже сгенерированному кадру сюжета */
    storyImageEditPrompt: z.string().min(1).optional(),
    /** Атмосферные звуки сцены (id из sfx-каталога) */
    storySfx: z.array(storySfxCueSchema).max(4).optional(),
    /** Если не указано — считается по длине текста (см. timing в корне JSON) */
    typingMs: z.number().min(200).max(30000).optional(),
    pauseBeforeMs: z.number().min(0).max(10000).optional(),
    /** Пауза после появления пузыря, мс (до следующего сообщения) */
    postRevealMs: z.number().min(0).max(10000).optional(),
    /** Локальная озвучка реплики (public/audio/…) */
    voiceAudio: z
      .string()
      .min(1)
      .transform((value) => value.replace(/^\/+/, ""))
      .optional(),
    /** Длительность voiceAudio, мс (заполняется при генерации) */
    voiceDurationMs: z.number().min(50).max(120000).optional(),
    /** Движок озвучки; openrouter — Gemini TTS через OpenRouter */
    voiceTtsProvider: z.literal("openrouter").optional(),
    /** Профиль голоса/промпта; при смене WAV перегенерируется */
    voiceTtsProfile: z.string().min(1).optional(),
    sentAt: z.string().optional().default("12:34"),
  })
  .superRefine((message, ctx) => {
    const hasText = (message.text ?? "").trim().length > 0;
    const hasImage = Boolean(message.image?.trim());
    const hasImagePrompt = Boolean(message.imagePrompt?.trim());
    const hasStoryImage = Boolean(message.storyImage?.trim());
    const hasStoryImagePrompt = Boolean(message.storyImagePrompt?.trim());
    if (!hasText && !hasImage && !hasImagePrompt && !hasStoryImage && !hasStoryImagePrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите text, image/imagePrompt и/или storyImage/storyImagePrompt",
        path: ["text"],
      });
    }
  });

export const conversationSchema = z.object({
  contactName: z.string().min(1).default("Contact"),
  /** UI language: messenger chrome (status, typing, input placeholder) */
  locale: z.enum(["ru", "en"]).optional(),
  /** Статус в шапке, когда собеседник не печатает */
  contactStatus: z.string().default("в сети"),
  /** Статус в шапке, пока идёт анимация набора у them */
  contactStatusTyping: z.string().optional().default("печатает..."),
  contactAvatar: z.string().default("avatar.svg"),
  /** Размер текста в пузырях, px в кадре (по умолчанию S(44) ≈ 53) */
  messageFontSize: z.number().min(36).max(80).optional(),
  wallpaper: z.enum(["default", "dark"]).optional().default("default"),
  myName: z.string().optional().default("You"),
  /** Доп. shortcodes: { "custom": "🦄" } → в тексте :custom: */
  emojiAliases: z.record(z.string(), z.string()).optional(),
  /** Финальная заставка «Подпишись» */
  outro: z
    .object({
      enabled: z.boolean().optional(),
      text: z.string().optional(),
      pauseBeforeMs: z.number().min(0).max(10000).optional(),
      durationMs: z.number().min(500).max(15000).optional(),
    })
    .optional(),
  /** Заставка в начале: чёрный экран и белый текст */
  intro: z
    .object({
      enabled: z.boolean().optional(),
      text: z.string().optional(),
      durationMs: z.number().min(500).max(10000).optional(),
    })
    .optional(),
  /** Заставка в конце: чёрный экран и белый текст (перед «Подпишись») */
  endCard: z
    .object({
      enabled: z.boolean().optional(),
      text: z.string().optional(),
      durationMs: z.number().min(500).max(10000).optional(),
    })
    .optional(),
  /** Фоновая музыка (путь относительно public/) */
  music: z
    .object({
      enabled: z.boolean().optional(),
      src: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      /** Автоподбор при рендере story (mood-v1) */
      autoProfile: z.string().min(1).optional(),
    })
    .optional(),
  /** Звуки сообщений и набора (пути относительно public/) */
  sounds: z
    .object({
      incoming: z.string().optional(),
      outgoing: z.string().optional(),
      typing: z.string().optional(),
      messageVolume: z.number().min(0).max(1).optional(),
      typingVolumeThem: z.number().min(0).max(1).optional(),
      typingVolumeMe: z.number().min(0).max(1).optional(),
    })
    .optional(),
  /** Озвучка реплик через OpenRouter (Gemini TTS) */
  voiceover: z
    .object({
      enabled: z.boolean().optional(),
      provider: z
        .union([z.literal("openrouter"), z.literal("silero"), z.literal("mms")])
        .optional()
        .transform(() => "openrouter" as const)
        .default("openrouter"),
      /** Голос собеседника */
      themVoice: z.enum(["male", "female"]).optional(),
      /** Голос «я» */
      meVoice: z.enum(["male", "female"]).optional(),
      volume: z.number().min(0).max(1).optional(),
      musicDuck: z.number().min(0).max(1).optional(),
    })
    .optional(),
  /**
   * Множитель длительности переписки: 1 — по умолчанию, меньше — быстрее, больше — медленнее.
   * Влияет на паузы, набор и задержку после сообщения.
   */
  timingSpeed: z.number().min(0.25).max(4).optional(),
  /** Низкоуровневые коэффициенты авто-тайминга (обычно не нужны; см. timingSpeed) */
  timing: z
    .object({
      pauseBaseMs: z.number().optional(),
      pausePerCharMs: z.number().optional(),
      pausePerLineMs: z.number().optional(),
      themTypingBaseMs: z.number().optional(),
      themTypingPerCharMs: z.number().optional(),
      meTypingBaseMs: z.number().optional(),
      meTypingPerCharMs: z.number().optional(),
      postRevealBaseMs: z.number().optional(),
      postRevealPerCharMs: z.number().optional(),
      minTypingMs: z.number().optional(),
      maxTypingMs: z.number().optional(),
      minPauseMs: z.number().optional(),
      maxPauseMs: z.number().optional(),
      minPostRevealMs: z.number().optional(),
      maxPostRevealMs: z.number().optional(),
    })
    .optional(),
  /** Текст-хук поверх чата в первые ~2 с (обычно = название ролика) */
  hookText: z.string().max(120).optional(),
  /**
   * Обложка-превью: цепляющий кадр с названием ролика, который вшивается
   * на несколько секунд в самый конец видео (чтобы вручную выбрать как
   * превью при публикации на YouTube).
   */
  previewCover: z
    .object({
      enabled: z.boolean().optional(),
      image: z
        .string()
        .min(1)
        .transform((value) => value.replace(/^\/+/, ""))
        .optional(),
      title: z.string().max(160).optional(),
      durationMs: z.number().min(1000).max(10000).optional().default(3000),
    })
    .optional(),
  /** chat — классический чат; storySplit — сюжет сверху + чат снизу; storyOverlay — сюжет на весь экран + чат поверх */
  layout: z.enum(["chat", "storySplit", "storyOverlay"]).optional().default("chat"),
  /** Настройки storySplit / storyOverlay */
  story: z
    .object({
      opening: z
        .object({
          image: z
            .string()
            .min(1)
            .transform((value) => value.replace(/^\/+/, ""))
            .optional(),
          imagePrompt: z.string().min(1).optional(),
          storyVideo: z
            .string()
            .min(1)
            .transform((value) => value.replace(/^\/+/, ""))
            .optional(),
          storyVideoDurationMs: z.number().min(100).max(60000).optional(),
          storyVideoProfile: z.string().min(1).optional(),
          storyVideoLoop: z.boolean().optional(),
          durationMs: z.number().min(800).max(8000).optional().default(2500),
          animation: z.enum(["video", "none", "parallax", "kenburns"]).optional().default("video"),
          storySfx: z.array(storySfxCueSchema).max(4).optional(),
        })
        .optional(),
      splitTransitionMs: z.number().min(200).max(2000).optional().default(600),
      topPanelRatio: z.number().min(0.35).max(0.65).optional().default(0.45),
      /** В storySplit не показывать FullscreenImage для message.image */
      disableMessageFullscreen: z.boolean().optional().default(true),
      /** Готовый микс атмосферы (ffmpeg), public/audio/…/story-sfx-mix.wav */
      sfxMix: z
        .string()
        .min(1)
        .transform((value) => value.replace(/^\/+/, ""))
        .optional(),
      sfx: z
        .object({
          enabled: z.boolean().optional(),
          profile: z.string().min(1).optional(),
          masterVolume: z.number().min(0).max(3).optional(),
        })
        .optional(),
    })
    .optional(),
  messages: z.array(messageSchema).min(1),
});

export type MessageInput = z.infer<typeof messageSchema>;
export type ConversationInput = z.infer<typeof conversationSchema>;

export const parseConversation = (input: unknown): ConversationInput => {
  const parsed = conversationSchema.parse(input);
  const custom = parsed.emojiAliases;

  return stripChatBubbleImages(
    normalizeMessengerLocale({
      ...parsed,
      messages: parsed.messages.map((message) => ({
        ...message,
        text: message.text ? expandEmojis(message.text, custom) : "",
      })),
    }),
  );
};
