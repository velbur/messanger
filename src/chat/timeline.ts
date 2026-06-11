import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro, titleCardDurationFrames} from "./title-card";
import {mergeConversationTiming, resolveMessageTiming} from "./timing";
import type {ConversationInput} from "./schema";
import {msToFrames} from "./fps";

/** Пауза на последнем кадре переписки перед заставками (без TIMING_SCALE) */
export const POST_LAST_MESSAGE_TAIL_MS = 3000;

/** Пауза в чате после появления фото, до полноэкранного показа (без TIMING_SCALE) */
export const IMAGE_FULLSCREEN_DELAY_MS = 2000;

/** Полноэкранный показ фото (без TIMING_SCALE) */
export const IMAGE_FULLSCREEN_MS = 3000;

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

export const buildTimeline = (conversation: ConversationInput): ConversationTimeline => {
  const intro = mergeIntro(conversation);
  const endCard = mergeEndCard(conversation);
  const introFrames = intro.enabled ? titleCardDurationFrames(intro) : 0;

  const events: MessageTimelineEvent[] = [];
  let cursor = introFrames;
  const timingConfig = mergeConversationTiming(conversation);

  conversation.messages.forEach((message, index) => {
    const resolved = resolveMessageTiming(message, timingConfig);
    const pauseFrames = msToFrames(resolved.pauseBeforeMs);
    const typingFrames = msToFrames(resolved.typingMs);
    const postRevealFrames = msToFrames(resolved.postRevealMs);
    const typingStartFrame = cursor + pauseFrames;
    const typingEndFrame = typingStartFrame + typingFrames;
    const revealFrame = typingEndFrame;
    const hasImage = Boolean(message.image?.trim());
    const fullscreenDelayFrames = hasImage ? msToFrames(IMAGE_FULLSCREEN_DELAY_MS) : 0;
    const fullscreenFrames = hasImage ? msToFrames(IMAGE_FULLSCREEN_MS) : 0;
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
  const tailFrames = msToFrames(POST_LAST_MESSAGE_TAIL_MS);
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
