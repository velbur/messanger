import type {ConversationInput} from "./schema";
import {msToFrames} from "./fps";

/** Заставки идут ровно durationMs — без TIMING_SCALE переписки */

export type TitleCardConfig = {
  enabled: boolean;
  text: string;
  durationMs: number;
};

export const DEFAULT_INTRO: TitleCardConfig = {
  enabled: false,
  text: "",
  durationMs: 5000,
};

export const DEFAULT_END_CARD: TitleCardConfig = {
  enabled: false,
  text: "Продолжение следует...",
  durationMs: 5000,
};

const mergeTitleCard = (
  partial: ConversationInput["intro"] | ConversationInput["endCard"],
  defaults: TitleCardConfig,
): TitleCardConfig => {
  const merged = {...defaults, ...partial};
  const text = String(merged.text ?? "").trim();
  return {
    enabled: Boolean(merged.enabled && text),
    text,
    durationMs: merged.durationMs ?? defaults.durationMs,
  };
};

export const mergeIntro = (conversation: ConversationInput): TitleCardConfig =>
  mergeTitleCard(conversation.intro, DEFAULT_INTRO);

export const mergeEndCard = (conversation: ConversationInput): TitleCardConfig =>
  mergeTitleCard(conversation.endCard, DEFAULT_END_CARD);

export const titleCardDurationFrames = (card: TitleCardConfig): number =>
  msToFrames(card.durationMs);
