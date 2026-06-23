import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro, titleCardDurationFrames} from "./title-card";
import {mergeConversationTiming, resolveMessageTiming, scaleTimingMs, TIMING_BUNDLE_MARKER} from "./timing";
import type {ConversationInput} from "./schema";
import {msToFrames} from "./fps";

/** Пауза на последнем кадре переписки перед заставками (музыка доигрывает в этот хвост) */
export const POST_LAST_MESSAGE_TAIL_MS = 8000;

/** Маркер хвоста / мгновенного крючка — обновить в bundle-cache.mjs */
export const TIMELINE_TAIL_MARKER = "tail-8000-instant-hook-v1";

/** Пауза в чате после появления фото, до полноэкранного показа */
export const IMAGE_FULLSCREEN_DELAY_MS = 2000;

/** Полноэкранный показ фото */
export const IMAGE_FULLSCREEN_MS = 3000;

/** Для проверки актуальности bundle (scripts/bundle-cache.mjs) */
export const TIMELINE_TIMING_MARKER = TIMING_BUNDLE_MARKER;

/**
 * Ревизия таймлайна fullscreen — попадает в Remotion bundle для проверки кэша.
 * При смене задержки/логики увеличить и обновить маркер в scripts/bundle-cache.mjs.
 */
export const FULLSCREEN_TIMELINE_REV = "fs-delay-2000-v2";

export type MessageTimelineEvent = {
  index: number;
  author: "me" | "them";
  text: string;
  image?: string;
  sentAt: string;
  startFrame: number;
  typingStartFrame: number;
  typingEndFrame: number;
  revealFrame: number;
  /** Кадр начала полноэкранного показа (reveal + задержка) */
  fullscreenStartFrame: number;
  /** Кадр, когда заканчивается полноэкранный показ (только для сообщений с image) */
  fullscreenEndFrame: number;
  fullscreenFrames: number;
  endFrame: number;
  pauseFrames: number;
  typingFrames: number;
};

export type ConversationTimeline = {
  events: MessageTimelineEvent[];
  introDurationFrames: number;
  outroStartFrame: number;
  outroDurationFrames: number;
  endCardStartFrame: number;
  endCardDurationFrames: number;
  durationInFrames: number;
};

export const getStatusBarTime = (
  events: MessageTimelineEvent[],
  visibleCount: number,
  activeEvent: MessageTimelineEvent | undefined,
): string => {
  const fallback = events[0]?.sentAt ?? "12:34";
  if (activeEvent?.sentAt) {
    return activeEvent.sentAt;
  }
  if (visibleCount > 0) {
    return events[visibleCount - 1]?.sentAt ?? fallback;
  }
  return fallback;
};

export const buildTimeline = (conversation: ConversationInput): ConversationTimeline => {
  const intro = mergeIntro(conversation);
  const endCard = mergeEndCard(conversation);
  const introFrames = intro.enabled ? titleCardDurationFrames(intro) : 0;

  const events: MessageTimelineEvent[] = [];
  let cursor = introFrames;
  const timingConfig = mergeConversationTiming(conversation);

  conversation.messages.forEach((message, index) => {
    const resolved = resolveMessageTiming(message, timingConfig);
    const pauseFrames = index === 0 ? 0 : msToFrames(resolved.pauseBeforeMs);
    const typingFrames = index === 0 ? 0 : msToFrames(resolved.typingMs);
    const postRevealFrames = msToFrames(resolved.postRevealMs);
    const typingStartFrame = cursor + pauseFrames;
    const typingEndFrame = typingStartFrame + typingFrames;
    const revealFrame = typingEndFrame;
    const hasImage = Boolean(message.image?.trim());
    const fullscreenDelayFrames = hasImage ? msToFrames(scaleTimingMs(IMAGE_FULLSCREEN_DELAY_MS)) : 0;
    const fullscreenFrames = hasImage ? msToFrames(scaleTimingMs(IMAGE_FULLSCREEN_MS)) : 0;
    const fullscreenStartFrame = revealFrame + fullscreenDelayFrames;
    const fullscreenEndFrame = fullscreenStartFrame + fullscreenFrames;
    const endFrame = fullscreenEndFrame + postRevealFrames;

    events.push({
      index,
      author: message.author,
      text: message.text ?? "",
      image: message.image,
      sentAt: message.sentAt,
      startFrame: cursor,
      typingStartFrame,
      typingEndFrame,
      revealFrame,
      fullscreenStartFrame,
      fullscreenEndFrame,
      fullscreenFrames,
      endFrame,
      pauseFrames,
      typingFrames,
    });

    cursor = endFrame;
  });

  const outro = mergeConversationOutro(conversation);
  const tailFrames = msToFrames(scaleTimingMs(POST_LAST_MESSAGE_TAIL_MS));
  const outroPause = outro.enabled ? outroPauseFrames(outro) : 0;
  const endCardFrames = endCard.enabled ? titleCardDurationFrames(endCard) : 0;
  const endCardStart = cursor + tailFrames + outroPause;
  const outroFrames = outro.enabled ? outroDurationFrames(outro) : 0;
  const outroStart = endCardStart + endCardFrames;

  return {
    events,
    introDurationFrames: introFrames,
    outroStartFrame: outroStart,
    outroDurationFrames: outroFrames,
    endCardStartFrame: endCardStart,
    endCardDurationFrames: endCardFrames,
    durationInFrames: outroStart + outroFrames,
  };
};

export const visibleMessageCountAtFrame = (
  events: MessageTimelineEvent[],
  frame: number,
  introDurationFrames = 0,
): number => {
  if (frame < introDurationFrames) {
    return 0;
  }
  return events.filter((event) => frame >= event.revealFrame).length;
};
