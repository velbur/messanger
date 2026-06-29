import React from "react";
import {Img, interpolate, staticFile} from "remotion";
import {motionVectors, sceneMotionLoopProgress, sceneMotionProgress} from "../story-motion";

type Props = {
  image: string;
  localFrame: number;
  durationFrames: number;
  animation: "kenburns" | "none" | "hold";
  directionSeed?: string;
  /** Бесшовный цикл движения на всё время сцены */
  loop?: boolean;
  loopFrames?: number;
};

export const KenBurnsImage: React.FC<Props> = ({
  image,
  localFrame,
  durationFrames,
  animation,
  directionSeed = image,
  loop = false,
  loopFrames,
}) => {
  const safeDuration = Math.max(1, durationFrames);
  const progress = loop
    ? sceneMotionLoopProgress(localFrame, loopFrames)
    : sceneMotionProgress(localFrame, safeDuration);
  const {panX, panY} = motionVectors(directionSeed);

  const scale =
    animation === "hold"
      ? interpolate(progress, [0, 1], [1, 1.035], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : animation === "kenburns" || loop
        ? interpolate(progress, [0, 1], [1, 1.06], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 1;

  const translateX =
    animation === "hold"
      ? progress * panX * 0.8
      : animation === "kenburns" || loop
        ? progress * panX * 2
        : 0;
  const translateY =
    animation === "hold"
      ? progress * panY * 0.6
      : animation === "kenburns" || loop
        ? progress * panY * 1.5
        : 0;

  return (
    <Img
      src={staticFile(image)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        transformOrigin: "center center",
      }}
    />
  );
};
