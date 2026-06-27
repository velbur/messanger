import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro} from "./title-card";
import {
  getTimingSpeed,
  mergeConversationTiming,
  resolveMessageTiming,
  scaleConversationMs,
  scaleTimingMs,
  TIMING_BUNDLE_MARKER,
} from "./timing";
import {getStoryPresentation, isStoryVisualLayout, mergeStoryConfig, messageHasStoryImage, STORY_VIDEO_BUNDLE_MARKER} from "./story";
import {resolveStoryVideoLoop} from "./story-video-mode";
import {mergeStorySfxConfig, resolveStorySfxCues, SFX_BUNDLE_MARKER, SFX_MIX_BUNDLE_MARKER, type ResolvedStorySfxCue} from "./sfx";
import {mergeConversationVoiceover, messageHasVoiceover, VOICEOVER_BUNDLE_MARKER} from "./voiceover";
import type {ConversationInput} from "./schema";
import {msToFrames, FPS} from "./fps";

/** Пауза на последнем кадре переписки перед заставками (музыка доигрывает в этот хвост) */
export const POST_LAST_MESSAGE_TAIL_MS = 8000;

/** Маркер хвоста в bundle — обновить в bundle-cache.mjs */
export const TIMELINE_TAIL_MARKER = "tail-8000-story-split-v1";

/** Маркер глобального timingSpeed в таймлайне — обновить в bundle-cache.mjs */
export const TIMING_SPEED_TIMELINE_MARKER = "timing-speed-v1";

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
export const STORY_SPLIT_TIMELINE_REV = "story-immediate-first-v1";

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
  voiceAudio?: string;
  voiceDurationMs?: number;
  voiceDurationFrames: number;
};

export type StorySceneTimelineEvent = {
  messageIndex: number;
  image: string;
  video?: string;
  videoDurationMs?: number;
  videoLoop: boolean;
  startFrame: number;
  endFrame: number;
  sfx: ResolvedStorySfxCue[];
};

