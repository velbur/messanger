import React from "react";
import {Composition} from "remotion";
import {ChatVideo} from "./chat/ChatVideo";
import {PHOTO_THUMBNAIL_MARKER, PhotoThumbnail} from "./chat/PhotoThumbnail";
import {PreviewCoverArt, PREVIEW_COVER_ART_MARKER} from "./chat/components/PreviewCoverArt";
import {StoryParallaxPreview, STORY_PARALLAX_PREVIEW_MARKER} from "./chat/StoryParallaxPreview";
import {parseConversation, type ConversationInput} from "./chat/schema";
import {FPS} from "./chat/fps";
import {storyMotionLoopFrames} from "./chat/story-motion";
import {buildTimeline} from "./chat/timeline";
import sample from "./default-conversation.json";

type ChatVideoProps = {
  conversation: ConversationInput;
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
        }}
        calculateMetadata={({props}) => {
          const conversation = parseConversation(props.conversation);
          const timeline = buildTimeline(conversation);
          return {
            durationInFrames: timeline.durationInFrames,
            props: {
              ...props,
              conversation,
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
        durationInFrames={storyMotionLoopFrames(3)}
        defaultProps={{
          image: "images/parallax-test/story-opening.png",
          animation: "depthParallax",
          motionLoopSec: 3,
        }}
      />
    </>
  );
};
