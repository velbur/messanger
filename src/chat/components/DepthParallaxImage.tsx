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
              inset: 0,
              zIndex,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transformOrigin: "center center",
              transform: `scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%)`,
              willChange: "transform",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
