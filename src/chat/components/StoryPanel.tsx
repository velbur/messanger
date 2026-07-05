import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import type {StorySceneAnimation} from "../story";
import type {StoryColorFilter} from "../story-color-filter";
import {storyColorFilterCss} from "../story-color-filter";
import {StorySceneImage} from "./StorySceneImage";
import {STORY_SPLIT_TIMELINE_REV, type StorySceneLayer} from "../timeline";

void STORY_SPLIT_TIMELINE_REV;

type Props = {
  layers: StorySceneLayer[];
  transitionFlash?: number;
  colorFilter?: StoryColorFilter;
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

  const filters: string[] = [];
  if (layer.blurPx > 0) {
    filters.push(`blur(${layer.blurPx}px)`);
  }

  return {
    opacity: layer.opacity,
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    filter: filters.length > 0 ? filters.join(" ") : undefined,
    willChange:
      transforms.length > 0 || filters.length > 0 ? "transform, opacity, filter" : undefined,
  };
};

export const StoryPanel: React.FC<Props> = ({
  layers,
  transitionFlash = 0,
  colorFilter = "none",
  height,
  animation,
  motionLoopSec = 3,
}) => {
  const frame = useCurrentFrame();
  const colorFilterCss = storyColorFilterCss(colorFilter);

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: colorFilterCss,
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
      </div>
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
