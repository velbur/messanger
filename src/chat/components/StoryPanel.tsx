import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import type {StorySceneAnimation} from "../story";
import {StorySceneImage} from "./StorySceneImage";
import {STORY_SPLIT_TIMELINE_REV, type StorySceneLayer} from "../timeline";

void STORY_SPLIT_TIMELINE_REV;

type Props = {
  layers: StorySceneLayer[];
  transitionFlash?: number;
  height: number;
  animation: StorySceneAnimation;
  motionLoopSec?: number;
};

const layerTransform = (layer: StorySceneLayer): React.CSSProperties => {
  const transforms: string[] = [];
  if (layer.scale !== 1) {
    transforms.push(`scale(${layer.scale})`);
  }
  if (layer.translateXPercent !== 0 || layer.translateYPercent !== 0) {
    transforms.push(
      `translate(${layer.translateXPercent}%, ${layer.translateYPercent}%)`,
    );
  }
  return {
    opacity: layer.opacity,
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    filter: layer.blurPx > 0 ? `blur(${layer.blurPx}px)` : undefined,
    willChange: transforms.length > 0 || layer.blurPx > 0 ? "transform, opacity, filter" : undefined,
  };
};

export const StoryPanel: React.FC<Props> = ({
  layers,
  transitionFlash = 0,
  height,
  animation,
  motionLoopSec = 3,
}) => {
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
          <AbsoluteFill key={layer.key} style={layerTransform(layer)}>
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
      {transitionFlash > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            backgroundColor: "#ffffff",
            opacity: transitionFlash,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </div>
  );
};
