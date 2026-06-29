import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import type {StorySceneAnimation} from "../story";
import {StorySceneImage} from "./StorySceneImage";
import {STORY_SPLIT_TIMELINE_REV, type StorySceneLayer} from "../timeline";

void STORY_SPLIT_TIMELINE_REV;

type Props = {
  layers: StorySceneLayer[];
  height: number;
  animation: StorySceneAnimation;
  motionLoopSec?: number;
};

export const StoryPanel: React.FC<Props> = ({layers, height, animation, motionLoopSec = 3}) => {
  const frame = useCurrentFrame();

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
      {layers.map((layer) => {
        const localFrame = Math.max(0, frame - layer.sceneStartFrame);
        return (
          <AbsoluteFill key={layer.key} style={{opacity: layer.opacity}}>
            <StorySceneImage
              image={layer.image}
              video={layer.video}
              videoDurationMs={layer.videoDurationMs}
              videoLoop={layer.videoLoop}
              localFrame={localFrame}
              durationFrames={layer.sceneDurationFrames}
              sceneStartFrame={layer.sceneStartFrame}
              animation={animation}
              motionLoopSec={motionLoopSec}
            />
          </AbsoluteFill>
        );
      })}
    </div>
  );
};