export type StoryTimeline = {
  enabled: boolean;
  presentation: "split" | "overlay";
  openingImage?: string;
  openingVideo?: string;
  openingVideoDurationMs?: number;
  openingVideoLoop: boolean;
  openingStartFrame: number;
  openingEndFrame: number;
  /** До какого кадра играют loop-SFX заставки (пока на экране opening-кадр) */
  openingSfxEndFrame: number;
  splitStartFrame: number;
  splitCompleteFrame: number;
  splitTransitionFrames: number;
  topPanelRatio: number;
  openingAnimation: "video" | "none";
  openingSfx: ResolvedStorySfxCue[];
  sfxMasterVolume: number;
  /** Premix всех story-SFX для Remotion */
  sfxMixSrc?: string;
  sfxEnabled: boolean;
  /** Первое сообщение со story-кадром — без отдельной заставки opening */
  immediateFirstScene: boolean;
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
  void TIMING_SPEED_TIMELINE_MARKER;
  void TIMELINE_TAIL_MARKER;
  void VOICEOVER_BUNDLE_MARKER;
  void STORY_VIDEO_BUNDLE_MARKER;
  void SFX_BUNDLE_MARKER;
  void SFX_MIX_BUNDLE_MARKER;
  const intro = mergeIntro(conversation);
  const endCard = mergeEndCard(conversation);
  const introFrames = intro.enabled
    ? msToFrames(scaleConversationMs(conversation, intro.durationMs))
    : 0;
  const storyVisual = isStoryVisualLayout(conversation);
  const storyConfig = mergeStoryConfig(conversation);
  const disableMessageFullscreen = storyVisual && storyConfig.disableMessageFullscreen;

  const events: MessageTimelineEvent[] = [];
  let cursor = introFrames;
  const timingConfig = mergeConversationTiming(conversation);
  const timingSpeed = getTimingSpeed(conversation);
  const voiceover = mergeConversationVoiceover(conversation);
  const voicePaddingMs = scaleTimingMs(200);

  conversation.messages.forEach((message, index) => {
    let resolved = resolveMessageTiming(message, timingConfig, timingSpeed);
    if (voiceover.enabled && messageHasVoiceover(message)) {
      const voiceMinPostRevealMs = (message.voiceDurationMs ?? 0) + voicePaddingMs;
      if (voiceMinPostRevealMs > resolved.postRevealMs) {
        resolved = {...resolved, postRevealMs: voiceMinPostRevealMs};
      }
    }
    const pauseFrames = index === 0 ? 0 : msToFrames(resolved.pauseBeforeMs);
    const typingFrames = index === 0 ? 0 : msToFrames(resolved.typingMs);
    const postRevealFrames = msToFrames(resolved.postRevealMs);
    const typingStartFrame = cursor + pauseFrames;
    const typingEndFrame = typingStartFrame + typingFrames;
    const revealFrame = typingEndFrame;
    const hasImage = Boolean(message.image?.trim());
    const fullscreenDelayFrames =
      hasImage && !disableMessageFullscreen
        ? msToFrames(scaleConversationMs(conversation, IMAGE_FULLSCREEN_DELAY_MS))
        : 0;
    const fullscreenFrames =
      hasImage && !disableMessageFullscreen
        ? msToFrames(scaleConversationMs(conversation, IMAGE_FULLSCREEN_MS))
        : 0;
    const fullscreenStartFrame = revealFrame + fullscreenDelayFrames;
    const fullscreenEndFrame = fullscreenStartFrame + fullscreenFrames;
    const endFrame = fullscreenEndFrame + postRevealFrames;
    const voiceDurationMs =
      voiceover.enabled && message.voiceAudio?.trim() ? message.voiceDurationMs : undefined;
    const voiceDurationFrames = voiceDurationMs ? msToFrames(voiceDurationMs) : 0;

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
      voiceAudio:
        voiceover.enabled && message.voiceAudio?.trim() ? message.voiceAudio.trim() : undefined,
      voiceDurationMs,
      voiceDurationFrames,
    });

    cursor = endFrame;
  });

  const outro = mergeConversationOutro(conversation);
  const tailFrames = msToFrames(scaleConversationMs(conversation, POST_LAST_MESSAGE_TAIL_MS));
  const outroPause = outro.enabled ? outroPauseFrames(outro, conversation) : 0;
  const endCardFrames = endCard.enabled
    ? msToFrames(scaleConversationMs(conversation, endCard.durationMs))
    : 0;
  const endCardStart = cursor + tailFrames + outroPause;
  const outroFrames = outro.enabled ? outroDurationFrames(outro, conversation) : 0;
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
    presentation: "split",
    openingStartFrame: 0,
    openingEndFrame: 0,
    openingSfxEndFrame: 0,
    splitStartFrame: 0,
    splitCompleteFrame: 0,
    splitTransitionFrames: 0,
    topPanelRatio: 0.45,
    openingAnimation: "video",
    openingSfx: [],
    sfxMasterVolume: 1,
    sfxMixSrc: undefined,
    sfxEnabled: false,
    openingVideoLoop: true,
    immediateFirstScene: false,
    sceneEvents: [],
  };

  if (!isStoryVisualLayout(conversation)) {
    return disabled;
  }

  const presentation = getStoryPresentation(conversation) ?? "split";

  const storyConfig = mergeStoryConfig(conversation);
  const sfxConfig = mergeStorySfxConfig(conversation);
  const firstMessage = conversation.messages[0];
  const firstHasStory = Boolean(firstMessage && messageHasStoryImage(firstMessage));
  const firstRevealFrame = events[0]?.revealFrame ?? introFrames;
  const immediateFirstScene = firstHasStory;

  const openingStartFrame = introFrames;
  let openingDurationFrames = msToFrames(
    scaleConversationMs(conversation, storyConfig.opening.durationMs),
  );
  let splitTransitionFrames = msToFrames(
    scaleConversationMs(conversation, storyConfig.splitTransitionMs),
  );

  if (immediateFirstScene) {
    openingDurationFrames = 0;
    splitTransitionFrames = 0;
  }

  const openingEndFrame = openingStartFrame + openingDurationFrames;
  const splitStartFrame = openingEndFrame;
  const splitCompleteFrame = immediateFirstScene
    ? firstRevealFrame
    : splitStartFrame + splitTransitionFrames;

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

    const startFrame =
      messageIndex === 0 && immediateFirstScene
        ? firstRevealFrame
        : Math.max(events[messageIndex]?.revealFrame ?? splitCompleteFrame, splitCompleteFrame);
    const nextSceneIndex = sceneIndices[sceneOrder + 1];
    const endFrame =
      nextSceneIndex !== undefined
        ? (events[nextSceneIndex]?.revealFrame ?? chatEndFrame)
        : chatEndFrame;

    sceneEvents.push({
      messageIndex,
      image,
      video: message.storyVideo?.trim() || undefined,
      videoDurationMs: message.storyVideoDurationMs,
      videoLoop: resolveStoryVideoLoop(message.storyVideoLoop, message.storyImagePrompt),
      startFrame,
      endFrame,
      sfx: sfxConfig.enabled ? resolveStorySfxCues(message.storySfx) : [],
    });
  });

  const openingSfx =
    sfxConfig.enabled && conversation.story?.opening?.storySfx
      ? resolveStorySfxCues(conversation.story.opening.storySfx)
      : [];

  const openingSfxEndFrame =
    sceneEvents.length > 0
      ? sceneEvents[0].startFrame
      : immediateFirstScene
        ? openingEndFrame
        : Math.max(openingEndFrame, splitCompleteFrame);

  return {
    enabled: true,
    presentation,
    openingImage: storyConfig.opening.image,
    openingVideo: storyConfig.opening.storyVideo,
    openingVideoDurationMs: storyConfig.opening.storyVideoDurationMs,
    openingVideoLoop: resolveStoryVideoLoop(
      conversation.story?.opening?.storyVideoLoop,
      conversation.story?.opening?.imagePrompt,
    ),
    openingStartFrame,
    openingEndFrame,
    openingSfxEndFrame,
    splitStartFrame,
    splitCompleteFrame,
    splitTransitionFrames,
    topPanelRatio: storyConfig.topPanelRatio,
    openingAnimation: storyConfig.opening.animation,
    openingSfx,
    sfxMasterVolume: sfxConfig.masterVolume,
    sfxMixSrc: sfxConfig.enabled
      ? conversation.story?.sfxMix?.trim() || undefined
      : undefined,
    sfxEnabled: sfxConfig.enabled,
    immediateFirstScene,
    sceneEvents,
  };
};

