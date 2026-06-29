import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {depthParallaxLayerMotion, motionVectors, sceneMotionLoopProgress} from "../story-motion";
import type {StoryDepthLayerPaths} from "../story-depth-paths";

type Props = {
  layers: StoryDepthLayerPaths;
  localFrame: number;
  directionSeed?: string;
  loopFrames?: number;
};

const BANDS = [
  {band: "far" as const, src: (layers: StoryDepthLayerPaths) => layers.far, zIndex: 1},
  {band: "mid" as const, src: (layers: StoryDepthLayerPaths) => layers.mid, zIndex: 2},
  {band: "near" as const, src: (layers: StoryDepthLayerPaths) => layers.near, zIndex: 3},
];

/** Запас по краям при translate */
const OVERSCAN = 1.38;

/**
 * Настоящий 2.5D: три RGBA-слоя из depth map без дублирования полного кадра.
 * Дальний слой движется медленнее и в противоположную сторону от ближнего.
 */
export const DepthParallaxImage: React.FC<Props> = ({
  layers,
  localFrame,
  directionSeed = layers.far,
  loopFrames,
}) => {
  const progress = sceneMotionLoopProgress(localFrame, loopFrames);
  const {panX, panY} = motionVectors(directionSeed);

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#050505"}}>
      {BANDS.map(({band, src, zIndex}) => {
        const motion = depthParallaxLayerMotion(progress, panX, panY, band);
        return (
          <Img
            key={band}
            src={staticFile(src(layers))}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              zIndex,
              width: `${OVERSCAN * 100}%`,
              height: `${OVERSCAN * 100}%`,
              objectFit: "cover",
              transformOrigin: "center center",
              transform: `translate(-50%, -50%) scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%)`,
              willChange: "transform",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
