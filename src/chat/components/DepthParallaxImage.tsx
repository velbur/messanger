import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {motionVectors, sceneMotionProgress} from "../story-motion";
import type {StoryDepthLayerPaths} from "../story-depth-paths";

type Props = {
  /** Полный исходный кадр — всегда внизу, без дыр */
  image: string;
  layers: StoryDepthLayerPaths;
  localFrame: number;
  durationFrames: number;
  directionSeed?: string;
};

const BASE_MOTION = 0.35;
const MID_MOTION = 1;
const NEAR_MOTION = 1.75;

export const DepthParallaxImage: React.FC<Props> = ({
  image,
  layers,
  localFrame,
  durationFrames,
  directionSeed = image,
}) => {
  const progress = sceneMotionProgress(localFrame, durationFrames);
  const {panX, panY} = motionVectors(directionSeed);

  const layerStyle = (motionScale: number, zIndex: number) => {
    const translateX = panX * progress * 4 * motionScale;
    const translateY = panY * progress * 3 * motionScale;
    const scale = 1.06 + progress * 0.04 * motionScale;

    return {
      position: "absolute" as const,
      inset: 0,
      zIndex,
      transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
      transformOrigin: "center center",
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    };
  };

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#0a0a0a"}}>
      <Img src={staticFile(image)} style={layerStyle(BASE_MOTION, 1)} />
      <Img src={staticFile(layers.mid)} style={layerStyle(MID_MOTION, 2)} />
      <Img src={staticFile(layers.near)} style={layerStyle(NEAR_MOTION, 3)} />
    </AbsoluteFill>
  );
};