export const activeStorySceneAtFrame = (
  story: StoryTimeline,
  frame: number,
): StorySceneTimelineEvent | undefined => {
  if (!story.enabled) {
    return undefined;
  }

  if (frame < story.splitCompleteFrame) {
    if (story.immediateFirstScene) {
      return story.sceneEvents.find((event) => event.messageIndex === 0);
    }
    return undefined;
  }

  const active = story.sceneEvents.filter(
    (event) => frame >= event.startFrame && frame < event.endFrame,
  );
  return active[active.length - 1];
};

/** Окно Sequence для story-видео/анимации — совпадает с тем, что реально на экране */
export const resolveStorySceneTiming = (
  story: StoryTimeline,
  frame: number,
  outroStartFrame: number,
): {startFrame: number; endFrame: number} => {
  if (!story.enabled) {
    return {startFrame: 0, endFrame: outroStartFrame};
  }

  if (story.immediateFirstScene) {
    const scene =
      activeStorySceneAtFrame(story, frame) ??
      story.sceneEvents.find((event) => event.messageIndex === 0);
    return {
      startFrame: scene?.startFrame ?? story.openingStartFrame,
      endFrame: scene?.endFrame ?? outroStartFrame,
    };
  }

  const activeScene = activeStorySceneAtFrame(story, frame);
  if (activeScene) {
    return {startFrame: activeScene.startFrame, endFrame: activeScene.endFrame};
  }

  const firstStoryScene = story.sceneEvents[0];
  const firstSceneStart = firstStoryScene?.startFrame ?? outroStartFrame;

  if (frame < firstSceneStart && (story.openingVideo || story.openingImage)) {
    return {startFrame: story.openingStartFrame, endFrame: firstSceneStart};
  }

  const lastSceneBefore = [...story.sceneEvents]
    .reverse()
    .find((event) => frame >= event.startFrame);
  if (lastSceneBefore) {
    const nextScene = story.sceneEvents.find(
      (event) => event.startFrame > lastSceneBefore.startFrame,
    );
    return {
      startFrame: lastSceneBefore.startFrame,
      endFrame: nextScene?.startFrame ?? outroStartFrame,
    };
  }

  if (frame < story.splitCompleteFrame) {
    return {
      startFrame: story.openingStartFrame,
      endFrame: story.splitCompleteFrame,
    };
  }

  return {
    startFrame: story.splitCompleteFrame,
    endFrame: outroStartFrame,
  };
};

