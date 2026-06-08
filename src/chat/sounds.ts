import type {ConversationInput} from "./schema";

export type ConversationSounds = {
  incoming: string;
  outgoing: string;
  typing: string;
  messageVolume: number;
  typingVolumeThem: number;
  typingVolumeMe: number;
};

export const DEFAULT_SOUNDS: ConversationSounds = {
  incoming: "sounds/incoming.wav",
  outgoing: "sounds/outgoing.wav",
  typing: "sounds/typing.wav",
  messageVolume: 0.75,
  typingVolumeThem: 0.22,
  typingVolumeMe: 0.12,
};

export const mergeConversationSounds = (
  conversation: ConversationInput,
): ConversationSounds => ({
  ...DEFAULT_SOUNDS,
  ...conversation.sounds,
});
