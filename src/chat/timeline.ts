import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro, titleCardDurationFrames} from "./title-card";
import {mergeConversationTiming, resolveMessageTiming, scaleTimingMs, TIMING_BUNDLE_MARKER} from "./timing";
import {isStorySplitLayout, mergeStoryConfig, messageHasStoryImage} from "./story";
import type {ConversationInput} from "./schema";
import {msToFrames} from "./fps";

/** Пауза на последнем кадре переписки перед заставками (музыка доигрывает в этот хвост) */
export const POST_LAST_MESSAGE_TAIL_MS = 8000;

/** Маркер хвоста / мгновенного крючка — обновить в bundle-cache.mjs */
export const TIMELINE_TAIL_MARKER = "tail-8000-story-split-v1";

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
export const FULLSCREEN_TIMELINE_REV = "fs-story-split-v1";

/** Маркер story-split таймлайна в bundle */
export const STORY_SPLIT_TIMELINE_REV = "story-depth-parallax-v2";

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

export type StorySceneTimelineEvent = {
  messageIndex: number;
  image: string;
  startFrame: number;
  endFrame: number;
};

export type StoryTimeline = {
  enabled: boolean;
  openingImage?: string;
  openingStartFrame: number;
  openingEndFrame: number;
  splitStartFrame: number;
  splitCompleteFrame: number;
  splitTransitionFrames: number;
  topPanelRatio: number;
  openingAnimation: "parallax" | "kenburns" | "none";
  depthParallax: boolean;
  sceneEvents: StorySceneTimelineEvent[];
};

export type ConversationTimeline = {
  events: MessageTimelineEvent[];
  introDurationFrames: number;
  outroStartFrame: number;
  outroDurationFrames: number;
  endCardStartFrame: number;
  endCardDurationFrames: number;
  durationInFrames: number;
  story: StoryTimeline;
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
  const storySplit = isStorySplitLayout(conversation);
  const storyConfig = mergeStoryConfig(conversation);
  const disableMessageFullscreen = storySplit && storyConfig.disableMessageFullscreen;

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
    const fullscreenDelayFrames =
      hasImage && !disableMessageFullscreen ? msToFrames(scaleTimingMs(IMAGE_FULLSCREEN_DELAY_MS)) : 0;
    const fullscreenFrames =
      hasImage && !disableMessageFullscreen ? msToFrames(scaleTimingMs(IMAGE_FULLSCREEN_MS)) : 0;
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

  const story = buildStoryTimeline(conversation, events, introFrames, outroStart);

  return {
    events,
    introDurationFrames: introFrames,
    outroStartFrame: outroStart,
    outroDurationFrames: outroFrames,
    endCardStartFrame: endCardStart,
    endCardDurationFrames: endCardFrames,
    durationInFrames: outroStart + outroFrames,
    story,
  };
};

const buildStoryTimeline = (
  conversation: ConversationInput,
  events: MessageTimelineEvent[],
  introFrames: number,
  chatEndFrame: number,
): StoryTimeline => {
  const disabled: StoryTimeline = {
    enabled: false,
    openingStartFrame: 0,
    openingEndFrame: 0,
    splitStartFrame: 0,
    splitCompleteFrame: 0,
    splitTransitionFrames: 0,
    topPanelRatio: 0.45,
    openingAnimation: "parallax",
    depthParallax: true,
    sceneEvents: [],
  };

  if (!isStorySplitLayout(conversation)) {
    return disabled;
  }

  const storyConfig = mergeStoryConfig(conversation);
  const openingStartFrame = introFrames;
  const openingDurationFrames = msToFrames(scaleTimingMs(storyConfig.opening.durationMs));
  const splitTransitionFrames = msToFrames(scaleTimingMs(storyConfig.splitTransitionMs));
  const openingEndFrame = openingStartFrame + openingDurationFrames;
  const splitStartFrame = openingEndFrame;
  const splitCompleteFrame = splitStartFrame + splitTransitionFrames;

  const sceneEvents: StorySceneTimelineEvent[] = [];
  const sceneIndices = conversation.messages
    .map((message, index) => (messageHasStoryImage(message) ? index : -1))
    .filter((index) => index >= 0);

  sceneIndices.forEach((messageIndex, sceneOrder) => {
    const message = conversation.messages[messageIndex];
    const image = message.storyImage?.trim();
    if (!image) {
      return;
    }

    const startFrame = Math.max(events[messageIndex]?.revealFrame ?? splitCompleteFrame, splitCompleteFrame);
    const nextSceneIndex = sceneIndices[sceneOrder + 1];
    const endFrame =
      nextSceneIndex !== undefined
        ? (events[nextSceneIndex]?.revealFrame ?? chatEndFrame)
        : chatEndFrame;

    sceneEvents.push({
      messageIndex,
      image,
      startFrame,
      endFrame,
    });
  });

  return {
    enabled: true,
    openingImage: storyConfig.opening.image,
    openingStartFrame,
    openingEndFrame,
    splitStartFrame,
    splitCompleteFrame,
    splitTransitionFrames,
    topPanelRatio: storyConfig.topPanelRatio,
    openingAnimation: storyConfig.opening.animation,
    depthParallax: storyConfig.depthParallax,
    sceneEvents,
  };
};

export const activeStorySceneAtFrame = (
  story: StoryTimeline,
  frame: number,
): StorySceneTimelineEvent | undefined => {
  if (!story.enabled || frame < story.splitCompleteFrame) {
    return undefined;
  }

  const active = story.sceneEvents.filter(
    (event) => frame >= event.startFrame && frame < event.endFrame,
  );
  return active[active.length - 1];
};

export const storyImageAtFrame = (story: StoryTimeline, frame: number): string | undefined => {
  if (!story.enabled) {
    return undefined;
  }

  if (frame < story.splitStartFrame) {
    return story.openingImage;
  }

  const scene = activeStorySceneAtFrame(story, frame);
  if (scene?.image) {
    return scene.image;
  }

  const lastSceneBefore = [...story.sceneEvents]
    .reverse()
    .find((event) => frame >= event.startFrame);
  if (lastSceneBefore?.image) {
    return lastSceneBefore.image;
  }

  return story.openingImage;
};

export const visibleMessageCountAtFrame = (
  events: MessageTimelineEvent[],
  frame: number,
  introDurationFrames = 0,
  story?: StoryTimeline,
): number => {
  const storyGate = story?.enabled ? story.splitCompleteFrame : introDurationFrames;
  if (frame < storyGate) {
    return 0;
  }
  return events.filter((event) => frame >= event.revealFrame).length;
};

/** Кадр для JPG-превью без фото: финальная реплика в чате */
export const pickThumbnailFrame = (
  timeline: ConversationTimeline,
  durationInFrames: number,
): number => {
  const events = timeline.events;
  const maxFrame = Math.max(0, durationInFrames - 1);

  const hookFrame = events[0]?.revealFrame ?? 0;
  const finaleFrame = events[events.length - 1]?.revealFrame ?? hookFrame;
  return Math.min(finaleFrame, Math.max(hookFrame, maxFrame));
};
