import React from "react";
import {Composition} from "remotion";
import {ChatVideo} from "./chat/ChatVideo";
import {PHOTO_THUMBNAIL_MARKER, PhotoThumbnail} from "./chat/PhotoThumbnail";
import {PreviewCoverArt, PREVIEW_COVER_ART_MARKER} from "./chat/components/PreviewCoverArt";
import {StoryParallaxPreview, STORY_PARALLAX_PREVIEW_MARKER} from "./chat/StoryParallaxPreview";
import {
  StoryVideoParallaxPreview,
  STORY_VIDEO_PARALLAX_PREVIEW_MARKER,
} from "./chat/StoryVideoParallaxPreview";
import {parseConversation, type ConversationInput} from "./chat/schema";
import {FPS} from "./chat/fps";
import {buildTimeline} from "./chat/timeline";
import {normalizeVoicePlaybackRate} from "./chat/voiceover";
import {getCompositionDimensions} from "./chat/video";
import sample from "./default-conversation.json";

type ChatVideoProps = {
  conversation: ConversationInput;
  voicePlaybackRate?: number;
};

type PhotoThumbnailProps = {
  image: string;
};

type PreviewCoverProps = {
  image: string;
  title: string;
};

void PHOTO_THUMBNAIL_MARKER;
void PREVIEW_COVER_ART_MARKER;
void STORY_PARALLAX_PREVIEW_MARKER;
void STORY_VIDEO_PARALLAX_PREVIEW_MARKER;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChatVideo"
        component={ChatVideo as React.ComponentType<ChatVideoProps>}
        width={1080}
        height={1920}
        fps={FPS}
        defaultProps={{
          conversation: parseConversation(sample),
          voicePlaybackRate: 1,
        }}
        calculateMetadata={({props}) => {
          const conversation = parseConversation(props.conversation);
          const voicePlaybackRate = normalizeVoicePlaybackRate(props.voicePlaybackRate);
          const timeline = buildTimeline(conversation, {voicePlaybackRate});
          const {width, height} = getCompositionDimensions(conversation);
          return {
            durationInFrames: timeline.durationInFrames,
            width,
            height,
            props: {
              ...props,
              conversation,
              voicePlaybackRate,
            },
          };
        }}
      />
      <Composition
        id="PhotoThumbnail"
        component={PhotoThumbnail as React.ComponentType<PhotoThumbnailProps>}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{
          image: "images/msg-15.png",
        }}
      />
      <Composition
        id="PreviewCover"
        component={PreviewCoverArt as React.ComponentType<PreviewCoverProps>}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{
          image: "images/msg-15.png",
          title: "Заголовок ролика",
        }}
      />
      <Composition
        id="StoryParallaxPreview"
        component={StoryParallaxPreview}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={90}
        defaultProps={{
          image: "images/parallax-test/story-opening.png",
          animation: "depthParallax",
          durationFrames: 90,
        }}
      />
      <Composition
        id="StoryVideoParallaxPreview"
        component={StoryVideoParallaxPreview}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={300}
        defaultProps={{
          image: "images/video-parallax-test/story-opening.png",
          videoDurationMs: 4000,
          durationFrames: 300,
        }}
      />
    </>
  );
};
