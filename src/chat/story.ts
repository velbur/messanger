import type {ConversationInput} from "./schema";

export const STORY_VIDEO_BUNDLE_MARKER = "story-motion-parallax-v12";

export type StorySceneAnimation = "video" | "none" | "kenburns" | "parallax" | "depthParallax";

export type StoryOpeningConfig = {
  image?: string;
  imagePrompt?: string;
  storyVideo?: string;
  storyVideoDurationMs?: number;
  durationMs: number;
  animation: StorySceneAnimation;
};

export type StoryConfig = {
  opening: StoryOpeningConfig;
  /** Длина одного бесшовного цикла Ken Burns / parallax, сек */
  motionLoopSec: number;
  splitTransitionMs: number;
  topPanelRatio: number;
  disableMessageFullscreen: boolean;
};

const DEFAULT_OPENING: StoryOpeningConfig = {
  durationMs: 2500,
  animation: "video",
};

const DEFAULT_STORY: StoryConfig = {
  opening: DEFAULT_OPENING,
  motionLoopSec: 3,
  splitTransitionMs: 600,
  topPanelRatio: 0.45,
  disableMessageFullscreen: true,
};

const coerceStoryAnimation = (value: unknown): StorySceneAnimation => {
  if (
    value === "none" ||
    value === "kenburns" ||
    value === "parallax" ||
    value === "depthParallax"
  ) {
    return value;
  }
  return "video";
};

export const shouldGenerateStoryVideos = (conversation: ConversationInput): boolean =>
  isStoryVisualLayout(conversation) &&
  mergeStoryConfig(conversation).opening.animation === "video";

export const mergeStoryConfig = (conversation: ConversationInput): StoryConfig => {
  const raw = conversation.story;
  const openingRaw = raw?.opening;

  return {
    opening: {
      ...DEFAULT_OPENING,
      ...openingRaw,
      image: openingRaw?.image?.trim() || undefined,
      imagePrompt: openingRaw?.imagePrompt?.trim() || undefined,
      storyVideo: openingRaw?.storyVideo?.trim() || undefined,
      storyVideoDurationMs: openingRaw?.storyVideoDurationMs,
      animation: coerceStoryAnimation(openingRaw?.animation),
    },
    motionLoopSec:
      typeof raw?.motionLoopSec === "number" && raw.motionLoopSec >= 2 && raw.motionLoopSec <= 8
        ? raw.motionLoopSec
        : DEFAULT_STORY.motionLoopSec,
    splitTransitionMs: raw?.splitTransitionMs ?? DEFAULT_STORY.splitTransitionMs,
    topPanelRatio: raw?.topPanelRatio ?? DEFAULT_STORY.topPanelRatio,
    disableMessageFullscreen: raw?.disableMessageFullscreen ?? DEFAULT_STORY.disableMessageFullscreen,
  };
};

export const isStorySplitLayout = (conversation: ConversationInput): boolean =>
  conversation.layout === "storySplit";

export const isStoryOverlayLayout = (conversation: ConversationInput): boolean =>
  conversation.layout === "storyOverlay";

export const isStoryVisualLayout = (conversation: ConversationInput): boolean =>
  isStorySplitLayout(conversation) || isStoryOverlayLayout(conversation);

export type StoryPresentation = "split" | "overlay";

export const getStoryPresentation = (conversation: ConversationInput): StoryPresentation | null => {
  if (isStoryOverlayLayout(conversation)) {
    return "overlay";
  }
  if (isStorySplitLayout(conversation)) {
    return "split";
  }
  return null;
};

export const messageHasStoryImage = (
  message: ConversationInput["messages"][number],
): boolean => Boolean(message.storyImage?.trim() || message.storyImagePrompt?.trim());

/** В story-режимах визуал в сюжете — убираем фото из пузырей чата. */
export const stripChatBubbleImages = (conversation: ConversationInput): ConversationInput => {
  if (!isStoryVisualLayout(conversation)) {
    return conversation;
  }

  return {
    ...conversation,
    messages: conversation.messages.map((message) => {
      const next = {...message};
      delete next.image;
      delete next.imagePrompt;
      delete next.imageEditPrompt;
      return next;
    }),
  };
};
