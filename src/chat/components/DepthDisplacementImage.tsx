import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {storyLayerPaths} from "../story-depth-paths";
import {motionVectors, sceneMotionLoopProgress} from "../story-motion";

type Props = {
  image: string;
  localFrame: number;
  directionSeed?: string;
  loopFrames?: number;
};

const coverStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transformOrigin: "center center",
};

/**
 * Два слоя: фон движется медленно, передний план (по .depth.png) — быстрее.
 * CSS mask работает в headless Chrome; SVG feDisplacementMap в Remotion — нет.
 */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  localFrame,
  directionSeed = image,
  loopFrames,
}) => {
  const trimmed = image.trim();
  const paths = storyLayerPaths(trimmed);
  const depthMask = `url(${staticFile(paths.depth)})`;
  const progress = sceneMotionLoopProgress(localFrame, loopFrames);
  const {panX, panY} = motionVectors(directionSeed);

  const farTx = panX * progress * -4;
  const farTy = panY * progress * -2.5;
  const nearTx = panX * progress * 6;
  const nearTy = panY * progress * 3.5;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#060606"}}>
      <Img
        src={staticFile(trimmed)}
        style={{
          ...coverStyle,
          transform: `scale(1.05) translate(${farTx}%, ${farTy}%)`,
        }}
      />
      <Img
        src={staticFile(trimmed)}
        style={{
          ...coverStyle,
          transform: `scale(1.09) translate(${nearTx}%, ${nearTy}%)`,
          WebkitMaskImage: depthMask,
          maskImage: depthMask,
          WebkitMaskSize: "cover",
          maskSize: "cover",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />
    </AbsoluteFill>
  );
};
