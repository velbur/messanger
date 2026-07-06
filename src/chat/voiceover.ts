import type {ConversationInput} from "./schema";

export const VOICEOVER_BUNDLE_MARKER = "voiceover-openrouter-v2";
/** Маркер авто-ускорения озвучки под Veo-клипы в story */
export const STORY_VOICE_SYNC_BUNDLE_MARKER = "story-voice-sync-v1";
/** Максимальное ускорение WAV при подгонке под длительность story-сцены (1 = без ускорения) */
export const STORY_VOICE_SYNC_MAX_PLAYBACK_RATE = 4;
/** Меняется при смене голосов/промпта TTS — старые WAV перегенерируются */
export const OPENROUTER_TTS_PROFILE = "young-emotional-v4";
/** Скорость речи Gemini TTS (1 = норма). Меняется → voiceTtsProfile → перегенерация WAV. */
export const OPENROUTER_TTS_SPEECH_SPEED = 1.5;

export type VoiceoverGender = "male" | "female";

/** Gemini TTS (OpenRouter) — id совпадает с voice в API */
export type GeminiTtsVoiceId = (typeof GEMINI_TTS_VOICES)[number]["id"];

export const GEMINI_TTS_VOICES = [
  {id: "Puck", hint: "бодрый", gender: "male"},
  {id: "Charon", hint: "информативный", gender: "male"},
  {id: "Fenrir", hint: "эмоциональный", gender: "male"},
  {id: "Orus", hint: "твёрдый", gender: "male"},
  {id: "Enceladus", hint: "с придыханием", gender: "male"},
  {id: "Iapetus", hint: "чёткий", gender: "male"},
  {id: "Algieba", hint: "плавный", gender: "male"},
  {id: "Algenib", hint: "хриплый", gender: "male"},
  {id: "Rasalgethi", hint: "уверенный", gender: "male"},
  {id: "Alnilam", hint: "твёрдый", gender: "male"},
  {id: "Achird", hint: "дружелюбный", gender: "male"},
  {id: "Sadachbia", hint: "живой", gender: "male"},
  {id: "Sadaltager", hint: "спокойный эксперт", gender: "male"},
  {id: "Schedar", hint: "ровный", gender: "male"},
  {id: "Zubenelgenubi", hint: "непринуждённый", gender: "male"},
  {id: "Leda", hint: "молодой", gender: "female"},
  {id: "Kore", hint: "твёрдый", gender: "female"},
  {id: "Aoede", hint: "лёгкий", gender: "female"},
  {id: "Callirrhoe", hint: "спокойный", gender: "female"},
  {id: "Autonoe", hint: "яркий", gender: "female"},
  {id: "Despina", hint: "плавный", gender: "female"},
  {id: "Erinome", hint: "чёткий", gender: "female"},
  {id: "Laomedeia", hint: "бодрый", gender: "female"},
  {id: "Achernar", hint: "мягкий", gender: "female"},
  {id: "Gacrux", hint: "зрелый", gender: "female"},
  {id: "Pulcherrima", hint: "напористый", gender: "female"},
  {id: "Vindemiatrix", hint: "нежный", gender: "female"},
  {id: "Sulafat", hint: "тёплый", gender: "female"},
  {id: "Zephyr", hint: "яркий", gender: "female"},
  {id: "Umbriel", hint: "лёгкий", gender: "female"},
] as const;

const GEMINI_VOICE_IDS = new Set<string>(GEMINI_TTS_VOICES.map((v) => v.id));

export const isGeminiTtsVoiceId = (value: string): value is GeminiTtsVoiceId =>
  GEMINI_VOICE_IDS.has(value);

/** Значение в JSON: id голоса или legacy male/female */
export type VoiceoverCharacterVoice = string;

export type ConversationVoiceover = {
  enabled: boolean;
  provider: "openrouter";
  themVoice: VoiceoverCharacterVoice;
  meVoice: VoiceoverCharacterVoice;
  /** Доп. инструкции для TTS (темп, атмосфера — не тембр) */
  ttsPrompt?: string;
  /** Громкость реплик 0–1 */
  volume: number;
  /** Множитель громкости музыки, пока идёт озвучка (0.2 = тише в 5 раз) */
  musicDuck: number;
};

export const DEFAULT_VOICEOVER: ConversationVoiceover = {
  enabled: false,
  provider: "openrouter",
  themVoice: "Leda",
  meVoice: "Puck",
  volume: 0.92,
  musicDuck: 0.28,
};

export const mergeConversationVoiceover = (
  conversation: ConversationInput,
): ConversationVoiceover => ({
  ...DEFAULT_VOICEOVER,
  ...conversation.voiceover,
  enabled: Boolean(conversation.voiceover?.enabled),
  provider: "openrouter",
});

