import type {ConversationInput} from "./schema";
import {FPS, msToFrames} from "./fps";
import {mergeIntro, mergeEndCard} from "./title-card";
import {mergeConversationOutro, outroDurationFrames, outroPauseFrames} from "./outro";
import {isStoryVideoOnlyAnimation, mergeStoryConfig, isStoryVisualLayout, shouldGenerateStoryVideos} from "./story";
import {
  getTimingSpeed,
  mergeConversationTiming,
  resolveMessageTiming,
  scaleConversationMs,
} from "./timing";
import {mergeConversationVoiceover, messageHasVoiceover, STORY_VOICE_SYNC_MAX_PLAYBACK_RATE} from "./voiceover";
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

export const buildMessageTimelineMs = (
  conversation: ConversationInput,
  options?: {voicePlaybackRateForMessage?: (index: number) => number},
): MessageTimelineMs[] => {
  const rateFor = options?.voicePlaybackRateForMessage ?? (() => 1);
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
      const rate = Math.max(1, rateFor(index));
      const voiceMinPostRevealMs = (message.voiceDurationMs ?? 0) / rate + voicePaddingMs;
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

/** Длительность озвучки блока messageFrom..messageTo по таймлайну чата (reveal → end). */
export const sceneMessageChatSpanMs = (
  conversation: ConversationInput,
  scene: Pick<StoryScenePlanEntry, "messageFrom" | "messageTo" | "anchorMessageIndex">,
): number => {
  const rows = buildMessageTimelineMs(conversation);
  if (rows.length === 0) {
    return 0;
  }
  const from = Math.max(0, scene.messageFrom ?? scene.anchorMessageIndex);
  const to = Math.min(
    rows.length - 1,
    Math.max(from, scene.messageTo ?? scene.anchorMessageIndex),
  );
  const startRow = rows[from];
  const endRow = rows[to];
  if (!startRow || !endRow) {
    return 0;
  }
  return Math.max(1, endRow.endMs - startRow.revealMs);
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
  if (isStoryVideoOnlyAnimation(conversation) && videoMs > 0) {
    return videoMs;
  }
  return Math.max(minSlotMs, Math.min(maxSlotMs, videoMs || minSlotMs));
};

export type StoryVoiceSyncMessageEvent = {
  index: number;
  revealFrame: number;
};

export type StoryVoiceSyncSceneEvent = {
  messageIndex: number;
  startFrame: number;
  endFrame: number;
  messageFrom: number;
  messageTo: number;
};

/**
 * Ускорение озвучки по сценам: каждая реплика должна закончиться до конца Veo-клипа сцены.
 * Возвращает Map messageIndex → playbackRate (≥ 1).
 */
export const computeStoryVoicePlaybackRates = (
  conversation: ConversationInput,
  messageEvents: readonly StoryVoiceSyncMessageEvent[],
  sceneEvents: readonly StoryVoiceSyncSceneEvent[],
): Map<number, number> => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled || !shouldGenerateStoryVideos(conversation)) {
    return new Map();
  }

  const planned = getStoryScenes(conversation);
  if (planned.length === 0 || sceneEvents.length === 0) {
    return new Map();
  }

  const rates = new Map<number, number>();

  planned.forEach((scene) => {
    const bounds = sceneEvents.find((ev) => ev.messageIndex === scene.anchorMessageIndex);
    if (!bounds) {
      return;
    }

    const from = Math.max(0, scene.messageFrom ?? scene.anchorMessageIndex);
    const to = Math.max(from, scene.messageTo ?? scene.anchorMessageIndex);
    const sceneEnd = bounds.endFrame;
    const sceneStart = bounds.startFrame;
    const budgetFrames = Math.max(1, sceneEnd - sceneStart);
    let sceneRate = 1;

    let totalVoiceFrames = 0;
    for (let i = from; i <= to; i++) {
      const message = conversation.messages[i];
      if (messageHasVoiceover(message)) {
        totalVoiceFrames += msToFrames(message.voiceDurationMs ?? 0);
      }
    }
    if (totalVoiceFrames > budgetFrames) {
      sceneRate = Math.max(sceneRate, totalVoiceFrames / budgetFrames);
    }

    for (let i = from; i <= to; i++) {
      const event = messageEvents[i];
      const message = conversation.messages[i];
      if (!event || !messageHasVoiceover(message)) {
        continue;
      }

      const voiceFrames = msToFrames(message.voiceDurationMs ?? 0);
      const budgetFrames = sceneEnd - event.revealFrame;
      if (budgetFrames <= 0) {
        sceneRate = STORY_VOICE_SYNC_MAX_PLAYBACK_RATE;
        continue;
      }
      if (voiceFrames > budgetFrames) {
        sceneRate = Math.max(sceneRate, voiceFrames / budgetFrames);
      }
    }

    sceneRate = Math.min(
      STORY_VOICE_SYNC_MAX_PLAYBACK_RATE,
      Math.max(1, sceneRate),
    );

    if (sceneRate <= 1.001) {
      return;
    }

    for (let i = from; i <= to; i++) {
      rates.set(i, Math.max(rates.get(i) ?? 1, sceneRate));
    }
  });

  return rates;
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

