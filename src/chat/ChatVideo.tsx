import React, {useMemo} from "react";
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import type {ConversationInput} from "./schema";
import {CHAT_FONT_FAMILY} from "./fonts";
import {SubscribeOutro} from "./components/SubscribeOutro";
import {TitleCard} from "./components/TitleCard";
import {PreviewCover} from "./components/PreviewCover";
import {mergePreviewCover} from "./preview-cover";
import {mergeConversationOutro} from "./outro";
import {getMessengerLocale} from "./locale";
import {mergeEndCard, mergeIntro} from "./title-card";
import {mergeConversationMusic} from "./music";
import {mergeConversationSounds} from "./sounds";
import {buildVoiceFrameRanges, createMusicVolumeAtFrame, mergeConversationVoiceover} from "./voiceover";
import {
  buildTimeline,
  resolveStorySceneLayers,
  FULLSCREEN_TIMELINE_REV,
  getStatusBarTime,
  STORY_SPLIT_TIMELINE_REV,
  TIMELINE_TAIL_MARKER,
  visibleMessageCountAtFrame,
} from "./timeline";
import {VIDEO_FEATURE_BUNDLE_MARKER} from "./timing";
import {getTheme, LAYOUT, SPLIT_LAYOUT, splitChatScale, CHAT_OVERLAY, CHAT_OVERLAY_BUNDLE_MARKER, STORY_OVERLAY_THEME_MODE, CENTER_SCREEN, CENTER_SCREEN_BUNDLE_MARKER} from "./theme";
import {CenterScreenMessage} from "./components/CenterScreenMessage";
import {ChatThemeProvider} from "./ThemeContext";
import {ChatTypographyProvider} from "./TypographyContext";
import {ChatHeader} from "./components/ChatHeader";
import {InputBar} from "./components/InputBar";
import {FullscreenImage} from "./components/FullscreenImage";
import {HookOverlay} from "./components/HookOverlay";
import {MessageBubble} from "./components/MessageBubble";
import {StatusBar} from "./components/StatusBar";
import {StoryPanel} from "./components/StoryPanel";
import {TypingIndicator} from "./components/TypingIndicator";
import {Wallpaper} from "./components/Wallpaper";
import {VideoComposition} from "./VideoComposition";
import {isVideoLayout} from "./video";

type Props = {
  conversation: ConversationInput;
};

void VIDEO_FEATURE_BUNDLE_MARKER;
void TIMELINE_TAIL_MARKER;
void STORY_SPLIT_TIMELINE_REV;
void CHAT_OVERLAY_BUNDLE_MARKER;
void CENTER_SCREEN_BUNDLE_MARKER;

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
  overlayChrome?: boolean;
  /** storyOverlay: только пузыри, без chrome */
  minimalOverlay?: boolean;
  /** Не показывать реплики с display=center (они идут отдельным оверлеем) */
  bubbleEventsOnly?: boolean;
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
  overlayChrome = false,
  minimalOverlay = false,
  bubbleEventsOnly = false,
}) => {
  const bubbleEvents = bubbleEventsOnly
    ? visibleEvents.filter((event) => event.display === "bubble")
    : visibleEvents;
  const eventsToShow = minimalOverlay
    ? bubbleEvents.slice(-CHAT_OVERLAY.maxVisibleMessages)
    : bubbleEvents;

  if (minimalOverlay) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          opacity,
          padding: `0 ${LAYOUT.chatPaddingRight}px ${LAYOUT.shortsSafeAreaBottom + 24 + CHAT_OVERLAY.stackLiftPx}px ${LAYOUT.chatPaddingLeft}px`,
        }}
      >
        <div style={{display: "flex", flexDirection: "column", width: "100%"}}>
          {eventsToShow.map((event) => (
            <MessageBubble
              key={event.index}
              author={event.author}
              text={event.text}
              image={event.image}
              sentAt={event.sentAt}
              revealFrame={event.revealFrame}
              emphasizeFinale={event.index === lastEventIndex}
              variant="overlay"
            />
          ))}
          {activeEvent?.author === "them" &&
          !(bubbleEventsOnly && activeEvent.display !== "bubble") ? (
            <TypingIndicator variant="overlay" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
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
    <StatusBar time={statusBarTime} overlayChrome={overlayChrome} />
    <ChatHeader
      contactName={conversation.contactName}
      contactStatus={headerStatus}
      contactAvatar={conversation.contactAvatar}
      overlayChrome={overlayChrome}
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
        {activeEvent?.author === "them" &&
        !(bubbleEventsOnly && activeEvent.display !== "bubble") ? (
          <TypingIndicator />
        ) : null}
      </div>
    </div>

    <div
      style={{
        flexShrink: 0,
        background: overlayChrome ? "transparent" : theme.inputBarBg,
        paddingLeft: LAYOUT.chatPaddingLeft,
        paddingRight: LAYOUT.chatPaddingRight,
        paddingBottom: LAYOUT.shortsSafeAreaBottom,
      }}
    >
      <InputBar placeholder={messengerLocale.inputPlaceholder} overlayChrome={overlayChrome} />
    </div>
  </div>
  );
};