export const resolveCharacterVoice = (
  value: string | undefined,
  fallbackGender: VoiceoverGender,
  defaults?: {female: string; male: string},
): string => {
  const raw = String(value ?? "").trim();
  if (raw && raw !== "male" && raw !== "female" && isGeminiTtsVoiceId(raw)) {
    return raw;
  }
  const gender: VoiceoverGender =
    raw === "female" || raw === "male" ? raw : fallbackGender;
  if (defaults) {
    return gender === "male" ? defaults.male : defaults.female;
  }
  return gender === "male" ? "Puck" : "Leda";
};

/** Голос Gemini TTS для автора реплики */
export const pickOpenRouterVoice = (
  voiceover: ConversationVoiceover,
  author: "me" | "them",
  voices?: {female: string; male: string},
): string => {
  const raw = author === "me" ? voiceover.meVoice : voiceover.themVoice;
  const fallbackGender: VoiceoverGender = author === "me" ? "male" : "female";
  return resolveCharacterVoice(raw, fallbackGender, voices);
};

/** Компактный отпечаток доп. промпта для voiceTtsProfile */
export const fingerprintVoiceTtsPrompt = (prompt: string | undefined): string => {
  const normalized = String(prompt ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 64) {
    return normalized;
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return `${normalized.slice(0, 32)}#${hash.toString(36)}`;
};

/** Профиль озвучки: меняется при смене голосов/промпта — старые WAV перегенерируются */
export const buildConversationVoiceTtsProfile = (
  voiceover: ConversationVoiceover,
  voices?: {female: string; male: string},
  speechSpeed: number = OPENROUTER_TTS_SPEECH_SPEED,
): string => {
  const me = pickOpenRouterVoice(voiceover, "me", voices);
  const them = pickOpenRouterVoice(voiceover, "them", voices);
  const promptFp = fingerprintVoiceTtsPrompt(voiceover.ttsPrompt);
  const speedTag = Number.isFinite(speechSpeed) ? `sp${speechSpeed}` : "sp1";
  const base = `${OPENROUTER_TTS_PROFILE}|${speedTag}|${me}|${them}`;
  return promptFp ? `${base}|${promptFp}` : base;
};

export const messageHasVoiceover = (
  message: ConversationInput["messages"][number],
): boolean => Boolean(message.voiceAudio?.trim() && message.voiceDurationMs);

export type VoiceFrameRange = {
  start: number;
  end: number;
};

/** ~400 ms при 30 fps — плавный вход/выход ducking без резких скачков */
export const MUSIC_DUCK_FADE_FRAMES = 12;

const smoothStep = (t: number): number => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

export const buildVoiceFrameRanges = (
  events: ReadonlyArray<{
    revealFrame: number;
    voiceAudio?: string;
    voiceDurationFrames: number;
  }>,
): VoiceFrameRange[] =>
  events
    .filter((event) => event.voiceAudio && event.voiceDurationFrames > 0)
    .map((event) => ({
      start: event.revealFrame,
      end: event.revealFrame + event.voiceDurationFrames,
    }));

/** 1 = полная громкость музыки, musicDuck = приглушение во время озвучки */
export const musicDuckMultiplierAtFrame = (
  frame: number,
  ranges: readonly VoiceFrameRange[],
  musicDuck: number,
  fadeFrames = MUSIC_DUCK_FADE_FRAMES,
): number => {
  if (!ranges.length || musicDuck >= 1) {
    return 1;
  }

  const duck = Math.min(1, Math.max(0, musicDuck));
  let factor = 1;

  for (const {start, end} of ranges) {
    if (end <= start) {
      continue;
    }

    const attackStart = start - fadeFrames;
    const releaseEnd = end + fadeFrames;
    let rangeFactor = 1;

    if (frame >= start && frame < end) {
      rangeFactor = duck;
    } else if (frame >= attackStart && frame < start) {
      rangeFactor = 1 + (duck - 1) * smoothStep((frame - attackStart) / fadeFrames);
    } else if (frame >= end && frame < releaseEnd) {
      rangeFactor = duck + (1 - duck) * smoothStep((frame - end) / fadeFrames);
    }

    factor = Math.min(factor, rangeFactor);
  }

  return factor;
};

export const createMusicVolumeAtFrame = (
  music: {enabled: boolean; volume: number},
  voiceover: {enabled: boolean; musicDuck: number},
  voiceFrameRanges: readonly VoiceFrameRange[],
): ((frame: number) => number) => {
  return (frame: number) => {
    if (!music.enabled) {
      return 0;
    }
    if (!voiceover.enabled || !voiceFrameRanges.length) {
      return music.volume;
    }
    const duckMul = musicDuckMultiplierAtFrame(frame, voiceFrameRanges, voiceover.musicDuck);
    return music.volume * duckMul;
  };
};
