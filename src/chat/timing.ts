import {charCount} from "./emoji";
import {hasMessageImage, messageCaption} from "./message";
import type {ConversationInput, MessageInput} from "./schema";

/** Множитель длительности переписки (0.245 = на 50% быстрее прежнего 0.49) */
export const TIMING_SCALE = 0.245;

/** Маркер в Remotion bundle — при смене тайминга обновить и проверку в bundle-cache.mjs */
export const TIMING_BUNDLE_MARKER = "timing-scale-0245-v1";

export const scaleTimingMs = (ms: number): number =>
  Math.max(1, Math.round(ms * TIMING_SCALE));

const scaleMs = scaleTimingMs;

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

export const DEFAULT_TIMING: ConversationTiming = {
  pauseBaseMs: 520,
  pausePerCharMs: 12,
  pausePerLineMs: 175,
  themTypingBaseMs: 1050,
  themTypingPerCharMs: 42,
  meTypingBaseMs: 420,
  meTypingPerCharMs: 72,
  postRevealBaseMs: 820,
  postRevealPerCharMs: 18,
  minTypingMs: 680,
  maxTypingMs: 14000,
  minPauseMs: 320,
  maxPauseMs: 4200,
  minPostRevealMs: 750,
  maxPostRevealMs: 3400,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lineCount = (text: string): number => Math.max(1, text.split("\n").length);

const punctuationPauseCount = (text: string): number =>
  [...text].filter((char) => /[,.!?…:;]/.test(char) || char === "\n").length;

/** Доп. время на «человечные» микропаузы у собеседника */
const themMicroPauseMs = (text: string): number => {
  const chars = charCount(text);
  return Math.floor(chars / 5) * 55 + punctuationPauseCount(text) * 90;
};

/** Доп. время под неровный набор в поле ввода */
const meMicroPauseMs = (text: string): number => {
  const chars = charCount(text);
  return Math.floor(chars / 4) * 40 + punctuationPauseCount(text) * 70;
};

export type ResolvedMessageTiming = {
  pauseBeforeMs: number;
  typingMs: number;
  postRevealMs: number;
  charLength: number;
};

export const resolveMessageTiming = (
  message: MessageInput,
  timing: ConversationTiming = DEFAULT_TIMING,
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
          ? timing.themTypingBaseMs + timing.themTypingPerCharMs * chars + themMicroPauseMs(caption)
          : timing.meTypingBaseMs + timing.meTypingPerCharMs * chars + meMicroPauseMs(caption)
        : message.author === "them"
          ? 900
          : 380;

    const autoTyping = clamp(autoTypingBase, timing.minTypingMs, timing.maxTypingMs);

    const autoPostReveal = clamp(
      timing.postRevealBaseMs + 520 + timing.postRevealPerCharMs * chars,
      timing.minPostRevealMs,
      timing.maxPostRevealMs,
    );

    return {
      pauseBeforeMs:
        message.pauseBeforeMs !== undefined ? scaleMs(message.pauseBeforeMs) : scaleMs(autoPause),
      typingMs: message.typingMs !== undefined ? scaleMs(message.typingMs) : scaleMs(autoTyping),
      postRevealMs: scaleMs(autoPostReveal),
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
      ? timing.themTypingBaseMs + timing.themTypingPerCharMs * chars + themMicroPauseMs(caption)
      : timing.meTypingBaseMs + timing.meTypingPerCharMs * chars + meMicroPauseMs(caption);

  const autoTyping = clamp(autoTypingBase, timing.minTypingMs, timing.maxTypingMs);

  const autoPostReveal = clamp(
    timing.postRevealBaseMs + timing.postRevealPerCharMs * chars,
    timing.minPostRevealMs,
    timing.maxPostRevealMs,
  );

  return {
    pauseBeforeMs:
      message.pauseBeforeMs !== undefined ? scaleMs(message.pauseBeforeMs) : scaleMs(autoPause),
    typingMs: message.typingMs !== undefined ? scaleMs(message.typingMs) : scaleMs(autoTyping),
    postRevealMs: scaleMs(autoPostReveal),
    charLength: chars,
  };
};

export const mergeConversationTiming = (
  conversation: ConversationInput,
): ConversationTiming => ({
  ...DEFAULT_TIMING,
  ...conversation.timing,
});
