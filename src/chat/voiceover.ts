import type {ConversationInput} from "./schema";

export const VOICEOVER_BUNDLE_MARKER = "voiceover-silero-v1";

export type VoiceoverProvider = "openrouter" | "silero" | "mms";

export type VoiceoverGender = "male" | "female";

export type SileroSpeaker =
  | "aidar"
  | "baya"
  | "kseniya"
  | "xenia"
  | "eugene";

export type ConversationVoiceover = {
  enabled: boolean;
  provider: VoiceoverProvider;
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

const SILERO_BY_GENDER: Record<VoiceoverGender, SileroSpeaker> = {
  female: "xenia",
  male: "aidar",
};

export const mergeConversationVoiceover = (
  conversation: ConversationInput,
): ConversationVoiceover => ({
  ...DEFAULT_VOICEOVER,
  ...conversation.voiceover,
  enabled: Boolean(conversation.voiceover?.enabled),
});

export const pickSileroSpeaker = (
  voiceover: ConversationVoiceover,
  author: "me" | "them",
): SileroSpeaker => {
  const gender = author === "me" ? voiceover.meVoice : voiceover.themVoice;
  return SILERO_BY_GENDER[gender] ?? (gender === "male" ? "aidar" : "xenia");
};

/** Голоса Gemini TTS на OpenRouter (Kore, Charon, …) */
export const pickOpenRouterVoice = (
  voiceover: ConversationVoiceover,
  author: "me" | "them",
  voices?: {female: string; male: string},
): string => {
  const gender = author === "me" ? voiceover.meVoice : voiceover.themVoice;
  if (voices) {
    return gender === "male" ? voices.male : voices.female;
  }
  return gender === "male" ? "Charon" : "Kore";
};

export const messageHasVoiceover = (
  message: ConversationInput["messages"][number],
): boolean => Boolean(message.voiceAudio?.trim() && message.voiceDurationMs);
