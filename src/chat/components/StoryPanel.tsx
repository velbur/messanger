import React from "react";
import {AbsoluteFill} from "remotion";
import type {StorySceneAnimation} from "../story";
import {StorySceneImage} from "./StorySceneImage";
import {STORY_SPLIT_TIMELINE_REV} from "../timeline";

void STORY_SPLIT_TIMELINE_REV;

type Props = {
  image: string | undefined;
  video?: string;
  videoDurationMs?: number;
  height: number;
  animation: StorySceneAnimation;
  sceneStartFrame: number;
  sceneLocalFrame: number;
  sceneDurationFrames: number;
};

export const StoryPanel: React.FC<Props> = ({
  image,
  video,
  videoDurationMs,
  height,
  animation,
  sceneStartFrame,
  sceneLocalFrame,
  sceneDurationFrames,
}) => {
  if (!image && !video) {
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
      <AbsoluteFill>
        <StorySceneImage
          image={image}
          video={video}
          videoDurationMs={videoDurationMs}
          localFrame={sceneLocalFrame}
          durationFrames={sceneDurationFrames}
          sceneStartFrame={sceneStartFrame}
          animation={animation}
        />
      </AbsoluteFill>
    </div>
  );
};
