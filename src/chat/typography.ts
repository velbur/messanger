import type {ConversationInput} from "./schema";
import {S} from "./theme";

/** Размер текста в пузырях (px в кадре), по умолчанию S(44) */
export const DEFAULT_MESSAGE_FONT_SIZE = S(44);
const DEFAULT_MESSAGE_TIME_FONT_SIZE = S(26);
const DEFAULT_INPUT_TEXT_FONT_SIZE = S(40);

export type ChatTypography = {
  messageFontSize: number;
  messageTimeFontSize: number;
  inputTextFontSize: number;
};

export const resolveChatTypography = (conversation: Pick<ConversationInput, "messageFontSize">): ChatTypography => {
  const messageFontSize = conversation.messageFontSize ?? DEFAULT_MESSAGE_FONT_SIZE;
  const ratio = messageFontSize / DEFAULT_MESSAGE_FONT_SIZE;
  return {
    messageFontSize,
    messageTimeFontSize: Math.round(DEFAULT_MESSAGE_TIME_FONT_SIZE * ratio),
    inputTextFontSize: Math.round(DEFAULT_INPUT_TEXT_FONT_SIZE * ratio),
  };
};
