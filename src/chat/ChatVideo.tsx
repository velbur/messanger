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
import {mergeConversationVoiceover} from "./voiceover";
import {
  buildTimeline,
  resolveStorySceneTiming,
  FULLSCREEN_TIMELINE_REV,
  getStatusBarTime,
  storyImageAtFrame,
  storyVideoAtFrame,
  storyVideoDurationMsAtFrame,
  STORY_SPLIT_TIMELINE_REV,
  TIMELINE_TAIL_MARKER,
  visibleMessageCountAtFrame,
} from "./timeline";
import {VIDEO_FEATURE_BUNDLE_MARKER} from "./timing";
import {getTheme, LAYOUT, SPLIT_LAYOUT, splitChatScale, CHAT_OVERLAY} from "./theme";
import {ChatThemeProvider} from "./ThemeContext";
import {ChatTypographyProvider} from "./TypographyContext";
import {ChatHeader} from "./components/ChatHeader";
import {InputBar} from "./components/InputBar";
import {FullscreenImage} from "./components/FullscreenImage";
import {HookOverlay} from "./components/HookOverlay";
import {MessageBubble} from "./components/MessageBubble";
import {StatusBar} from "./components/StatusBar";
import {StoryPanel} from "./components/StoryPanel";
import {StorySfxLayer} from "./components/StorySfxLayer";
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
  overlayChrome?: boolean;
  /** storyOverlay: только пузыри, без chrome */
  minimalOverlay?: boolean;
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
}) => {
  const eventsToShow = minimalOverlay
    ? visibleEvents.slice(-CHAT_OVERLAY.maxVisibleMessages)
    : visibleEvents;

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
          padding: `0 ${LAYOUT.chatPaddingRight}px ${LAYOUT.shortsSafeAreaBottom + 24}px ${LAYOUT.chatPaddingLeft}px`,
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
          {activeEvent?.author === "them" ? <TypingIndicator variant="overlay" /> : null}
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
        {activeEvent?.author === "them" ? <TypingIndicator /> : null}
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
  const frame = useCurrentFrame();
  const timeline = useMemo(() => buildTimeline(conversation), [conversation]);
  const sounds = useMemo(() => mergeConversationSounds(conversation), [conversation]);
  const music = useMemo(() => mergeConversationMusic(conversation), [conversation]);
  const voiceover = useMemo(() => mergeConversationVoiceover(conversation), [conversation]);
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

  const storyVisualActive = story.enabled && !inTitleCard && !inOutro;
  const storyOverlayMode = story.presentation === "overlay";

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
    () =>
      voiceover.enabled
        ? timeline.events
            .filter((event) => event.voiceAudio && event.voiceDurationFrames > 0)
            .map((event) => ({
              start: event.revealFrame,
              end: event.revealFrame + event.voiceDurationFrames,
            }))
        : [],
    [timeline.events, voiceover.enabled],
  );

  const isVoiceActiveAtFrame = (f: number): boolean =>
    voiceFrameRanges.some((range) => f >= range.start && f < range.end);

  const storySfxActiveAtFrame = (f: number): boolean => {
    if (!story.enabled || !story.sfxEnabled) {
      return false;
    }
    if (
      f >= story.openingStartFrame &&
      f < story.openingSfxEndFrame &&
      story.openingSfx.length > 0
    ) {
      return true;
    }
    const scene = story.sceneEvents.find((event) => f >= event.startFrame && f < event.endFrame);
    return Boolean(scene?.sfx.length);
  };

  const storyAmbienceAtFrame = (f: number): boolean => {
    if (!story.enabled || !story.sfxEnabled) {
      return false;
    }
    const inOpening =
      f >= story.openingStartFrame && f < story.openingSfxEndFrame;
    if (inOpening && story.openingSfx.some((cue) => cue.loop)) {
      return true;
    }
    const scene = story.sceneEvents.find((event) => f >= event.startFrame && f < event.endFrame);
    return Boolean(scene?.sfx.some((cue) => cue.loop));
  };

  const musicVolumeAtFrame = (f: number): number => {
    if (!music.enabled) {
      return 0;
    }
    let volume = music.volume;
    if (voiceover.enabled && isVoiceActiveAtFrame(f)) {
      volume *= voiceover.musicDuck;
    }
    if (storySfxActiveAtFrame(f)) {
      volume *= 0.55;
    } else if (storyAmbienceAtFrame(f)) {
      volume *= 0.75;
    }
    return volume;
  };

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
      opacity={storyOverlayMode ? chatDim : inTitleCard ? 0 : chatDim}
      overlayChrome={storyOverlayMode}
      minimalOverlay={storyOverlayMode}
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

  const currentStoryImage = storyVisualActive ? storyImageAtFrame(story, frame) : undefined;
  const currentStoryVideo = storyVisualActive ? storyVideoAtFrame(story, frame) : undefined;
  const currentStoryVideoDurationMs = storyVisualActive
    ? storyVideoDurationMsAtFrame(story, frame)
    : undefined;
  const {startFrame: sceneStartFrame, endFrame: sceneEndFrame} = storyVisualActive
    ? resolveStorySceneTiming(story, frame, timeline.outroStartFrame)
    : {startFrame: 0, endFrame: timeline.outroStartFrame};
  const sceneLocalFrame = Math.max(0, frame - sceneStartFrame);
  const sceneDurationFrames = Math.max(1, sceneEndFrame - sceneStartFrame);

  const showHook =
    conversation.hookText?.trim() &&
    !inTitleCard &&
    !storyOverlayMode &&
    (!story.enabled || frame >= story.openingStartFrame);

  return (
    <ChatThemeProvider mode={conversation.wallpaper}>
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
                image={currentStoryImage}
                video={currentStoryVideo}
                videoDurationMs={currentStoryVideoDurationMs}
                height={storyPanelHeight}
                animation={story.openingAnimation}
                sceneStartFrame={sceneStartFrame}
                sceneLocalFrame={sceneLocalFrame}
                sceneDurationFrames={sceneDurationFrames}
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
                image={currentStoryImage}
                video={currentStoryVideo}
                videoDurationMs={currentStoryVideoDurationMs}
                height={storyPanelHeight}
                animation={story.openingAnimation}
                sceneStartFrame={sceneStartFrame}
                sceneLocalFrame={sceneLocalFrame}
                sceneDurationFrames={sceneDurationFrames}
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

        {music.enabled ? (
          <Audio src={staticFile(music.src)} volume={musicVolumeAtFrame} loop />
        ) : null}

        {story.enabled && story.sfxEnabled && story.sfxMixSrc ? (
          <Audio src={staticFile(story.sfxMixSrc)} volume={0.8} />
        ) : null}

        {story.enabled && story.sfxEnabled && !story.sfxMixSrc && story.openingSfx.length > 0 ? (
          <StorySfxLayer
            keyPrefix="opening-sfx"
            cues={story.openingSfx}
            startFrame={story.openingStartFrame}
            endFrame={story.openingSfxEndFrame}
            masterVolume={story.sfxMasterVolume}
          />
        ) : null}

        {story.enabled && story.sfxEnabled && !story.sfxMixSrc
          ? story.sceneEvents.map((scene) =>
              scene.sfx.length > 0 ? (
                <StorySfxLayer
                  key={`scene-sfx-${scene.messageIndex}`}
                  keyPrefix={`scene-sfx-${scene.messageIndex}`}
                  cues={scene.sfx}
                  startFrame={scene.startFrame}
                  endFrame={scene.endFrame}
                  masterVolume={story.sfxMasterVolume}
                />
              ) : null,
            )
          : null}

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
            {event.voiceAudio && event.voiceDurationFrames > 0 ? (
              <Sequence from={event.revealFrame} durationInFrames={event.voiceDurationFrames}>
                <Audio src={staticFile(event.voiceAudio)} volume={voiceover.volume} />
              </Sequence>
            ) : null}
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
      </ChatTypographyProvider>
    </ChatThemeProvider>
  );
};
