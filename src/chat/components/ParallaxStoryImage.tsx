import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {motionVectors, sceneMotionLoopProgress} from "../story-motion";

type Props = {
  image: string;
  localFrame: number;
  durationFrames: number;
  directionSeed?: string;
  loopFrames?: number;
};

/**
 * 2.5D-параллакс из одного PNG: дальний слой (медленнее) + ближний (быстрее, с маской).
 * Без depth map и без генеративного ИИ — только CSS-слои и bezier-easing.
 */
export const ParallaxStoryImage: React.FC<Props> = ({
  image,
  localFrame,
  durationFrames,
  directionSeed = image,
  loopFrames,
}) => {
  const progress = sceneMotionLoopProgress(localFrame, loopFrames);
  const {panX, panY} = motionVectors(directionSeed);

  const farX = panX * progress * 3.2;
  const farY = panY * progress * 2.4;
  const nearX = -panX * progress * 5.5;
  const nearY = -panY * progress * 4.2;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <Img
        src={staticFile(image)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(1.18) translate(${farX}%, ${farY}%)`,
          transformOrigin: "center center",
          filter: "blur(1.2px) brightness(0.92)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "6% 8%",
          overflow: "hidden",
          WebkitMaskImage: "radial-gradient(ellipse 72% 68% at 50% 42%, #000 38%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 72% 68% at 50% 42%, #000 38%, transparent 100%)",
        }}
      >
        <Img
          src={staticFile(image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(1.14) translate(${nearX}%, ${nearY}%)`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
