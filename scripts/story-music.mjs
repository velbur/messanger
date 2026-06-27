import path from "node:path";
import {isOpenRouterConfigured, chatCompletionJson} from "./openrouter-client.mjs";
import {isStoryVisualLayout} from "../src/chat/story.ts";
import {
  listMusicTracks,
  MUSIC_TRACK_MOODS,
  resolveMusicSrc,
} from "./music-tracks.mjs";

export const STORY_MUSIC_PROFILE = "mood-v1";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const MOOD_KEYWORDS = [
  ["мист", "mystery"],
  ["страш", "horror"],
  ["ужас", "horror"],
  ["тайн", "mystery"],
  ["ноч", "night"],
  ["любов", "romance"],
  ["романт", "romance"],
  ["смеш", "comedy"],
  ["смех", "comedy"],
  ["шут", "comedy"],
  ["весел", "comedy"],
  ["полит", "dramatic"],
  ["серьез", "dramatic"],
  ["драм", "dramatic"],
  ["чердак", "mystery"],
  ["призрак", "horror"],
  ["кошмар", "horror"],
];

const DEFAULT_TRACK_VOLUME = {
  romantic: 0.24,
  fun: 0.26,
  mystic: 0.2,
  dramatic: 0.22,
  neutral: 0.22,
};

const volumeForMood = (mood) => DEFAULT_TRACK_VOLUME[mood] ?? DEFAULT_TRACK_VOLUME.neutral;

const collectStoryText = (conversation) => {
  const chunks = [];
  const openingPrompt = conversation.story?.opening?.imagePrompt;
  if (openingPrompt?.trim()) {
    chunks.push(openingPrompt);
  }
  for (const message of conversation.messages ?? []) {
    if (message.storyImagePrompt?.trim()) {
      chunks.push(message.storyImagePrompt);
    }
    if (message.text?.trim()) {
      chunks.push(message.text);
    }
  }
  return normalizeSpace(chunks.join(" "));
};

const scoreTrackHeuristic = (trackId, storyText) => {
  const lower = storyText.toLowerCase();
  const moods = new Set();
  for (const [keyword, mood] of MOOD_KEYWORDS) {
    if (lower.includes(keyword)) {
      moods.add(mood);
    }
  }
  const trackMoods = MUSIC_TRACK_MOODS[trackId] ?? [];
  let score = 0;
  for (const mood of trackMoods) {
    if (moods.has(mood)) {
      score += 2;
    }
  }
  if (trackMoods.includes("neutral")) {
    score += 0.5;
  }
  return {score, primaryMood: trackMoods[0] ?? "neutral"};
};

const pickHeuristicTrack = (tracks, storyText) => {
  const ranked = tracks
    .map((track) => ({track, ...scoreTrackHeuristic(track.id, storyText)}))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 2) {
    const fallback =
      tracks.find((track) => track.id.includes("mystic")) ??
      tracks.find((track) => MUSIC_TRACK_MOODS[track.id]?.includes("neutral")) ??
      tracks[0];
    if (!fallback) {
      return null;
    }
    return {
      trackId: fallback.id,
      mood: MUSIC_TRACK_MOODS[fallback.id]?.[0] ?? "neutral",
      volume: volumeForMood(MUSIC_TRACK_MOODS[fallback.id]?.[0] ?? "neutral"),
      reason: "нейтральный фон",
    };
  }

  return {
    trackId: best.track.id,
    mood: best.primaryMood,
    volume: volumeForMood(best.primaryMood),
    reason: `совпадение настроения (${best.primaryMood})`,
  };
};

const buildTrackSummary = (tracks) =>
  tracks
    .map((track) => {
      const moods = (MUSIC_TRACK_MOODS[track.id] ?? ["neutral"]).join(", ");
      return `${track.id} | ${track.label} | moods: ${moods}`;
    })
    .join("\n");

const pickWithLlm = async (conversation, tracks) => {
  const storyText = collectStoryText(conversation);
  const system = [
    "Ты музыкальный редактор для коротких story-роликов (переписка + сюжет сверху).",
    "Выбери ОДИН трек из списка по настроению всей истории.",
    "Учитывай imagePrompt сцен и тон переписки, не буквальные шутки.",
    "Для мистики/страха — mystic; лёгкой комедии — fun; романтики — romantic; серьёзной драмы — dramatic/neutral.",
    'Ответ JSON: {"trackId":"file.mp3","volume":0.2,"reason":"кратко"}',
    "volume: 0.16–0.28, тише для напряжённых сюжетов.",
  ].join("\n");

  const user = [
    `Контакт: ${conversation.contactName ?? "Собеседник"}`,
    `Треки:\n${buildTrackSummary(tracks)}`,
    `Контекст истории:\n${storyText || "—"}`,
  ].join("\n\n");

  const parsed = await chatCompletionJson({system, user, temperature: 0.25});
  const trackId = path.basename(String(parsed?.trackId ?? "").trim());
  const track = tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error(`LLM выбрал неизвестный трек: ${trackId || "—"}`);
  }
  const volume =
    typeof parsed.volume === "number"
      ? Math.min(0.32, Math.max(0.12, parsed.volume))
      : volumeForMood(MUSIC_TRACK_MOODS[track.id]?.[0] ?? "neutral");
  return {trackId: track.id, mood: MUSIC_TRACK_MOODS[track.id]?.[0] ?? "neutral", volume, reason: parsed.reason};
};

export const shouldAutoPickStoryMusic = (musicId) =>
  musicId === "auto" || musicId === "" || musicId == null;

export const needsStoryMusicAssignment = (conversation, musicId) => {
  if (!isStoryVisualLayout(conversation)) {
    return false;
  }
  if (musicId === "none") {
    return false;
  }
  if (!shouldAutoPickStoryMusic(musicId)) {
    return false;
  }
  return conversation.music?.autoProfile !== STORY_MUSIC_PROFILE || !conversation.music?.src;
};

export const assignStoryMusicIfNeeded = async (conversation, {musicId, force = false, logs = []} = {}) => {
  if (!isStoryVisualLayout(conversation)) {
    return logs;
  }
  if (musicId === "none") {
    return logs;
  }
  if (!force && !needsStoryMusicAssignment(conversation, musicId)) {
    return logs;
  }
  if (!shouldAutoPickStoryMusic(musicId)) {
    return logs;
  }

  const tracks = await listMusicTracks();
  if (tracks.length === 0) {
    logs.push("Музыка: треки не найдены в public/music");
    return logs;
  }

  let picked;
  if (isOpenRouterConfigured()) {
    try {
      picked = await pickWithLlm(conversation, tracks);
      logs.push(`Музыка (LLM): ${picked.trackId} — ${picked.reason ?? picked.mood}`);
    } catch (error) {
      logs.push(
        `Музыка LLM: ${error instanceof Error ? error.message : String(error)} — эвристика`,
      );
      picked = pickHeuristicTrack(tracks, collectStoryText(conversation));
      if (picked) {
        logs.push(`Музыка (эвристика): ${picked.trackId} — ${picked.reason}`);
      }
    }
  } else {
    picked = pickHeuristicTrack(tracks, collectStoryText(conversation));
    if (picked) {
      logs.push(`Музыка (эвристика): ${picked.trackId} — ${picked.reason}`);
    }
  }

  if (!picked) {
    logs.push("Музыка: не удалось подобрать трек");
    return logs;
  }

  const src = await resolveMusicSrc(picked.trackId);
  conversation.music = {
    ...conversation.music,
    enabled: true,
    src,
    volume: picked.volume,
    autoProfile: STORY_MUSIC_PROFILE,
  };
  return logs;
};
