import React from "react";
import {AbsoluteFill, interpolate} from "remotion";
import type {StorySceneAnimation} from "../story";
import {StorySceneImage} from "./StorySceneImage";
import {STORY_SPLIT_TIMELINE_REV} from "../timeline";

void STORY_SPLIT_TIMELINE_REV;

type Props = {
  image: string | undefined;
  video?: string;
  videoDurationMs?: number;
  previousImage?: string;
  previousVideo?: string;
  previousVideoDurationMs?: number;
  height: number;
  animation: StorySceneAnimation;
  sceneLocalFrame: number;
  sceneDurationFrames: number;
  crossfadeFrames?: number;
};

export const StoryPanel: React.FC<Props> = ({
  image,
  video,
  videoDurationMs,
  previousImage,
  previousVideo,
  previousVideoDurationMs,
  height,
  animation,
  sceneLocalFrame,
  sceneDurationFrames,
  crossfadeFrames = 12,
}) => {
  const fade = Math.min(crossfadeFrames, Math.max(4, Math.floor(sceneDurationFrames * 0.08)));
  const isCrossfade =
    Boolean(
      (previousVideo || previousImage) &&
        (previousVideo || previousImage) !== (video || image) &&
        sceneLocalFrame < fade,
    );
  const previousOpacity = isCrossfade
    ? interpolate(sceneLocalFrame, [0, fade], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const currentOpacity = isCrossfade
    ? interpolate(sceneLocalFrame, [0, fade], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  if (!image && !video && !previousImage && !previousVideo) {
    return (
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: "#000000",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        backgroundColor: "#000000",
        flexShrink: 0,
      }}
    >
      {(previousImage || previousVideo) && previousOpacity > 0 ? (
        <AbsoluteFill style={{opacity: previousOpacity}}>
          <StorySceneImage
            image={previousImage}
            video={previousVideo}
            videoDurationMs={previousVideoDurationMs}
            localFrame={sceneLocalFrame}
            durationFrames={sceneDurationFrames}
            animation={animation}
          />
        </AbsoluteFill>
      ) : null}
      {image || video ? (
        <AbsoluteFill style={{opacity: currentOpacity}}>
          <StorySceneImage
            image={image}
            video={video}
            videoDurationMs={videoDurationMs}
            localFrame={sceneLocalFrame}
            durationFrames={sceneDurationFrames}
            animation={animation}
          />
        </AbsoluteFill>
      ) : null}
    </div>
  );
};
