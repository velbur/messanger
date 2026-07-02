import type {ConversationInput} from "./schema";

export const VOICEOVER_BUNDLE_MARKER = "voiceover-openrouter-v2";
/** Меняется при смене голосов/промпта TTS — старые WAV перегенерируются */
export const OPENROUTER_TTS_PROFILE = "young-emotional-v3";

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

/** Профиль озвучки: меняется при смене голосов персонажей — старые WAV перегенерируются */
export const buildConversationVoiceTtsProfile = (
  voiceover: ConversationVoiceover,
  voices?: {female: string; male: string},
): string => {
  const me = pickOpenRouterVoice(voiceover, "me", voices);
  const them = pickOpenRouterVoice(voiceover, "them", voices);
  return `${OPENROUTER_TTS_PROFILE}|${me}|${them}`;
};

export const messageHasVoiceover = (
  message: ConversationInput["messages"][number],
): boolean => Boolean(message.voiceAudio?.trim() && message.voiceDurationMs);
