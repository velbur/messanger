import type {ConversationInput} from "./schema";
import {TIMING_SCALE} from "./timing";

const FPS = 60;
const scaleMs = (ms: number): number => Math.max(1, Math.round(ms * TIMING_SCALE));
const msToFrames = (ms: number): number => Math.max(1, Math.round((ms / 1000) * FPS));

export type ConversationOutro = {
  enabled: boolean;
  text: string;
  pauseBeforeMs: number;
  durationMs: number;
};

export const DEFAULT_OUTRO: ConversationOutro = {
  enabled: true,
  text: "Подпишись :)",
  pauseBeforeMs: 700,
  durationMs: 2800,
};

export const mergeConversationOutro = (conversation: ConversationInput): ConversationOutro => ({
  ...DEFAULT_OUTRO,
  ...conversation.outro,
});

export const outroPauseFrames = (outro: ConversationOutro): number =>
  msToFrames(scaleMs(outro.pauseBeforeMs));

export const outroDurationFrames = (outro: ConversationOutro): number =>
  msToFrames(scaleMs(outro.durationMs));