export const ChatVideo: React.FC<Props> = ({conversation}) => {
  if (isVideoLayout(conversation)) {
    return <VideoComposition conversation={conversation} />;
  }
  return <VerticalChatVideo conversation={conversation} />;
};

const VerticalChatVideo: React.FC<Props> = ({conversation}) => {
  const frame = useCurrentFrame();
  const timeline = useMemo(() => buildTimeline(conversation), [conversation]);
  const sounds = useMemo(() => mergeConversationSounds(conversation), [conversation]);
  const music = useMemo(() => mergeConversationMusic(conversation), [conversation]);
  const voiceover = useMemo(() => mergeConversationVoiceover(conversation), [conversation]);
  const outro = useMemo(() => mergeConversationOutro(conversation), [conversation]);
  const messengerLocale = useMemo(() => getMessengerLocale(conversation), [conversation]);
  const intro = useMemo(() => mergeIntro(conversation), [conversation]);
  const endCard = useMemo(() => mergeEndCard(conversation), [conversation]);
  const previewCover = useMemo(() => mergePreviewCover(conversation), [conversation]);
  const story = timeline.story;

  const inIntro = intro.enabled && frame < timeline.introDurationFrames;
  const inEndCard =
    endCard.enabled &&
    frame >= timeline.endCardStartFrame &&
    frame < timeline.outroStartFrame;
  const inTitleCard = inIntro || inEndCard;

  const inOutro = !inTitleCard && outro.enabled && frame >= timeline.outroStartFrame;

  const storyVisualActive = story.enabled && !inTitleCard && !inOutro;
  const storyOverlayMode = story.presentation === "overlay";
  const themeMode = storyOverlayMode ? STORY_OVERLAY_THEME_MODE : conversation.wallpaper;
  const theme = getTheme(themeMode);

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

  const voiceFrameRanges = useMemo(
    () => (voiceover.enabled ? buildVoiceFrameRanges(timeline.events) : []),
    [timeline.events, voiceover.enabled],
  );

  const musicVolumeAtFrame = useMemo(
    () => createMusicVolumeAtFrame(music, voiceover, voiceFrameRanges),
    [music, voiceover, voiceFrameRanges],
  );

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
  const centerScreenEvent = storyVisualActive
    ? [...visibleEvents].reverse().find((event) => event.display !== "bubble" && event.text.trim())
    : undefined;
  const bubbleEventsOnly = storyVisualActive;

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
      opacity={storyOverlayMode ? chatDim : inTitleCard ? 0 : chatDim}
      overlayChrome={storyOverlayMode}
      minimalOverlay={storyOverlayMode}
      bubbleEventsOnly={bubbleEventsOnly}
    />
  );

  const targetTopH = Math.round(story.topPanelRatio * SPLIT_LAYOUT.frameHeight);
  const storyPanelHeight = storyVisualActive
    ? storyOverlayMode
      ? SPLIT_LAYOUT.frameHeight
      : story.immediateFirstScene ||
          story.splitStartFrame >= story.splitCompleteFrame
        ? targetTopH
        : interpolate(
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
  const bottomPanelHeight = storyVisualActive && !storyOverlayMode
    ? Math.max(0, SPLIT_LAYOUT.frameHeight - storyPanelHeight)
    : 0;
  const chatScale = splitChatScale(bottomPanelHeight);
  const targetBottomPanelHeight = Math.round(
    (1 - story.topPanelRatio) * SPLIT_LAYOUT.frameHeight,
  );
  const typographyLayoutScale =
    storyVisualActive && !storyOverlayMode ? splitChatScale(targetBottomPanelHeight) : 1;
  const chatRevealOpacity = storyVisualActive
    ? story.splitStartFrame >= story.splitCompleteFrame
      ? frame >= story.splitCompleteFrame
        ? 1
        : 0
      : interpolate(
          frame,
          [story.splitStartFrame, story.splitCompleteFrame],
          [0, 1],
          {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
        )
    : 1;

  const storyLayersState = storyVisualActive
    ? resolveStorySceneLayers(story, frame, timeline.outroStartFrame)
    : {layers: [], flashOpacity: 0};
  const storyLayers = storyLayersState.layers;
  const storyTransitionFlash = storyLayersState.flashOpacity;

  const showHook =
    conversation.hookText?.trim() &&
    !inTitleCard &&
    !storyOverlayMode &&
    (!story.enabled || frame >= story.openingStartFrame);

  return (
    <ChatThemeProvider mode={themeMode}>
      <ChatTypographyProvider conversation={conversation} layoutScale={typographyLayoutScale}>
      <AbsoluteFill
        style={{
          fontFamily: CHAT_FONT_FAMILY,
          display: "flex",
          flexDirection: "column",
          backgroundColor: storyVisualActive ? "#000000" : theme.statusBarBg,
        }}
      >
        {storyVisualActive ? (
          storyOverlayMode ? (
            <>
              <StoryPanel
                layers={storyLayers}
                transitionFlash={storyTransitionFlash}
                height={storyPanelHeight}
                animation={story.openingAnimation}
                motionLoopSec={story.motionLoopSec}
              />
              <AbsoluteFill
                style={{
                  zIndex: 3,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  opacity: chatRevealOpacity,
                  pointerEvents: "none",
                }}
              >
                {chatBody}
              </AbsoluteFill>
            </>
          ) : (
            <>
              <StoryPanel
                layers={storyLayers}
                transitionFlash={storyTransitionFlash}
                height={storyPanelHeight}
                animation={story.openingAnimation}
                motionLoopSec={story.motionLoopSec}
              />
              <div
                style={{
                  position: "relative",
                  height: bottomPanelHeight,
                  overflow: "hidden",
                  flexShrink: 0,
                  opacity: chatRevealOpacity,
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
          )
        ) : (
          <>
            <Wallpaper />
            {chatBody}
          </>
        )}

        {showHook ? <HookOverlay text={conversation.hookText ?? ""} /> : null}

        {centerScreenEvent ? (
          <AbsoluteFill
            style={{
              zIndex: 4,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: Math.round(SPLIT_LAYOUT.frameHeight * CENTER_SCREEN.topRatio),
              pointerEvents: "none",
              opacity: chatRevealOpacity,
            }}
          >
            <CenterScreenMessage
              text={centerScreenEvent.text}
              revealFrame={centerScreenEvent.revealFrame}
              voiceDurationFrames={centerScreenEvent.voiceDurationFrames}
              emphasizeFinale={centerScreenEvent.index === lastEventIndex}
            />
          </AbsoluteFill>
        ) : null}

        {music.enabled ? (
          <Sequence from={0} layout="none">
            <Audio src={staticFile(music.src)} volume={musicVolumeAtFrame} loop />
          </Sequence>
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

        {previewCover.enabled ? (
          <PreviewCover
            image={previewCover.image}
            startFrame={timeline.previewCoverStartFrame}
            durationFrames={timeline.previewCoverDurationFrames}
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
            {event.display === "bubble" ? (
              <Sequence from={event.revealFrame}>
                <Audio
                  src={staticFile(event.author === "me" ? sounds.outgoing : sounds.incoming)}
                  volume={sounds.messageVolume}
                />
              </Sequence>
            ) : null}
            {event.voiceAudio && event.voiceDurationFrames > 0 ? (
              <Sequence from={event.revealFrame} durationInFrames={event.voiceDurationFrames}>
                <Audio src={staticFile(event.voiceAudio)} volume={voiceover.volume} />
              </Sequence>
            ) : null}
            {event.display === "bubble" && event.typingFrames >= 12 ? (
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
      </ChatTypographyProvider>
    </ChatThemeProvider>
  );
};
