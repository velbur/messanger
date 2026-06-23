import type {ConversationInput} from "./schema";
import {isEnglishConversation} from "./locale";
import {msToFrames} from "./fps";
import {scaleTimingMs} from "./timing";

const scaleMs = scaleTimingMs;

export type ConversationOutro = {
  enabled: boolean;
  text: string;
  pauseBeforeMs: number;
  durationMs: number;
};

export const DEFAULT_OUTRO_RU: ConversationOutro = {
  enabled: false,
  text: "Подпишись :)",
  pauseBeforeMs: 700,
  durationMs: 2800,
};

export const DEFAULT_OUTRO_EN: ConversationOutro = {
  enabled: false,
  text: "Subscribe :)",
  pauseBeforeMs: 700,
  durationMs: 2800,
};

/** @deprecated use getDefaultOutro */
export const DEFAULT_OUTRO = DEFAULT_OUTRO_RU;

export const getDefaultOutro = (conversation: ConversationInput): ConversationOutro =>
  isEnglishConversation(conversation) ? DEFAULT_OUTRO_EN : DEFAULT_OUTRO_RU;

export const mergeConversationOutro = (conversation: ConversationInput): ConversationOutro => ({
  ...getDefaultOutro(conversation),
  ...conversation.outro,
});

export const outroPauseFrames = (outro: ConversationOutro): number =>
  msToFrames(scaleMs(outro.pauseBeforeMs));

export const outroDurationFrames = (outro: ConversationOutro): number =>
  msToFrames(scaleMs(outro.durationMs));
