import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro, titleCardDurationFrames} from "./title-card";
import {mergeConversationTiming, resolveMessageTiming} from "./timing";
import type {ConversationInput} from "./schema";

const FPS = 60;
const msToFrames = (ms: number): number => Math.max(1, Math.round((ms / 1000) * FPS));

/** Пауза на последнем кадре переписки перед заставками (без TIMING_SCALE) */
export const POST_LAST_MESSAGE_TAIL_MS = 3000;

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
    const endFrame = revealFrame + postRevealFrames;

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
