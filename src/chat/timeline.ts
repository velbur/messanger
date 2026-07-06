import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeEndCard, mergeIntro} from "./title-card";
import {mergePreviewCover, previewCoverDurationFrames, PREVIEW_COVER_BUNDLE_MARKER} from "./preview-cover";
import {
  getTimingSpeed,
  mergeConversationTiming,
  resolveMessageTiming,
  scaleConversationMs,
  scaleTimingMs,
  TIMING_BUNDLE_MARKER,
} from "./timing";
import {
  getStoryPresentation,
  isStoryVisualLayout,
  isStoryVideoOnlyAnimation,
  mergeStoryConfig,
  shouldGenerateStoryVideos,
  STORY_VIDEO_BUNDLE_MARKER,
  type StorySceneAnimation,
} from "./story";
import type {StoryColorFilter} from "./story-color-filter";
import {
  incomingSceneTransitionStyle,
  outgoingSceneTransitionStyle,
  sceneTransitionFlashOpacity,
  sceneTransitionProgress,
  storySceneTransitionFrames,
  type StorySceneTransition,
} from "./story-scene-transition";
import {isVideoLayout} from "./video";
import {resolveStoryVideoLoop} from "./story-video-mode";
import {mergeStorySfxConfig, resolveStorySfxCues, SFX_BUNDLE_MARKER, SFX_MIX_BUNDLE_MARKER, type ResolvedStorySfxCue} from "./sfx";
import {mergeConversationVoiceover, messageHasVoiceover, resolveMessageVoicePlaybackRate, STORY_VOICE_SYNC_BUNDLE_MARKER, STORY_VOICE_SYNC_MAX_PLAYBACK_RATE, VOICEOVER_BUNDLE_MARKER} from "./voiceover";
import type {ConversationInput} from "./schema";
import {msToFrames, FPS} from "./fps";
import {assignStorySceneTimeSlots, computeStoryVoicePlaybackRates, getStoryScenes, type StoryVoiceSyncSceneEvent} from "./story-scene-timing";

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
export const STORY_SPLIT_TIMELINE_REV = "story-voice-sync-v1";

export type MessageTimelineEvent = {
  index: number;
  author: "me" | "them";
  text: string;
  image?: string;
  sentAt: string;
  /** center — текст по центру экрана; bubble — пузырь мессенджера */
  display: "center" | "bubble";
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
  /** >1 — ускорение WAV при подгонке озвучки под Veo-клип story-сцены */
  voicePlaybackRate?: number;
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
  openingAnimation: StorySceneAnimation;
  sceneTransition: StorySceneTransition;
  sceneTransitionFrames: number;
  colorFilter: StoryColorFilter;
  motionLoopSec: number;
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
  /** Обложка-превью вшивается в самый конец видео (после «Подпишись») */
  previewCoverStartFrame: number;
  previewCoverDurationFrames: number;
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

const voicePlaybackRatesEqual = (
  a: Map<number, number>,
  b: Map<number, number>,
): boolean => {
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, rate] of a) {
    if (Math.abs((b.get(key) ?? 1) - rate) > 0.01) {
      return false;
    }
  }
  return true;
};

/** Короткая пауза между репликами внутри одной Veo-сцены (story video + озвучка) */
const STORY_SYNC_INTER_MESSAGE_MS = 150;

