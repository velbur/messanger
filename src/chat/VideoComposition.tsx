import React, {useMemo} from "react";
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import type {ConversationInput} from "./schema";
import {CHAT_FONT_FAMILY} from "./fonts";
import {SubscribeOutro} from "./components/SubscribeOutro";
import {TitleCard} from "./components/TitleCard";
import {PreviewCover} from "./components/PreviewCover";
import {NarrationBeat} from "./components/NarrationBeat";
import {VideoHorizontalChat} from "./components/VideoHorizontalChat";
import {mergePreviewCover} from "./preview-cover";
import {mergeConversationOutro} from "./outro";
import {getMessengerLocale} from "./locale";
import {mergeEndCard, mergeIntro} from "./title-card";
import {mergeConversationMusic} from "./music";
import {mergeConversationSounds} from "./sounds";
import {buildVoiceFrameRanges, createMusicVolumeAtFrame, mergeConversationVoiceover, normalizeVoicePlaybackRate} from "./voiceover";
import {
  buildTimeline,
  getStatusBarTime,
} from "./timeline";
import {getTheme, videoChatTypographyScale} from "./theme";
import {ChatThemeProvider} from "./ThemeContext";
import {ChatTypographyProvider} from "./TypographyContext";
import {isVideoChatMode, isVideoNarrationMode, mergeVideoConfig, VIDEO_LAYOUT_BUNDLE_MARKER} from "./video";

type Props = {
  conversation: ConversationInput;
  voicePlaybackRate?: number;
};

void VIDEO_LAYOUT_BUNDLE_MARKER;

const NARRATION_BG =
  "radial-gradient(ellipse 120% 90% at 50% 42%, #1a2433 0%, #0c1018 55%, #06080c 100%)";

export const VideoComposition: React.FC<Props> = ({conversation, voicePlaybackRate}) => {
  const frame = useCurrentFrame();
  const timeline = useMemo(
    () => buildTimeline(conversation, {voicePlaybackRate: normalizeVoicePlaybackRate(voicePlaybackRate)}),
    [conversation, voicePlaybackRate],
  );
  const sounds = useMemo(() => mergeConversationSounds(conversation), [conversation]);
  const music = useMemo(() => mergeConversationMusic(conversation), [conversation]);
  const voiceover = useMemo(() => mergeConversationVoiceover(conversation), [conversation]);
  const outro = useMemo(() => mergeConversationOutro(conversation), [conversation]);
  const messengerLocale = useMemo(() => getMessengerLocale(conversation), [conversation]);
  const intro = useMemo(() => mergeIntro(conversation), [conversation]);
  const endCard = useMemo(() => mergeEndCard(conversation), [conversation]);
  const previewCover = useMemo(() => mergePreviewCover(conversation), [conversation]);
  const videoConfig = useMemo(() => mergeVideoConfig(conversation), [conversation]);

  const inIntro = intro.enabled && frame < timeline.introDurationFrames;
  const inEndCard =
    endCard.enabled &&
    frame >= timeline.endCardStartFrame &&
    frame < timeline.outroStartFrame;
  const inTitleCard = inIntro || inEndCard;
  const inOutro = !inTitleCard && outro.enabled && frame >= timeline.outroStartFrame;

  const themeMode = isVideoNarrationMode(conversation) ? "dark" : conversation.wallpaper;
  const theme = getTheme(themeMode);

  const outroDim = inOutro
    ? interpolate(
        frame,
        [timeline.outroStartFrame, timeline.outroStartFrame + 20],
        [1, 0.22],
        {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
      )
    : 1;

  const contentDim = inTitleCard ? 0 : outroDim;

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

  const visibleEvents = timeline.events.filter(
    (event) => frame >= event.revealFrame && event.display !== "scene",
  );
  const visibleCount = visibleEvents.length;
  const lastEventIndex = timeline.events.length - 1;
  const latestEvent = visibleEvents[visibleEvents.length - 1];

  const isThemTyping = activeEvent?.author === "them";
  const headerStatus = isThemTyping
    ? messengerLocale.contactStatusTyping
    : messengerLocale.contactStatus;
  const statusBarTime = getStatusBarTime(timeline.events, visibleCount, activeEvent);

  const speakerLabel = (author: "me" | "them"): string => {
    if (author === "me") {
      return conversation.myName?.trim() || "Я";
    }
    return conversation.contactName?.trim() || "";
  };

  return (
    <ChatThemeProvider mode={themeMode}>
      <ChatTypographyProvider
        conversation={conversation}
        layoutScale={isVideoChatMode(conversation) ? videoChatTypographyScale : 1}
      >
        <AbsoluteFill
          style={{
            fontFamily: CHAT_FONT_FAMILY,
            display: "flex",
            flexDirection: "column",
            backgroundColor: isVideoNarrationMode(conversation) ? "#06080c" : theme.statusBarBg,
            background: isVideoNarrationMode(conversation) ? NARRATION_BG : undefined,
          }}
        >
          <div style={{flex: 1, minHeight: 0, display: "flex", flexDirection: "column", opacity: contentDim}}>
            {isVideoNarrationMode(conversation) ? (
              latestEvent ? (
                <NarrationBeat
                  key={latestEvent.index}
                  text={latestEvent.text}
                  author={latestEvent.author}
                  speakerLabel={
                    videoConfig.textMode === "narration" && visibleEvents.length > 1
                      ? speakerLabel(latestEvent.author)
                      : ""
                  }
                  revealFrame={latestEvent.revealFrame}
                  emphasizeFinale={latestEvent.index === lastEventIndex}
                />
              ) : null
            ) : (
              <VideoHorizontalChat
                conversation={conversation}
                visibleEvents={visibleEvents}
                activeEvent={activeEvent}
                lastEventIndex={lastEventIndex}
                headerStatus={headerStatus}
                statusBarTime={statusBarTime}
              />
            )}
          </div>

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

          {timeline.events.map((event) => (
            event.display === "scene" ? null : (
            <React.Fragment key={`sound-${event.index}`}>
              <Sequence from={event.revealFrame}>
                <Audio
                  src={staticFile(event.author === "me" ? sounds.outgoing : sounds.incoming)}
                  volume={sounds.messageVolume}
                />
              </Sequence>
              {event.voiceAudio && event.voiceDurationFrames > 0 ? (
                <Sequence from={event.revealFrame} durationInFrames={event.voiceDurationFrames}>
                  <Audio
                    src={staticFile(event.voiceAudio)}
                    volume={voiceover.volume}
                    playbackRate={event.voicePlaybackRate ?? 1}
                  />
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
            )
          ))}
        </AbsoluteFill>
      </ChatTypographyProvider>
    </ChatThemeProvider>
  );
};
