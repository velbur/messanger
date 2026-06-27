import type {ConversationInput} from "./schema";

export type ConversationMusic = {
  enabled: boolean;
  /** Путь относительно public/ */
  src: string;
  volume: number;
  autoProfile?: string;
};

export const DEFAULT_MUSIC: ConversationMusic = {
  enabled: true,
  src: "music/romantic.mp3",
  volume: 0.24,
};

export const mergeConversationMusic = (
  conversation: ConversationInput,
): ConversationMusic => ({
  ...DEFAULT_MUSIC,
  ...conversation.music,
});
