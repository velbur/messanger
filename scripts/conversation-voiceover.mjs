import {mergeConversationVoiceover, pickSileroSpeaker} from "../src/chat/voiceover.ts";
import {normalizeAudioNamespace, voiceRefForMessage} from "./voice-assets.mjs";
import {isSpeechableText} from "./tts/text-for-speech.mjs";

export {generateMissingVoiceover} from "./voice-assets.mjs";

export const countPendingVoiceover = (conversation) => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    return 0;
  }
  let pending = 0;
  for (const message of conversation.messages ?? []) {
    if (!isSpeechableText(message.text)) {
      continue;
    }
    if (!String(message.voiceAudio ?? "").trim()) {
      pending += 1;
    }
  }
  return pending;
};

export const describeVoiceoverPlan = (conversation, audioNamespace) => {
  const voiceover = mergeConversationVoiceover(conversation);
  const namespace = normalizeAudioNamespace(audioNamespace);
  return (conversation.messages ?? [])
    .map((message, index) => {
      if (!isSpeechableText(message.text)) {
        return null;
      }
      return {
        index,
        author: message.author,
        speaker: pickSileroSpeaker(voiceover, message.author),
        targetRef: voiceRefForMessage(namespace, index),
        hasAudio: Boolean(message.voiceAudio?.trim()),
      };
    })
    .filter(Boolean);
};
