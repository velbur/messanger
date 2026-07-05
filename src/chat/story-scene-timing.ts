import type {ConversationInput} from "./schema";
import {FPS, msToFrames} from "./fps";
import {mergeIntro, mergeEndCard} from "./title-card";
import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {mergeStoryConfig, isStoryVisualLayout} from "./story";
import {
  getTimingSpeed,
  mergeConversationTiming,
  resolveMessageTiming,
  scaleConversationMs,
} from "./timing";
import {mergeConversationVoiceover, messageHasVoiceover} from "./voiceover";
import {POST_LAST_MESSAGE_TAIL_MS} from "./timeline";

export const DEFAULT_STORY_TARGET_DURATION_SEC = 60;
export const DEFAULT_SCENE_DURATION_SEC = {min: 4, max: 6} as const;
export const SCENE_SLOT_TARGET_MS = 5000;

export type StoryScenePlanEntry = {
  id: string;
  beat: string;
  anchorMessageIndex: number;
  messageFrom: number;
  messageTo: number;
  estimatedStartMs?: number;
  estimatedEndMs?: number;
  imagePrompt?: string;
  image?: string;
  storyVideoPrompt?: string;
  storySceneCharacters?: string[];
};

export type MessageTimelineMs = {
  index: number;
  startMs: number;
  endMs: number;
  revealMs: number;
};

export const getStoryTargetDurationSec = (conversation: ConversationInput): number => {
  const raw = conversation.story?.targetDurationSec;
  if (typeof raw === "number" && raw >= 30 && raw <= 120) {
    return raw;
  }
  return DEFAULT_STORY_TARGET_DURATION_SEC;
};

export const getStorySceneDurationSec = (
  conversation: ConversationInput,
): {min: number; max: number} => {
  const raw = conversation.story?.sceneDurationSec;
  const min =
    typeof raw?.min === "number" && raw.min >= 3 && raw.min <= 8 ? raw.min : DEFAULT_SCENE_DURATION_SEC.min;
  const max =
    typeof raw?.max === "number" && raw.max >= min && raw.max <= 10
      ? raw.max
      : DEFAULT_SCENE_DURATION_SEC.max;
  return {min, max};
};

/** Overhead вне «контентной» части переписки (intro, tail, outro, endCard, opening). */
export const estimateTimelineOverheadMs = (conversation: ConversationInput): number => {
  const intro = mergeIntro(conversation);
  const endCard = mergeEndCard(conversation);
  const outro = mergeConversationOutro(conversation);
  const storyConfig = mergeStoryConfig(conversation);

  let overhead = 0;
  if (intro.enabled) {
    overhead += scaleConversationMs(conversation, intro.durationMs);
  }
  overhead += scaleConversationMs(conversation, POST_LAST_MESSAGE_TAIL_MS);
  if (endCard.enabled) {
    overhead += scaleConversationMs(conversation, endCard.durationMs);
  }
  if (outro.enabled) {
    overhead += (outroPauseFrames(outro, conversation) / FPS) * 1000;
    overhead += (outroDurationFrames(outro, conversation) / FPS) * 1000;
  }

  const firstHasStory = Boolean(conversation.messages[0]?.storyImage?.trim());
  if (isStoryVisualLayout(conversation) && !firstHasStory) {
    const openingMs = scaleConversationMs(conversation, storyConfig.opening.durationMs);
    const splitMs = scaleConversationMs(conversation, storyConfig.splitTransitionMs);
    const hasOpeningAsset =
      Boolean(storyConfig.opening.image?.trim()) ||
      Boolean(storyConfig.opening.storyVideo?.trim()) ||
      storyConfig.opening.animation !== "none";
    if (hasOpeningAsset) {
      overhead += openingMs + splitMs;
    }
  }

  return overhead;
};

