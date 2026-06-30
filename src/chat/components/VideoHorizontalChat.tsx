import React from "react";
import type {ConversationInput} from "../schema";
import {getMessengerLocale} from "../locale";
import {getTheme, LAYOUT, VIDEO_LAYOUT} from "../theme";
import {useChatTheme} from "../ThemeContext";
import {ChatHeader} from "./ChatHeader";
import {InputBar} from "./InputBar";
import {MessageBubble} from "./MessageBubble";
import {StatusBar} from "./StatusBar";
import {TypingIndicator} from "./TypingIndicator";
import {Wallpaper} from "./Wallpaper";

type TimelineEvent = {
  index: number;
  author: "me" | "them";
  text: string;
  image?: string;
  sentAt: string;
  revealFrame: number;
};

type Props = {
  conversation: ConversationInput;
  visibleEvents: TimelineEvent[];
  activeEvent: TimelineEvent | undefined;
  lastEventIndex: number;
  headerStatus: string;
  statusBarTime: string;
  opacity?: number;
};

export const VideoHorizontalChat: React.FC<Props> = ({
  conversation,
  visibleEvents,
  activeEvent,
  lastEventIndex,
  headerStatus,
  statusBarTime,
  opacity = 1,
}) => {
  const theme = useChatTheme();
  const messengerLocale = getMessengerLocale(conversation);
  const columnWidth = VIDEO_LAYOUT.chatColumnWidth;

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        minHeight: 0,
        opacity,
      }}
    >
      <Wallpaper />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: columnWidth,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          boxShadow: "0 0 80px rgba(0, 0, 0, 0.35)",
        }}
      >
        <StatusBar time={statusBarTime} />
        <ChatHeader
          contactName={conversation.contactName}
          contactStatus={headerStatus}
          contactAvatar={conversation.contactAvatar}
        />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            padding: `${VIDEO_LAYOUT.chatPaddingTop}px ${VIDEO_LAYOUT.chatPaddingX}px ${VIDEO_LAYOUT.chatPaddingBottom}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: theme.chatBg,
          }}
        >
          <div style={{display: "flex", flexDirection: "column", width: "100%"}}>
            {visibleEvents.map((event) => (
              <MessageBubble
                key={event.index}
                author={event.author}
                text={event.text}
                image={event.image}
                sentAt={event.sentAt}
                revealFrame={event.revealFrame}
                emphasizeFinale={event.index === lastEventIndex}
              />
            ))}
            {activeEvent?.author === "them" ? <TypingIndicator /> : null}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            background: theme.inputBarBg,
            paddingLeft: LAYOUT.chatPaddingLeft,
            paddingRight: LAYOUT.chatPaddingRight,
            paddingBottom: Math.round(LAYOUT.shortsSafeAreaBottom * 0.35),
          }}
        >
          <InputBar placeholder={messengerLocale.inputPlaceholder} />
        </div>
      </div>
    </div>
  );
};
