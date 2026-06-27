import type {ConversationInput} from "./schema";

export const VOICEOVER_BUNDLE_MARKER = "voiceover-openrouter-v2";
/** Меняется при смене голосов/промпта TTS — старые WAV перегенерируются */
export const OPENROUTER_TTS_PROFILE = "young-emotional-v1";

export type VoiceoverGender = "male" | "female";

export type ConversationVoiceover = {
  enabled: boolean;
  provider: "openrouter";
  themVoice: VoiceoverGender;
  meVoice: VoiceoverGender;
  /** Громкость реплик 0–1 */
  volume: number;
  /** Множитель громкости музыки, пока идёт озвучка (0.2 = тише в 5 раз) */
  musicDuck: number;
};

export const DEFAULT_VOICEOVER: ConversationVoiceover = {
  enabled: false,
  provider: "openrouter",
  themVoice: "female",
  meVoice: "male",
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

/** Голоса Gemini TTS на OpenRouter (Leda — youthful, Puck — upbeat, …) */
export const pickOpenRouterVoice = (
  voiceover: ConversationVoiceover,
  author: "me" | "them",
  voices?: {female: string; male: string},
): string => {
  const gender = author === "me" ? voiceover.meVoice : voiceover.themVoice;
  if (voices) {
    return gender === "male" ? voices.male : voices.female;
  }
  return gender === "male" ? "Puck" : "Leda";
};

export const messageHasVoiceover = (
  message: ConversationInput["messages"][number],
): boolean => Boolean(message.voiceAudio?.trim() && message.voiceDurationMs);
