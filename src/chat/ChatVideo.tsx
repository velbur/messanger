import React, {useMemo} from "react";
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import type {ConversationInput} from "./schema";
import {CHAT_FONT_FAMILY} from "./fonts";
import {SubscribeOutro} from "./components/SubscribeOutro";
import {TitleCard} from "./components/TitleCard";
import {mergeConversationOutro} from "./outro";
import {getMessengerLocale} from "./locale";
import {mergeEndCard, mergeIntro} from "./title-card";
import {mergeConversationMusic} from "./music";
import {mergeConversationSounds} from "./sounds";
import {
  activeStorySceneAtFrame,
  buildTimeline,
  FULLSCREEN_TIMELINE_REV,
  getStatusBarTime,
  storyImageAtFrame,
  STORY_SPLIT_TIMELINE_REV,
  TIMELINE_TAIL_MARKER,
  visibleMessageCountAtFrame,
} from "./timeline";
import {VIDEO_FEATURE_BUNDLE_MARKER} from "./timing";
import {getTheme, LAYOUT, SPLIT_LAYOUT, splitChatScale} from "./theme";
import {ChatThemeProvider} from "./ThemeContext";
import {ChatHeader} from "./components/ChatHeader";
import {InputBar} from "./components/InputBar";
import {FullscreenImage} from "./components/FullscreenImage";
import {HookOverlay} from "./components/HookOverlay";
import {MessageBubble} from "./components/MessageBubble";
import {StatusBar} from "./components/StatusBar";
import {StoryPanel} from "./components/StoryPanel";
import {TypingIndicator} from "./components/TypingIndicator";
import {Wallpaper} from "./components/Wallpaper";

type Props = {
  conversation: ConversationInput;
};

void VIDEO_FEATURE_BUNDLE_MARKER;
void TIMELINE_TAIL_MARKER;
void STORY_SPLIT_TIMELINE_REV;

type ChatBodyProps = {
  conversation: ConversationInput;
  visibleEvents: ReturnType<typeof buildTimeline>["events"];
  activeEvent: ReturnType<typeof buildTimeline>["events"][number] | undefined;
  lastEventIndex: number;
  headerStatus: string;
  statusBarTime: string;
  messengerLocale: ReturnType<typeof getMessengerLocale>;
  theme: ReturnType<typeof getTheme>;
  opacity: number;
};

const ChatBody: React.FC<ChatBodyProps> = ({
  conversation,
  visibleEvents,
  activeEvent,
  lastEventIndex,
  headerStatus,
  statusBarTime,
  messengerLocale,
  theme,
  opacity,
}) => (
  <div
    style={{
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      width: "100%",
      opacity,
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
        paddingBottom: LAYOUT.shortsSafeAreaBottom,
      }}
    >
      <InputBar placeholder={messengerLocale.inputPlaceholder} />
    </div>
  </div>
);

export const ChatVideo: React.FC<Props> = ({conversation}) => {
  const frame = useCurrentFrame();
  const timeline = useMemo(() => buildTimeline(conversation), [conversation]);
  const sounds = useMemo(() => mergeConversationSounds(conversation), [conversation]);
  const music = useMemo(() => mergeConversationMusic(conversation), [conversation]);
  const outro = useMemo(() => mergeConversationOutro(conversation), [conversation]);
  const messengerLocale = useMemo(() => getMessengerLocale(conversation), [conversation]);
  const intro = useMemo(() => mergeIntro(conversation), [conversation]);
  const endCard = useMemo(() => mergeEndCard(conversation), [conversation]);
  const theme = getTheme(conversation.wallpaper);
  const story = timeline.story;

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
    story,
  );
  const visibleEvents = timeline.events.slice(0, visibleCount);
  const lastEventIndex = timeline.events.length - 1;

  const isThemTyping = activeEvent?.author === "them";
  const headerStatus = isThemTyping
    ? messengerLocale.contactStatusTyping
    : messengerLocale.contactStatus;

  const statusBarTime = getStatusBarTime(timeline.events, visibleCount, activeEvent);

  const chatBody = (
    <ChatBody
      conversation={conversation}
      visibleEvents={visibleEvents}
      activeEvent={activeEvent}
      lastEventIndex={lastEventIndex}
      headerStatus={headerStatus}
      statusBarTime={statusBarTime}
      messengerLocale={messengerLocale}
      theme={theme}
      opacity={inTitleCard ? 0 : chatDim}
    />
  );

  const storySplitActive = story.enabled && !inTitleCard && !inOutro;
  const targetTopH = Math.round(story.topPanelRatio * SPLIT_LAYOUT.frameHeight);
  const storyPanelHeight = storySplitActive
    ? interpolate(
        frame,
        [story.openingStartFrame, story.splitStartFrame, story.splitCompleteFrame],
        [SPLIT_LAYOUT.frameHeight, SPLIT_LAYOUT.frameHeight, targetTopH],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        },
      )
    : 0;
  const bottomPanelHeight = storySplitActive
    ? Math.max(0, SPLIT_LAYOUT.frameHeight - storyPanelHeight)
    : 0;
  const chatScale = splitChatScale(bottomPanelHeight);

  const currentStoryImage = storySplitActive ? storyImageAtFrame(story, frame) : undefined;
  const previousStoryImage =
    storySplitActive && frame > 0 ? storyImageAtFrame(story, frame - 1) : undefined;
  const activeScene = storySplitActive ? activeStorySceneAtFrame(story, frame) : undefined;
  const sceneStartFrame =
    frame < story.splitCompleteFrame
      ? story.openingStartFrame
      : (activeScene?.startFrame ?? story.splitCompleteFrame);
  const sceneEndFrame =
    frame < story.splitCompleteFrame
      ? story.splitCompleteFrame
      : (activeScene?.endFrame ?? timeline.outroStartFrame);
  const sceneLocalFrame = Math.max(0, frame - sceneStartFrame);
  const sceneDurationFrames = Math.max(1, sceneEndFrame - sceneStartFrame);

  const showHook =
    conversation.hookText?.trim() &&
    !inTitleCard &&
    (!story.enabled || frame >= story.openingStartFrame);

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
        {storySplitActive ? (
          <>
            <StoryPanel
              image={currentStoryImage}
              previousImage={previousStoryImage}
              height={storyPanelHeight}
              animation={story.openingAnimation}
              sceneLocalFrame={sceneLocalFrame}
              sceneDurationFrames={sceneDurationFrames}
              crossfadeFrames={SPLIT_LAYOUT.crossfadeFrames}
              depthParallax={story.depthParallax}
            />
            <div
              style={{
                position: "relative",
                height: bottomPanelHeight,
                overflow: "hidden",
                flexShrink: 0,
                opacity: interpolate(
                  frame,
                  [story.splitStartFrame, story.splitCompleteFrame],
                  [0, 1],
                  {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
                ),
              }}
            >
              <Wallpaper />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  width: SPLIT_LAYOUT.frameWidth / chatScale,
                  height: SPLIT_LAYOUT.frameHeight,
                  transform: `translateX(-50%) scale(${chatScale})`,
                  transformOrigin: "top center",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {chatBody}
              </div>
            </div>
          </>
        ) : (
          <>
            <Wallpaper />
            {chatBody}
          </>
        )}

        {showHook ? <HookOverlay text={conversation.hookText ?? ""} /> : null}

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