/** Длительность переписки (сообщения) в мс — без intro/tail/outro. */
export const estimateMessagesOnlyDurationMs = (conversation: ConversationInput): number => {
  const timingConfig = mergeConversationTiming(conversation);
  const timingSpeed = getTimingSpeed(conversation);
  const voiceover = mergeConversationVoiceover(conversation);
  const voicePaddingMs = 200;
  let total = 0;

  conversation.messages.forEach((message, index) => {
    let resolved = resolveMessageTiming(message, timingConfig, timingSpeed);
    if (voiceover.enabled && messageHasVoiceover(message)) {
      const voiceMinPostRevealMs = (message.voiceDurationMs ?? 0) + voicePaddingMs;
      if (voiceMinPostRevealMs > resolved.postRevealMs) {
        resolved = {...resolved, postRevealMs: voiceMinPostRevealMs};
      }
    }
    const pauseMs = index === 0 ? 0 : resolved.pauseBeforeMs;
    const typingMs = index === 0 ? 0 : resolved.typingMs;
    total += pauseMs + typingMs + resolved.postRevealMs;
  });

  return total;
};

/** Длительность story-контента по целевому времени ролика (без привязки к скорости чата). */
export const storySceneTrackDurationMs = (conversation: ConversationInput): number => {
  const targetMs = getStoryTargetDurationSec(conversation) * 1000;
  return Math.max(0, targetMs - estimateTimelineOverheadMs(conversation));
};

/** Контентное окно для сцен: targetDuration или фактическая переписка минус overhead. */
export const estimateContentDurationMs = (conversation: ConversationInput): number => {
  const fromTarget = storySceneTrackDurationMs(conversation);
  const messagesMs = estimateMessagesOnlyDurationMs(conversation);
  return Math.max(messagesMs, fromTarget);
};

export const computeSceneCountFromTarget = (conversation: ConversationInput): number => {
  const contentMs = estimateContentDurationMs(conversation);
  const {min, max} = getStorySceneDurationSec(conversation);
  const avgSec = (min + max) / 2;
  const count = Math.floor(contentMs / (avgSec * 1000));
  return Math.max(2, Math.min(count, 24));
};

export const deriveMessageCountLimitFromTarget = (conversation: ConversationInput): number => {
  const sceneCount = computeSceneCountFromTarget(conversation);
  return Math.min(80, Math.max(12, sceneCount * 4));
};

/** Без полного conversation — для генерации диалога до JSON */
export const computeSceneCountFromTargetSec = (targetDurationSec: number): number => {
  const sec = Math.max(30, Math.min(120, targetDurationSec));
  const contentMs = Math.max(20_000, sec * 1000 - 15_000);
  const count = Math.floor(contentMs / SCENE_SLOT_TARGET_MS);
  return Math.max(3, Math.min(24, count));
};

export const deriveMessageCountLimitFromTargetSec = (targetDurationSec: number): number => {
  const sceneCount = computeSceneCountFromTargetSec(targetDurationSec);
  return Math.min(80, Math.max(12, sceneCount * 4));
};

export const buildMessageTimelineMs = (conversation: ConversationInput): MessageTimelineMs[] => {
  const timingConfig = mergeConversationTiming(conversation);
  const timingSpeed = getTimingSpeed(conversation);
  const voiceover = mergeConversationVoiceover(conversation);
  const voicePaddingMs = 200;
  const intro = mergeIntro(conversation);
  let cursorMs = intro.enabled ? scaleConversationMs(conversation, intro.durationMs) : 0;

  const rows: MessageTimelineMs[] = [];
  conversation.messages.forEach((message, index) => {
    let resolved = resolveMessageTiming(message, timingConfig, timingSpeed);
    if (voiceover.enabled && messageHasVoiceover(message)) {
      const voiceMinPostRevealMs = (message.voiceDurationMs ?? 0) + voicePaddingMs;
      if (voiceMinPostRevealMs > resolved.postRevealMs) {
        resolved = {...resolved, postRevealMs: voiceMinPostRevealMs};
      }
    }
    const pauseMs = index === 0 ? 0 : resolved.pauseBeforeMs;
    const typingMs = index === 0 ? 0 : resolved.typingMs;
    const startMs = cursorMs + pauseMs;
    const revealMs = startMs + typingMs;
    const endMs = revealMs + resolved.postRevealMs;
    rows.push({index, startMs, endMs, revealMs});
    cursorMs = endMs;
  });

  return rows;
};

