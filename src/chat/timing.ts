import {charCount} from "./emoji";
import {hasMessageImage, messageCaption} from "./message";
import type {ConversationInput, MessageInput} from "./schema";

/** Множитель длительности переписки */
export const TIMING_SCALE = 0.5;

/** Маркер в Remotion bundle — при смене тайминга обновить и проверку в bundle-cache.mjs */
export const TIMING_BUNDLE_MARKER = "timing-scale-050-v1";

/** Маркер hook-плашки и zoom финала — обновить в bundle-cache.mjs */
export const VIDEO_FEATURE_BUNDLE_MARKER = "hook-overlay-2s-v1";

export const scaleTimingMs = (ms: number): number =>
  Math.max(1, Math.round(ms * TIMING_SCALE));

const scaleTimingValue = scaleTimingMs;

export type ConversationTiming = {
  /** Пауза перед набором: база, мс */
  pauseBaseMs: number;
  /** + мс за каждый символ */
  pausePerCharMs: number;
  /** + мс за каждую доп. строку после первой */
  pausePerLineMs: number;
  /** them: база длительности «печатает…» */
  themTypingBaseMs: number;
  themTypingPerCharMs: number;
  /** me: база + мс на символ в поле ввода */
  meTypingBaseMs: number;
  meTypingPerCharMs: number;
  /** Пауза после появления пузыря перед следующим сообщением */
  postRevealBaseMs: number;
  postRevealPerCharMs: number;
  minTypingMs: number;
  maxTypingMs: number;
  minPauseMs: number;
  maxPauseMs: number;
  minPostRevealMs: number;
  maxPostRevealMs: number;
};

/** Базовые коэффициенты до TIMING_SCALE; длинные реплики сильнее зависят от *PerCharMs */
export const DEFAULT_TIMING: ConversationTiming = {
  pauseBaseMs: 420,
  pausePerCharMs: 8,
  pausePerLineMs: 140,
  themTypingBaseMs: 850,
  themTypingPerCharMs: 26,
  meTypingBaseMs: 340,
  meTypingPerCharMs: 44,
  postRevealBaseMs: 650,
  postRevealPerCharMs: 11,
  minTypingMs: 520,
  maxTypingMs: 7000,
  minPauseMs: 260,
  maxPauseMs: 2500,
  minPostRevealMs: 580,
  maxPostRevealMs: 2000,
};

const IMAGE_ONLY_THEM_TYPING_MS = 900;
const IMAGE_ONLY_ME_TYPING_MS = 380;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lineCount = (text: string): number => Math.max(1, text.split("\n").length);

const punctuationPauseCount = (text: string): number =>
  [...text].filter((char) => /[,.!?…:;]/.test(char) || char === "\n").length;

/** Доп. время на «человечные» микропаузы у собеседника (в базовых мс, до TIMING_SCALE) */
const themMicroPauseMs = (text: string): number => {
  const chars = charCount(text);
  return Math.floor(chars / 5) * 35 + punctuationPauseCount(text) * 55;
};

/** Доп. время под неровный набор в поле ввода (в базовых мс, до TIMING_SCALE) */
const meMicroPauseMs = (text: string): number => {
  const chars = charCount(text);
  return Math.floor(chars / 4) * 25 + punctuationPauseCount(text) * 45;
};

const scaleTimingConfig = (config: ConversationTiming): ConversationTiming => {
  const scaled = {} as ConversationTiming;
  (Object.keys(config) as (keyof ConversationTiming)[]).forEach((key) => {
    scaled[key] = scaleTimingValue(config[key]);
  });
  return scaled;
};

export type ResolvedMessageTiming = {
  pauseBeforeMs: number;
  typingMs: number;
  postRevealMs: number;
  charLength: number;
};

export const resolveMessageTiming = (
  message: MessageInput,
  timing: ConversationTiming,
): ResolvedMessageTiming => {
  const caption = messageCaption(message);
  const chars = charCount(caption);
  const lines = lineCount(caption || " ");

  if (hasMessageImage(message)) {
    const autoPause = clamp(
      timing.pauseBaseMs + timing.pausePerCharMs * chars + timing.pausePerLineMs * (lines - 1),
      timing.minPauseMs,
      timing.maxPauseMs,
    );

    const autoTypingBase =
      chars > 0
        ? message.author === "them"
          ? timing.themTypingBaseMs +
            timing.themTypingPerCharMs * chars +
            scaleTimingValue(themMicroPauseMs(caption))
          : timing.meTypingBaseMs +
            timing.meTypingPerCharMs * chars +
            scaleTimingValue(meMicroPauseMs(caption))
        : message.author === "them"
          ? scaleTimingValue(IMAGE_ONLY_THEM_TYPING_MS)
          : scaleTimingValue(IMAGE_ONLY_ME_TYPING_MS);

    const autoTyping = clamp(autoTypingBase, timing.minTypingMs, timing.maxTypingMs);

    const autoPostReveal = clamp(
      timing.postRevealBaseMs + scaleTimingValue(520) + timing.postRevealPerCharMs * chars,
      timing.minPostRevealMs,
      timing.maxPostRevealMs,
    );

    return {
      pauseBeforeMs:
        message.pauseBeforeMs !== undefined ? scaleTimingValue(message.pauseBeforeMs) : autoPause,
      typingMs: message.typingMs !== undefined ? scaleTimingValue(message.typingMs) : autoTyping,
      postRevealMs: autoPostReveal,
      charLength: chars,
    };
  }

  const autoPause = clamp(
    timing.pauseBaseMs + timing.pausePerCharMs * chars + timing.pausePerLineMs * (lines - 1),
    timing.minPauseMs,
    timing.maxPauseMs,
  );

  const autoTypingBase =
    message.author === "them"
      ? timing.themTypingBaseMs +
        timing.themTypingPerCharMs * chars +
        scaleTimingValue(themMicroPauseMs(caption))
      : timing.meTypingBaseMs +
        timing.meTypingPerCharMs * chars +
        scaleTimingValue(meMicroPauseMs(caption));

  const autoTyping = clamp(autoTypingBase, timing.minTypingMs, timing.maxTypingMs);

  const autoPostReveal = clamp(
    timing.postRevealBaseMs + timing.postRevealPerCharMs * chars,
    timing.minPostRevealMs,
    timing.maxPostRevealMs,
  );

  return {
    pauseBeforeMs:
      message.pauseBeforeMs !== undefined ? scaleTimingValue(message.pauseBeforeMs) : autoPause,
    typingMs: message.typingMs !== undefined ? scaleTimingValue(message.typingMs) : autoTyping,
    postRevealMs: autoPostReveal,
    charLength: chars,
  };
};

export const mergeConversationTiming = (conversation: ConversationInput): ConversationTiming =>
  scaleTimingConfig({...DEFAULT_TIMING, ...conversation.timing});

/** Суммарная длительность переписки в мс (без intro/outro/tail/fullscreen) */
export const estimateMessagesDurationMs = (conversation: ConversationInput): number => {
  const timing = mergeConversationTiming(conversation);
  return conversation.messages.reduce((total, message, index) => {
    const resolved = resolveMessageTiming(message, timing);
    const pauseBeforeMs = index === 0 ? 0 : resolved.pauseBeforeMs;
    return total + pauseBeforeMs + resolved.typingMs + resolved.postRevealMs;
  }, 0);
};
