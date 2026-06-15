import React, {useMemo} from "react";
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import type {ConversationInput} from "./schema";
import {sliceChars} from "./emoji";
import {messageCaption} from "./message";
import {visibleCharCountAtProgress} from "./typingCurve";
import {CHAT_FONT_FAMILY} from "./fonts";
import {SubscribeOutro} from "./components/SubscribeOutro";
import {TitleCard} from "./components/TitleCard";
import {mergeConversationOutro} from "./outro";
import {mergeEndCard, mergeIntro} from "./title-card";
import {mergeConversationMusic} from "./music";
import {mergeConversationSounds} from "./sounds";
import {buildTimeline, FULLSCREEN_TIMELINE_REV, visibleMessageCountAtFrame} from "./timeline";
import {getTheme, LAYOUT} from "./theme";
import {ChatThemeProvider} from "./ThemeContext";
import {ChatHeader} from "./components/ChatHeader";
import {InputBar} from "./components/InputBar";
import {FullscreenImage} from "./components/FullscreenImage";
import {MessageBubble} from "./components/MessageBubble";
import {StatusBar} from "./components/StatusBar";
import {TypingIndicator} from "./components/TypingIndicator";
import {Wallpaper} from "./components/Wallpaper";

type Props = {
  conversation: ConversationInput;
};

export const ChatVideo: React.FC<Props> = ({conversation}) => {
  const frame = useCurrentFrame();
  const timeline = useMemo(() => buildTimeline(conversation), [conversation]);
  const sounds = useMemo(() => mergeConversationSounds(conversation), [conversation]);
  const music = useMemo(() => mergeConversationMusic(conversation), [conversation]);
  const outro = useMemo(() => mergeConversationOutro(conversation), [conversation]);
  const intro = useMemo(() => mergeIntro(conversation), [conversation]);
  const endCard = useMemo(() => mergeEndCard(conversation), [conversation]);
  const theme = getTheme(conversation.wallpaper);

  const inIntro = intro.enabled && frame < timeline.introDurationFrames;
  const inEndCard =
    endCard.enabled &&
    frame >= timeline.endCardStartFrame &&
    frame < timeline.outroStartFrame;
  const inTitleCard = inIntro || inEndCard;

  const inOutro = !inTitleCard && outro.enabled && frame >= timeline.outroStartFrame;

  const activeFullscreenEvent = timeline.events.find(
    (event) =>
      event.image &&
      event.fullscreenFrames > 0 &&
      frame >= event.fullscreenStartFrame &&
      frame < event.fullscreenEndFrame,
  );

  const fullscreenDim = activeFullscreenEvent
    ? interpolate(
        frame,
        [
          activeFullscreenEvent.fullscreenStartFrame,
          activeFullscreenEvent.fullscreenStartFrame + 8,
          activeFullscreenEvent.fullscreenEndFrame - 8,
          activeFullscreenEvent.fullscreenEndFrame,
        ],
        [1, 0, 0, 1],
        {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
      )
    : 1;

  const outroDim = inOutro
    ? interpolate(
        frame,
        [timeline.outroStartFrame, timeline.outroStartFrame + 20],
        [1, 0.22],
        {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
      )
    : 1;

  const chatDim = Math.min(fullscreenDim, outroDim);

  const activeEvent = timeline.events.find(
    (event) => frame >= event.typingStartFrame && frame < event.revealFrame,
  );

  const visibleCount = visibleMessageCountAtFrame(
    timeline.events,
    frame,
    timeline.introDurationFrames,
  );
  const visibleEvents = timeline.events.slice(0, visibleCount);

  const activeCaption = activeEvent ? messageCaption(activeEvent) : "";
  const typedText =
    activeEvent?.author === "me" && activeCaption.length > 0
      ? sliceChars(
          activeCaption,
          visibleCharCountAtProgress(
            (frame - activeEvent.typingStartFrame) / Math.max(1, activeEvent.typingFrames),
            activeCaption,
          ),
        )
      : "";

  const isThemTyping = activeEvent?.author === "them";
  const headerStatus = isThemTyping
    ? conversation.contactStatusTyping
    : conversation.contactStatus;

  return (
    <ChatThemeProvider mode={conversation.wallpaper}>
      <AbsoluteFill
        style={{
          fontFamily: CHAT_FONT_FAMILY,
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.statusBarBg,
        }}
      >
        <Wallpaper />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            width: "100%",
            opacity: inTitleCard ? 0 : chatDim,
          }}
        >
          <StatusBar />
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
              padding: `${LAYOUT.chatPaddingTop}px ${LAYOUT.chatPaddingRight}px ${LAYOUT.chatPaddingBottom}px ${LAYOUT.chatPaddingLeft}px`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              {visibleEvents.map((event) => (
                <MessageBubble
                  key={event.index}
                  author={event.author}
                  text={event.text}
                  image={event.image}
                  sentAt={event.sentAt}
                  revealFrame={event.revealFrame}
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
              paddingBottom: LAYOUT.shortsSafeAreaBottom,
            }}
          >
            <InputBar typedText={typedText} />
          </div>
        </div>

        {music.enabled ? (
          <Audio src={staticFile(music.src)} volume={music.volume} loop />
        ) : null}

        {intro.enabled ? (
          <TitleCard
            text={intro.text}
            startFrame={0}
            durationFrames={timeline.introDurationFrames}
          />
        ) : null}

        {inOutro ? (
          <SubscribeOutro startFrame={timeline.outroStartFrame} text={outro.text} />
        ) : null}

        {endCard.enabled ? (
          <TitleCard
            text={endCard.text}
            startFrame={timeline.endCardStartFrame}
            durationFrames={timeline.endCardDurationFrames}
          />
        ) : null}

        {timeline.events.map((event) =>
          event.image && event.fullscreenFrames > 0 ? (
            <FullscreenImage
              key={`fullscreen-${event.index}-${FULLSCREEN_TIMELINE_REV}`}
              image={event.image}
              startFrame={event.fullscreenStartFrame}
              durationFrames={event.fullscreenFrames}
            />
          ) : null,
        )}

        {timeline.events.map((event) => (
          <React.Fragment key={`sound-${event.index}`}>
            <Sequence from={event.revealFrame}>
              <Audio
                src={staticFile(event.author === "me" ? sounds.outgoing : sounds.incoming)}
                volume={sounds.messageVolume}
              />
            </Sequence>
            {event.typingFrames >= 12 ? (
              <Sequence from={event.typingStartFrame}>
                <Audio
                  src={staticFile(sounds.typing)}
                  volume={event.author === "them" ? sounds.typingVolumeThem : sounds.typingVolumeMe}
                />
              </Sequence>
            ) : null}
          </React.Fragment>
        ))}
      </AbsoluteFill>
    </ChatThemeProvider>
  );
};