const buildVideoOnlyStorySceneBounds = (
  conversation: ConversationInput,
  introFrames: number,
): StoryVoiceSyncSceneEvent[] => {
  const planned = getStoryScenes(conversation);
  const immediateFirstScene = Boolean(conversation.messages[0]?.storyImage?.trim());
  const storyConfig = mergeStoryConfig(conversation);
  let chainFrame = introFrames;

  if (!immediateFirstScene) {
    const openingMs = scaleConversationMs(conversation, storyConfig.opening.durationMs);
    const splitMs = scaleConversationMs(conversation, storyConfig.splitTransitionMs);
    const hasOpeningAsset =
      Boolean(storyConfig.opening.image?.trim()) ||
      Boolean(storyConfig.opening.storyVideo?.trim()) ||
      storyConfig.opening.animation !== "none";
    if (hasOpeningAsset) {
      chainFrame += msToFrames(openingMs + splitMs);
    }
  }

  const bounds: StoryVoiceSyncSceneEvent[] = [];
  for (const scene of planned) {
    const message = conversation.messages[scene.anchorMessageIndex];
    const image = message?.storyImage?.trim() || scene.image?.trim();
    if (!image) {
      continue;
    }
    const videoMs =
      typeof message?.storyVideoDurationMs === "number" && message.storyVideoDurationMs > 0
        ? message.storyVideoDurationMs
        : 4000;
    const startFrame = bounds.length === 0 && immediateFirstScene ? introFrames : chainFrame;
    const endFrame = startFrame + msToFrames(videoMs);
    bounds.push({
      messageIndex: scene.anchorMessageIndex,
      startFrame,
      endFrame,
      messageFrom: scene.messageFrom ?? scene.anchorMessageIndex,
      messageTo: scene.messageTo ?? scene.anchorMessageIndex,
    });
    chainFrame = endFrame;
  }

  return bounds;
};

