import React from "react";
import {Img, interpolate, staticFile} from "remotion";
import {motionVectors, sceneMotionProgress} from "../story-motion";

type Props = {
  image: string;
  /** Локальный кадр сцены (от reveal) */
  localFrame: number;
  durationFrames: number;
  animation: "kenburns" | "none";
  /** Случайное направление движения по hash пути */
  directionSeed?: string;
};

export const KenBurnsImage: React.FC<Props> = ({
  image,
  localFrame,
  durationFrames,
  animation,
  directionSeed = image,
}) => {
  const safeDuration = Math.max(1, durationFrames);
  const progress = sceneMotionProgress(localFrame, safeDuration);
  const {panX, panY} = motionVectors(directionSeed);

  const scale =
    animation === "kenburns"
      ? interpolate(progress, [0, 1], [1, 1.08], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const translateX = animation === "kenburns" ? progress * panX * 2.5 : 0;
  const translateY = animation === "kenburns" ? progress * panY * 1.8 : 0;

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
