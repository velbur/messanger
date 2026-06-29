import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {motionVectors, sceneMotionLoopProgress} from "../story-motion";

type Props = {
  image: string;
  localFrame: number;
  loopFrames?: number;
  directionSeed?: string;
};

/**
 * Запасной вариант без depth-слоёв: лёгкий 3D-наклон одного кадра (без дублирования).
 */
export const PerspectiveParallaxImage: React.FC<Props> = ({
  image,
  localFrame,
  loopFrames,
  directionSeed = image,
}) => {
  const progress = sceneMotionLoopProgress(localFrame, loopFrames);
  const {panX, panY} = motionVectors(directionSeed);
  const tiltY = panY * (progress - 0.5) * 5.5;
  const tiltX = panX * (progress - 0.5) * -5.5;
  const scale = 1.1 + progress * 0.03;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 1600,
          perspectiveOrigin: "50% 45%",
        }}
      >
        <Img
          src={staticFile(image)}
          style={{
            width: "112%",
            height: "112%",
            objectFit: "cover",
            transform: `scale(${scale}) rotateX(${tiltY}deg) rotateY(${tiltX}deg)`,
            transformStyle: "preserve-3d",
            transformOrigin: "center center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