/** Черновые границы сцен: каждые ~SCENE_SLOT_TARGET_MS по таймлайну сообщений. */
export const suggestSceneAnchorsByTime = (
  conversation: ConversationInput,
  sceneCount: number,
): number[] => {
  const rows = buildMessageTimelineMs(conversation);
  if (rows.length === 0 || sceneCount <= 0) {
    return [];
  }

  const contentEndMs = rows[rows.length - 1]?.endMs ?? 0;
  const slotMs = Math.max(
    getStorySceneDurationSec(conversation).min * 1000,
    contentEndMs / Math.max(1, sceneCount),
  );

  const anchors: number[] = [];
  let nextBoundaryMs = 0;

  for (const row of rows) {
    if (anchors.length >= sceneCount) {
      break;
    }
    if (row.revealMs >= nextBoundaryMs || anchors.length === 0) {
      anchors.push(row.index);
      nextBoundaryMs = row.revealMs + slotMs;
    }
  }

  if (!anchors.includes(0) && rows.length > 0) {
    anchors.unshift(0);
  }
  const lastIndex = rows[rows.length - 1].index;
  if (rows.length > 2 && !anchors.includes(lastIndex)) {
    anchors.push(lastIndex);
  }

  return [...new Set(anchors)].sort((a, b) => a - b).slice(0, sceneCount);
};

export const getStoryScenes = (conversation: ConversationInput): StoryScenePlanEntry[] => {
  const raw = conversation.story?.scenes;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (scene): scene is StoryScenePlanEntry =>
      Boolean(scene) &&
      typeof scene === "object" &&
      typeof scene.id === "string" &&
      typeof scene.beat === "string" &&
      typeof scene.anchorMessageIndex === "number",
  );
};

/** Длительность story-слота с учётом Veo (не короче клипа). */
const sceneSlotDurationMs = (
  conversation: ConversationInput,
  scene: StoryScenePlanEntry,
): number => {
  const {min, max} = getStorySceneDurationSec(conversation);
  const minSlotMs = min * 1000;
  const maxSlotMs = max * 1000;
  const message = conversation.messages[scene.anchorMessageIndex];
  const videoMs =
    typeof message?.storyVideoDurationMs === "number" && message.storyVideoDurationMs > 0
      ? message.storyVideoDurationMs
      : 0;
  return Math.max(minSlotMs, Math.min(maxSlotMs, videoMs || minSlotMs));
};

/**
 * Равномерная сетка сцен по целевому времени ролика — не по скорости переписки.
 * estimatedStartMs/EndMs отсчитываются от начала story-контента (0 = первый кадр сцен).
 */
export const assignStorySceneTimeSlots = (
  conversation: ConversationInput,
  scenes: StoryScenePlanEntry[],
): StoryScenePlanEntry[] => {
  if (scenes.length === 0) {
    return [];
  }

  const contentMs = storySceneTrackDurationMs(conversation);
  const evenSlotMs = contentMs / scenes.length;
  let cursorMs = 0;

  return scenes.map((scene) => {
    const durationMs = Math.max(sceneSlotDurationMs(conversation, scene), evenSlotMs);
    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    cursorMs = endMs;
    return {
      ...scene,
      estimatedStartMs: Math.round(startMs),
      estimatedEndMs: Math.round(endMs),
    };
  });
};

export const sceneAnchorMessageIndices = (conversation: ConversationInput): number[] => {
  const scenes = getStoryScenes(conversation);
  if (scenes.length > 0) {
    return [...new Set(scenes.map((s) => s.anchorMessageIndex))].sort((a, b) => a - b);
  }
  return conversation.messages
    .map((message, index) =>
      message.storyImage?.trim() || message.storyImagePrompt?.trim() ? index : -1,
    )
    .filter((index) => index >= 0);
};