const firstSceneMedia = (story: StoryTimeline) =>
  story.sceneEvents.find((event) => event.messageIndex === 0);

export const storyImageAtFrame = (story: StoryTimeline, frame: number): string | undefined => {
  if (!story.enabled) {
    return undefined;
  }

  if (frame < story.splitStartFrame) {
    if (story.immediateFirstScene) {
      return firstSceneMedia(story)?.image ?? story.openingImage;
    }
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

export const storyVideoAtFrame = (story: StoryTimeline, frame: number): string | undefined => {
  if (!story.enabled) {
    return undefined;
  }

  if (frame < story.splitStartFrame) {
    if (story.immediateFirstScene) {
      return firstSceneMedia(story)?.video ?? story.openingVideo;
    }
    return story.openingVideo;
  }

  const scene = activeStorySceneAtFrame(story, frame);
  if (scene?.video) {
    return scene.video;
  }

  const lastSceneBefore = [...story.sceneEvents]
    .reverse()
    .find((event) => frame >= event.startFrame);
  if (lastSceneBefore?.video) {
    return lastSceneBefore.video;
  }

  return story.openingVideo;
};

export const storyVideoDurationMsAtFrame = (
  story: StoryTimeline,
  frame: number,
): number | undefined => {
  if (!story.enabled) {
    return undefined;
  }

  if (frame < story.splitStartFrame) {
    if (story.immediateFirstScene) {
      return firstSceneMedia(story)?.videoDurationMs ?? story.openingVideoDurationMs;
    }
    return story.openingVideoDurationMs;
  }

  const scene = activeStorySceneAtFrame(story, frame);
  if (scene?.videoDurationMs) {
    return scene.videoDurationMs;
  }

  const lastSceneBefore = [...story.sceneEvents]
    .reverse()
    .find((event) => frame >= event.startFrame);
  if (lastSceneBefore?.videoDurationMs) {
    return lastSceneBefore.videoDurationMs;
  }

  return story.openingVideoDurationMs;
};

export const storyVideoLoopAtFrame = (story: StoryTimeline, frame: number): boolean => {
  if (!story.enabled) {
    return true;
  }

  if (frame < story.splitStartFrame) {
    if (story.immediateFirstScene) {
      return firstSceneMedia(story)?.videoLoop ?? story.openingVideoLoop;
    }
    return story.openingVideoLoop;
  }

  const scene = activeStorySceneAtFrame(story, frame);
  if (scene) {
    return scene.videoLoop;
  }

  const lastSceneBefore = [...story.sceneEvents]
    .reverse()
    .find((event) => frame >= event.startFrame);
  if (lastSceneBefore) {
    return lastSceneBefore.videoLoop;
  }

  return story.openingVideoLoop;
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
export const estimateVideoDurationMs = (conversation: ConversationInput): number => {
  const timeline = buildTimeline(conversation);
  return (timeline.durationInFrames / FPS) * 1000;
};

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
