import {z} from "zod";
import {expandEmojis} from "./emoji";
import {normalizeMessengerLocale} from "./locale";

export const messageSchema = z
  .object({
    author: z.enum(["me", "them"]),
    /** Текст или подпись к изображению */
    text: z.string().optional().default(""),
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
    /** Если не указано — считается по длине текста (см. timing в корне JSON) */
    typingMs: z.number().min(200).max(30000).optional(),
    pauseBeforeMs: z.number().min(0).max(10000).optional(),
    sentAt: z.string().optional().default("12:34"),
  })
  .superRefine((message, ctx) => {
    const hasText = (message.text ?? "").trim().length > 0;
    const hasImage = Boolean(message.image?.trim());
    const hasImagePrompt = Boolean(message.imagePrompt?.trim());
    if (!hasText && !hasImage && !hasImagePrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите text, image и/или imagePrompt",
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
  /** Глобальные коэффициенты авто-тайминга (можно не указывать) */
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
  messages: z.array(messageSchema).min(1),
});

export type MessageInput = z.infer<typeof messageSchema>;
export type ConversationInput = z.infer<typeof conversationSchema>;

export const parseConversation = (input: unknown): ConversationInput => {
  const parsed = conversationSchema.parse(input);
  const custom = parsed.emojiAliases;

  return normalizeMessengerLocale({
    ...parsed,
    messages: parsed.messages.map((message) => ({
      ...message,
      text: message.text ? expandEmojis(message.text, custom) : "",
    })),
  });
};