const buildVideoOnlyStoryMessageEvents = (
  conversation: ConversationInput,
  introFrames: number,
  sceneBounds: readonly StoryVoiceSyncSceneEvent[],
): MessageTimelineEvent[] => {
  const storyVisual = isStoryVisualLayout(conversation);
  const videoLayout = isVideoLayout(conversation);
  const storyConfig = mergeStoryConfig(conversation);
  const disableMessageFullscreen =
    videoLayout || (storyVisual && storyConfig.disableMessageFullscreen);
  const voiceover = mergeConversationVoiceover(conversation);
  const voicePaddingMs = scaleTimingMs(200);
  const gapFrames = msToFrames(scaleTimingMs(STORY_SYNC_INTER_MESSAGE_MS));
  const slots = new Array<MessageTimelineEvent | undefined>(conversation.messages.length);
  const covered = new Set<number>();

  for (const scene of sceneBounds) {
    const from = Math.max(0, scene.messageFrom);
    const to = Math.min(conversation.messages.length - 1, Math.max(from, scene.messageTo));
    const indices: number[] = [];
    for (let i = from; i <= to; i++) {
      indices.push(i);
    }
    if (indices.length === 0) {
      continue;
    }

    const budgetFrames = Math.max(1, scene.endFrame - scene.startFrame);
    const gapTotal = indices.length > 1 ? gapFrames * (indices.length - 1) : 0;
    const voiceCapFrames = Math.max(1, budgetFrames - gapTotal - 1);
    let totalVoiceFrames = 0;
    for (const index of indices) {
      const message = conversation.messages[index];
      if (messageHasVoiceover(message)) {
        totalVoiceFrames += msToFrames(message.voiceDurationMs ?? 0);
      }
    }

    let sceneRate = 1;
    if (totalVoiceFrames > voiceCapFrames) {
      sceneRate = Math.min(
        STORY_VOICE_SYNC_MAX_PLAYBACK_RATE,
        totalVoiceFrames / voiceCapFrames,
      );
    }

    let cursor = scene.startFrame;
    indices.forEach((index, order) => {
      const message = conversation.messages[index];
      const userRate = resolveMessageVoicePlaybackRate(message);
      const voiceRate = sceneRate * userRate;
      const revealFrame = cursor;
      const typingFrames = order === 0 ? 0 : gapFrames;
      const typingStartFrame = revealFrame - typingFrames;
      const typingEndFrame = revealFrame;
      const voiceDurationMs =
        voiceover.enabled && message.voiceAudio?.trim() ? message.voiceDurationMs : undefined;
      const voiceDurationFrames =
        voiceDurationMs && voiceRate > 1
          ? msToFrames(voiceDurationMs / voiceRate)
          : voiceDurationMs
            ? msToFrames(voiceDurationMs)
            : 0;
      const postRevealFrames = Math.max(
        voiceDurationFrames,
        voiceDurationMs ? msToFrames(voiceDurationMs / voiceRate + voicePaddingMs) : 0,
      );
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

      slots[index] = {
        index,
        author: message.author,
        text: message.text ?? "",
        image: message.image,
        sentAt: message.sentAt,
        display: message.display === "bubble" ? "bubble" : "center",
        startFrame: typingStartFrame,
        typingStartFrame,
        typingEndFrame,
        revealFrame,
        fullscreenStartFrame,
        fullscreenEndFrame,
        fullscreenFrames,
        endFrame,
        pauseFrames: typingFrames,
        typingFrames,
        voiceAudio:
          voiceover.enabled && message.voiceAudio?.trim() ? message.voiceAudio.trim() : undefined,
        voiceDurationMs,
        voiceDurationFrames,
      voicePlaybackRate: voiceRate > 1.001 ? voiceRate : userRate < 0.999 ? userRate : undefined,
      };
      covered.add(index);
      cursor = revealFrame + voiceDurationFrames + (order < indices.length - 1 ? gapFrames : 0);
    });
  }

  const events: MessageTimelineEvent[] = [];
  let cursor = introFrames;
  const timingConfig = mergeConversationTiming(conversation);
  const timingSpeed = getTimingSpeed(conversation);

  conversation.messages.forEach((message, index) => {
    if (covered.has(index) && slots[index]) {
      events.push(slots[index]!);
      cursor = Math.max(cursor, slots[index]!.endFrame);
      return;
    }

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
      display: message.display === "bubble" ? "bubble" : "center",
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

  return events;
};

const buildMessageTimelineEvents = (
  conversation: ConversationInput,
  introFrames: number,
  voicePlaybackRates: Map<number, number>,
): MessageTimelineEvent[] => {
  const storyVisual = isStoryVisualLayout(conversation);
  const videoLayout = isVideoLayout(conversation);
  const storyConfig = mergeStoryConfig(conversation);
  const disableMessageFullscreen =
    videoLayout || (storyVisual && storyConfig.disableMessageFullscreen);

  const events: MessageTimelineEvent[] = [];
  let cursor = introFrames;
  const timingConfig = mergeConversationTiming(conversation);
  const timingSpeed = getTimingSpeed(conversation);
  const voiceover = mergeConversationVoiceover(conversation);
  const voicePaddingMs = scaleTimingMs(200);

  conversation.messages.forEach((message, index) => {
    let resolved = resolveMessageTiming(message, timingConfig, timingSpeed);
    const autoRate = Math.max(1, voicePlaybackRates.get(index) ?? 1);
    const userRate = resolveMessageVoicePlaybackRate(message);
    const voiceRate = autoRate * userRate;
    if (voiceRate > 1.001) {
      resolved = {
        ...resolved,
        pauseBeforeMs: resolved.pauseBeforeMs / voiceRate,
        typingMs: resolved.typingMs / voiceRate,
      };
    }
    if (voiceover.enabled && messageHasVoiceover(message)) {
      const voiceMinPostRevealMs = (message.voiceDurationMs ?? 0) / voiceRate + voicePaddingMs;
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
    const voiceDurationFrames =
      voiceDurationMs && voiceRate > 1
        ? msToFrames(voiceDurationMs / voiceRate)
        : voiceDurationMs
          ? msToFrames(voiceDurationMs)
          : 0;

    events.push({
      index,
      author: message.author,
      text: message.text ?? "",
      image: message.image,
      sentAt: message.sentAt,
      display: message.display === "bubble" ? "bubble" : "center",
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
      voicePlaybackRate: voiceRate > 1.001 ? voiceRate : userRate < 0.999 ? userRate : undefined,
    });

    cursor = endFrame;
  });

  return events;
};

export const buildTimeline = (conversation: ConversationInput): ConversationTimeline => {
  void TIMING_SPEED_TIMELINE_MARKER;
  void TIMELINE_TAIL_MARKER;
  void VOICEOVER_BUNDLE_MARKER;
  void STORY_VOICE_SYNC_BUNDLE_MARKER;
  void STORY_VIDEO_BUNDLE_MARKER;
  void SFX_BUNDLE_MARKER;
  void SFX_MIX_BUNDLE_MARKER;
  void PREVIEW_COVER_BUNDLE_MARKER;
  const intro = mergeIntro(conversation);
  const endCard = mergeEndCard(conversation);
  const introFrames = intro.enabled
    ? msToFrames(scaleConversationMs(conversation, intro.durationMs))
    : 0;
  const storyVisual = isStoryVisualLayout(conversation);
  const videoLayout = isVideoLayout(conversation);
  void videoLayout;
  void storyVisual;
  const voiceover = mergeConversationVoiceover(conversation);
  const videoOnlyVoiceSync =
    voiceover.enabled &&
    shouldGenerateStoryVideos(conversation) &&
    getStoryScenes(conversation).length > 0;

  let events: MessageTimelineEvent[];
  let chatEndFrame: number;
  let story: StoryTimeline;

  if (videoOnlyVoiceSync) {
    const sceneBounds = buildVideoOnlyStorySceneBounds(conversation, introFrames);
    events = buildVideoOnlyStoryMessageEvents(conversation, introFrames, sceneBounds);
    chatEndFrame = events.length > 0 ? events[events.length - 1].endFrame : introFrames;
    story = buildStoryTimeline(conversation, events, introFrames, chatEndFrame);
  } else {
    let voicePlaybackRates = new Map<number, number>();
    events = buildMessageTimelineEvents(conversation, introFrames, voicePlaybackRates);
    chatEndFrame = events.length > 0 ? events[events.length - 1].endFrame : introFrames;
    story = buildStoryTimeline(conversation, events, introFrames, chatEndFrame);

    for (let iter = 0; iter < 4; iter++) {
      const syncScenes = story.sceneEvents.map((sceneEv) => {
        const plan = getStoryScenes(conversation).find(
          (scene) => scene.anchorMessageIndex === sceneEv.messageIndex,
        );
        return {
          messageIndex: sceneEv.messageIndex,
          startFrame: sceneEv.startFrame,
          endFrame: sceneEv.endFrame,
          messageFrom: plan?.messageFrom ?? sceneEv.messageIndex,
          messageTo: plan?.messageTo ?? sceneEv.messageIndex,
        };
      });
      const nextRates = computeStoryVoicePlaybackRates(conversation, events, syncScenes);
      if (voicePlaybackRatesEqual(voicePlaybackRates, nextRates)) {
        break;
      }
      voicePlaybackRates = nextRates;
      events = buildMessageTimelineEvents(conversation, introFrames, voicePlaybackRates);
      chatEndFrame = events.length > 0 ? events[events.length - 1].endFrame : introFrames;
      story = buildStoryTimeline(conversation, events, introFrames, chatEndFrame);
    }
  }

  const storyTrackEndFrame =
    story.enabled && story.sceneEvents.length > 0
      ? Math.max(...story.sceneEvents.map((event) => event.endFrame))
      : chatEndFrame;
  const contentEndFrame = Math.max(chatEndFrame, storyTrackEndFrame);

  const outro = mergeConversationOutro(conversation);
  const tailFrames = msToFrames(scaleConversationMs(conversation, POST_LAST_MESSAGE_TAIL_MS));
  const outroPause = outro.enabled ? outroPauseFrames(outro, conversation) : 0;
  const endCardFrames = endCard.enabled
    ? msToFrames(scaleConversationMs(conversation, endCard.durationMs))
    : 0;
  const endCardStart = contentEndFrame + tailFrames + outroPause;
  const outroFrames = outro.enabled ? outroDurationFrames(outro, conversation) : 0;
  const outroStart = endCardStart + endCardFrames;

  const previewCover = mergePreviewCover(conversation);
  const previewCoverFrames = previewCoverDurationFrames(previewCover);
  const previewCoverStart = outroStart + outroFrames;

  return {
    events,
    introDurationFrames: introFrames,
    outroStartFrame: outroStart,
    outroDurationFrames: outroFrames,
    endCardStartFrame: endCardStart,
    endCardDurationFrames: endCardFrames,
    previewCoverStartFrame: previewCoverStart,
    previewCoverDurationFrames: previewCoverFrames,
    durationInFrames: previewCoverStart + previewCoverFrames,
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
    sceneTransition: "zoom",
    sceneTransitionFrames: 15,
    colorFilter: "none",
    motionLoopSec: 3,
    openingSfx: [],
    sfxMasterVolume: 1,
    sfxMixSrc: undefined,
    sfxEnabled: false,
    openingVideoLoop: false,
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
  const firstHasStory = Boolean(firstMessage?.storyImage?.trim());
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
  } else if (
    storyConfig.opening.animation === "none" &&
    !storyConfig.opening.image?.trim() &&
    !storyConfig.opening.storyVideo?.trim()
  ) {
    openingDurationFrames = 0;
    splitTransitionFrames = 0;
  }

  const openingEndFrame = openingStartFrame + openingDurationFrames;
  const splitStartFrame = openingEndFrame;
  let splitCompleteFrame = immediateFirstScene
    ? firstRevealFrame
    : splitStartFrame + splitTransitionFrames;

  // Первое сообщение вместе с картинкой — чат не ждёт конца заставки opening.
  if (events.length > 0) {
    splitCompleteFrame = Math.min(splitCompleteFrame, firstRevealFrame);
  }

  const sceneEvents: StorySceneTimelineEvent[] = [];
  const plannedScenes = getStoryScenes(conversation);
  const videoOnlyStory = isStoryVideoOnlyAnimation(conversation);
  const sceneOriginFrame =
    videoOnlyStory && immediateFirstScene
      ? introFrames
      : immediateFirstScene
        ? (events[0]?.revealFrame ?? splitCompleteFrame)
        : splitCompleteFrame;
  let videoChainFrame = sceneOriginFrame;

  if (plannedScenes.length > 0) {
    const timedScenes = assignStorySceneTimeSlots(conversation, plannedScenes);
    timedScenes.forEach((scene, sceneOrder) => {
      const message = conversation.messages[scene.anchorMessageIndex];
      const image = message?.storyImage?.trim() || scene.image?.trim();
      if (!image) {
        return;
      }

      const slotMs = Math.max(1, (scene.estimatedEndMs ?? 0) - (scene.estimatedStartMs ?? 0));
      const anchorIndex = scene.anchorMessageIndex;
      const videoMs = message?.storyVideoDurationMs;
      const durationMs =
        videoOnlyStory && typeof videoMs === "number" && videoMs > 0 ? videoMs : slotMs;

      let startFrame: number;
      if (sceneOrder === 0) {
        startFrame =
          anchorIndex === 0 && immediateFirstScene
            ? (events[0]?.revealFrame ?? sceneOriginFrame)
            : Math.max(
                events[anchorIndex]?.revealFrame ?? splitCompleteFrame,
                splitCompleteFrame,
              );
      } else if (videoOnlyStory) {
        startFrame = videoChainFrame;
      } else {
        startFrame = Math.max(
          events[anchorIndex]?.revealFrame ?? splitCompleteFrame,
          splitCompleteFrame,
        );
      }

      let endFrame = startFrame + msToFrames(durationMs);
      if (!videoOnlyStory && typeof videoMs === "number" && videoMs > 0) {
        endFrame = Math.max(endFrame, startFrame + msToFrames(videoMs));
      }

      videoChainFrame = endFrame;

      sceneEvents.push({
        messageIndex: scene.anchorMessageIndex,
        image,
        video: message?.storyVideo?.trim() || undefined,
        videoDurationMs: message?.storyVideoDurationMs,
        videoLoop: resolveStoryVideoLoop(message?.storyVideoLoop, message?.storyImagePrompt),
        startFrame,
        endFrame,
        sfx: sfxConfig.enabled ? resolveStorySfxCues(message?.storySfx) : [],
      });
    });
  } else {
    const sceneIndices = conversation.messages
      .map((message, index) => (message.storyImage?.trim() ? index : -1))
      .filter((index) => index >= 0);

    sceneIndices.forEach((messageIndex, sceneOrder) => {
      const message = conversation.messages[messageIndex];
      const image = message.storyImage?.trim();
      if (!image) {
        return;
      }

      const videoMs = message.storyVideoDurationMs;
      const nextSceneIndex = sceneIndices[sceneOrder + 1];
      const nextRevealFrame =
        nextSceneIndex !== undefined
          ? (events[nextSceneIndex]?.revealFrame ?? chatEndFrame)
          : chatEndFrame;

      let startFrame: number;
      if (messageIndex === 0 && immediateFirstScene) {
        startFrame = firstRevealFrame;
      } else if (videoOnlyStory && sceneOrder > 0) {
        startFrame = videoChainFrame;
      } else {
        startFrame = Math.max(events[messageIndex]?.revealFrame ?? splitCompleteFrame, splitCompleteFrame);
      }

      const endFrame =
        videoOnlyStory && typeof videoMs === "number" && videoMs > 0
          ? startFrame + msToFrames(videoMs)
          : nextRevealFrame;

      videoChainFrame = endFrame;

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
  }

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
    sceneTransition: storyConfig.sceneTransition,
    sceneTransitionFrames: storySceneTransitionFrames(storyConfig.sceneTransition),
    colorFilter: storyConfig.colorFilter,
    motionLoopSec: storyConfig.motionLoopSec,
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

/** Длина кросс-фейда между story-сценами, кадры (~0.4 c при 30 fps) */
export const STORY_SCENE_CROSSFADE_FRAMES = 12;

/** Один видимый слой story-панели на кадре (обычно один; на стыке сцен — два) */
export type StorySceneLayer = {
  key: string;
  image?: string;
  video?: string;
  videoDurationMs?: number;
  videoLoop: boolean;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  opacity: number;
  scale: number;
  translateXPercent: number;
  translateYPercent: number;
  blurPx: number;
};

export type ResolvedStorySceneLayers = {
  layers: StorySceneLayer[];
  flashOpacity: number;
};

type StorySegment = {
  startFrame: number;
  endFrame: number;
  image?: string;
  video?: string;
  videoDurationMs?: number;
  videoLoop: boolean;
};

/**
 * Непрерывные сегменты story-медиа: заставка (если есть отдельно) + каждая сцена.
 * Сцена тянется до старта следующей (без «дыр» с PNG-parallax в video-parallax).
 */
const buildStorySegments = (story: StoryTimeline, outroStartFrame: number): StorySegment[] => {
  const raw: StorySegment[] = [];

  if (!story.immediateFirstScene && (story.openingImage || story.openingVideo)) {
    const openingEnd =
      story.sceneEvents[0]?.startFrame ??
      story.openingEndFrame ??
      outroStartFrame;
    raw.push({
      startFrame: story.openingStartFrame,
      endFrame: openingEnd,
      image: story.openingImage,
      video: story.openingVideo,
      videoDurationMs: story.openingVideoDurationMs,
      videoLoop: story.openingVideoLoop,
    });
  }

  for (let i = 0; i < story.sceneEvents.length; i += 1) {
    const event = story.sceneEvents[i];
    const nextStart = story.sceneEvents[i + 1]?.startFrame;
    const displayEnd = nextStart ?? Math.max(event.endFrame, outroStartFrame);
    raw.push({
      startFrame: event.startFrame,
      endFrame: displayEnd,
      image: event.image,
      video: event.video,
      videoDurationMs: event.videoDurationMs,
      videoLoop: event.videoLoop,
    });
  }

  return raw;
};

const MIN_PARALLAX_BAKE_FRAMES = 45;
const MAX_PARALLAX_BAKE_FRAMES = 900;

export type StoryParallaxBakePlan = {
  frames: number;
  /** Порядковый номер story-сцены (0 = opening) — для чередования pan */
  sceneIndex: number;
};

/** План bake parallax: длина clip и индекс сцены для каждого story-изображения */
export const storyParallaxBakePlanByImage = (
  conversation: ConversationInput,
): Map<string, StoryParallaxBakePlan> => {
  const map = new Map<string, StoryParallaxBakePlan>();
  const {story, outroStartFrame} = buildTimeline(conversation);
  if (!story.enabled) {
    return map;
  }

  const segments = buildStorySegments(story, outroStartFrame);
  segments.forEach((segment, sceneIndex) => {
    const rel = segment.image?.trim()?.replace(/^\/+/, "");
    if (!rel) {
      return;
    }
    const raw = segment.endFrame - segment.startFrame;
    const frames = Math.max(
      MIN_PARALLAX_BAKE_FRAMES,
      Math.min(MAX_PARALLAX_BAKE_FRAMES, raw),
    );
    const prev = map.get(rel);
    if (!prev || frames >= prev.frames) {
      map.set(rel, {frames, sceneIndex});
    }
  });
  return map;
};

/** Длина bake parallax-clip (кадры) для каждого story-изображения по таймлайну */
export const storyParallaxBakeFramesByImage = (
  conversation: ConversationInput,
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const [rel, plan] of storyParallaxBakePlanByImage(conversation)) {
    map.set(rel, plan.frames);
  }
  return map;
};


/**
 * Слои story-сцены на кадре. На стыке двух сцен — два слоя с переходом
 * (dissolve, zoom-punch или горизонтальный push).
 */
export const resolveStorySceneLayers = (
  story: StoryTimeline,
  frame: number,
  outroStartFrame: number,
): ResolvedStorySceneLayers => {
  if (!story.enabled) {
    return {layers: [], flashOpacity: 0};
  }

  const segments = buildStorySegments(story, outroStartFrame);
  if (segments.length === 0) {
    return {layers: [], flashOpacity: 0};
  }

  let index = 0;
  for (let i = 0; i < segments.length; i += 1) {
    if (frame >= segments[i].startFrame) {
      index = i;
    }
  }

  const transition = story.sceneTransition;
  const transitionFrames = story.sceneTransitionFrames;

  const toLayer = (
    segment: StorySegment,
    segmentIndex: number,
    durationFrames: number,
    style: {
      opacity: number;
      scale: number;
      translateXPercent: number;
      translateYPercent: number;
      blurPx: number;
    },
  ): StorySceneLayer => ({
    key: `seg-${segmentIndex}`,
    image: segment.image,
    video: segment.video,
    videoDurationMs: segment.videoDurationMs,
    videoLoop: segment.videoLoop,
    sceneStartFrame: segment.startFrame,
    sceneDurationFrames: Math.max(1, durationFrames),
    opacity: style.opacity,
    scale: style.scale,
    translateXPercent: style.translateXPercent,
    translateYPercent: style.translateYPercent,
    blurPx: style.blurPx,
  });

  const current = segments[index];
  const currentDuration = current.endFrame - current.startFrame;
  const localFrame = frame - current.startFrame;
  const crossfading = index > 0 && transitionFrames > 0 && localFrame < transitionFrames;

  if (crossfading) {
    const previous = segments[index - 1];
    const progress = sceneTransitionProgress(localFrame, transitionFrames);
    const outgoing = outgoingSceneTransitionStyle(progress, transition);
    const incoming = incomingSceneTransitionStyle(progress, transition);
    return {
      layers: [
        toLayer(
          previous,
          index - 1,
          current.startFrame - previous.startFrame + transitionFrames,
          outgoing,
        ),
        toLayer(current, index, currentDuration, incoming),
      ],
      flashOpacity: sceneTransitionFlashOpacity(progress, transition),
    };
  }

  return {
    layers: [
      toLayer(current, index, currentDuration, {
        opacity: 1,
        scale: 1,
        translateXPercent: 0,
        translateYPercent: 0,
        blurPx: 0,
      }),
    ],
    flashOpacity: 0,
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