/** Типичная длина I2V-клипа Veo в story */
export const STORY_VEO_CLIP_SEC = 4;

/** Комфортный темп чтения реплик в Shorts, слов/с */
export const STORY_READABLE_WORDS_PER_SEC = 2.5;

export const storyReadableWordBudget = (clipSec: number): number =>
  Math.max(8, Math.round(clipSec * STORY_READABLE_WORDS_PER_SEC));

export const storyAnimationClipSec = (conversation: ConversationInput): number => {
  const animation = mergeStoryConfig(conversation).opening.animation;
  if (animation === "video" || animation === "video-parallax" || animation === "video-kenburns") {
    return STORY_VEO_CLIP_SEC;
  }
  const {min, max} = getStorySceneDurationSec(conversation);
  return (min + max) / 2;
};

/** Правила для LLM при генерации переписки под story-анимацию */
export const buildDialogueAnimationSyncRules = (
  targetDurationSec: number,
  language: "ru" | "en" = "ru",
): string[] => {
  const scenes = computeSceneCountFromTargetSec(targetDurationSec);
  const clipSec = STORY_VEO_CLIP_SEC;
  const words = storyReadableWordBudget(clipSec);
  const maxMessages = deriveMessageCountLimitFromTargetSec(targetDurationSec);
  const maxLinesPerScene = Math.min(3, Math.max(1, Math.ceil(maxMessages / Math.max(1, scenes))));

  if (language === "en") {
    return [
      `- Target ~${targetDurationSec}s → ~${scenes} illustrated scenes; each scene is ~${clipSec}s of Veo/I2V animation on screen.`,
      `- One visual beat = 1–${maxLinesPerScene} short chat lines (≤~${words} words total) that fit while the clip plays — no long paragraphs on one frame.`,
      "- If a thought needs more time, start the next scene/beat; don't stack many messages under one illustration.",
      `- At most ${maxMessages} messages total; fewer is fine when the story is tight.`,
      "- Do not add storyImagePrompt — scene images are generated separately.",
      `- Set story.targetDurationSec to ${targetDurationSec}.`,
    ];
  }

  return [
    `- Целевое время ~${targetDurationSec} с → ~${scenes} смен кадра; каждая сцена ≈ ${clipSec} с анимации Veo/I2V на экране.`,
    `- Один визуальный блок = 1–${maxLinesPerScene} короткие реплики (суммарно до ~${words} слов), которые успевают «прожить» за время клипа — без длинных абзацев на одном кадре.`,
    "- Если мысль не помещается — начни следующий блок/сцену, не нагружай один кадр множеством сообщений.",
    `- Не больше ${maxMessages} сообщений; меньше — нормально, если сюжет уложился.`,
    "- Не добавляй storyImagePrompt — кадры сгенерирует отдельный шаг.",
    `- В JSON укажи story.targetDurationSec: ${targetDurationSec}.`,
  ];
};

/** Правила для LLM при разбиении готовой переписки на story.scenes[] */
export const buildScenePlanAnimationSyncRules = (
  conversation: ConversationInput,
  language: "ru" | "en" = "ru",
): string[] => {
  const clipSec = storyAnimationClipSec(conversation);
  const words = storyReadableWordBudget(clipSec);
  const {min, max} = getStorySceneDurationSec(conversation);
  const animation = mergeStoryConfig(conversation).opening.animation;
  const veo =
    animation === "video" || animation === "video-parallax" || animation === "video-kenburns"
      ? language === "en"
        ? "Veo/I2V clip"
        : "клип Veo/I2V"
      : language === "en"
        ? "animated frame"
        : "анимированный кадр";

  if (language === "en") {
    return [
      `Each scene matches one ${veo} (~${clipSec}s on screen${animation === "video" || animation === "video-parallax" || animation === "video-kenburns" ? "" : `, guide ${min}–${max}s`}).`,
      `messageFrom..messageTo must be readable within that window: usually 1–3 short lines, ≤~${words} words total.`,
      "Split into the next scene if the transcript block would exceed the clip — don't assign long dialogue chunks to one frame.",
      "anchorMessageIndex = the key line for the illustration; beat = what happens visually in that clip.",
    ];
  }

  return [
    `Каждая сцена = один ${veo} (~${clipSec} с на экране${animation === "video" || animation === "video-parallax" || animation === "video-kenburns" ? "" : `, ориентир ${min}–${max} с`}).`,
    `messageFrom..messageTo должны укладываться в это окно: обычно 1–3 короткие реплики, суммарно до ~${words} слов.`,
    "Если блок переписки по времени не помещается — вынеси хвост в следующую сцену, не привязывай длинный диалог к одному кадру.",
    "anchorMessageIndex — ключевая реплика для иллюстрации; beat — что визуально происходит за время клипа.",
  ];
};
