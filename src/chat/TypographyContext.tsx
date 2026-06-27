import React, {createContext, useContext, useMemo} from "react";
import type {ConversationInput} from "./schema";
import {resolveChatTypography, type ChatTypography, DEFAULT_MESSAGE_FONT_SIZE} from "./typography";

const defaultTypography = resolveChatTypography({});

const TypographyContext = createContext<ChatTypography>(defaultTypography);

export const ChatTypographyProvider: React.FC<{
  conversation: ConversationInput;
  children: React.ReactNode;
}> = ({conversation, children}) => {
  const typography = useMemo(() => resolveChatTypography(conversation), [conversation.messageFontSize]);
  return <TypographyContext.Provider value={typography}>{children}</TypographyContext.Provider>;
};

export const useChatTypography = (): ChatTypography => useContext(TypographyContext);
