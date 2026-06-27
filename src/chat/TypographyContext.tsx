import React, {createContext, useContext, useMemo} from "react";
import type {ConversationInput} from "./schema";
import {resolveChatTypography, type ChatTypography, DEFAULT_MESSAGE_FONT_SIZE} from "./typography";

const defaultTypography = resolveChatTypography({});

const TypographyContext = createContext<ChatTypography>(defaultTypography);

export const ChatTypographyProvider: React.FC<{
  conversation: ConversationInput;
  layoutScale?: number;
  children: React.ReactNode;
}> = ({conversation, layoutScale = 1, children}) => {
  const typography = useMemo(
    () => resolveChatTypography(conversation, {layoutScale}),
    [conversation.messageFontSize, layoutScale],
  );
  return <TypographyContext.Provider value={typography}>{children}</TypographyContext.Provider>;
};

export const useChatTypography = (): ChatTypography => useContext(TypographyContext);
