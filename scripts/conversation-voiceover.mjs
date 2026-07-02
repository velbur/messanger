import {mergeConversationVoiceover, pickOpenRouterVoice} from "../src/chat/voiceover.ts";
import {getOpenRouterTtsVoices} from "./openrouter-client.mjs";
import {messageNeedsOpenRouterVoice, normalizeAudioNamespace, voiceRefForMessage} from "./voice-assets.mjs";

export {generateMissingVoiceover, messageNeedsOpenRouterVoice} from "./voice-assets.mjs";

export const countPendingVoiceover = (conversation) => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    return 0;
  }
  const voices = getOpenRouterTtsVoices();
  let pending = 0;
  for (const message of conversation.messages ?? []) {
    if (messageNeedsOpenRouterVoice(message, voiceover, voices)) {
      pending += 1;
    }
  }
  return pending;
};

export const describeVoiceoverPlan = (conversation, audioNamespace) => {
  const voiceover = mergeConversationVoiceover(conversation);
  const voices = getOpenRouterTtsVoices();
  const namespace = normalizeAudioNamespace(audioNamespace);
  return (conversation.messages ?? [])
    .map((message, index) => {
      if (!isSpeechableText(message.text)) {
        return null;
      }
      return {
        index,
        author: message.author,
        speaker: pickOpenRouterVoice(voiceover, message.author, voices),
        targetRef: voiceRefForMessage(namespace, index),
        hasAudio: Boolean(message.voiceAudio?.trim()),
      };
    })
    .filter(Boolean);
};
