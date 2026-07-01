import React from "react";
import {storyParallaxVideoPath} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  image: string;
  sceneStartFrame: number;
  durationFrames: number;
  /** Локальный кадр сцены, с которого начинать parallax-clip (кадр 0 = нейтраль) */
  parallaxLocalStartFrame?: number;
};

/** Проигрывает запечённый parallax-clip рядом со story-кадром (.parallax.mp4). */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  sceneStartFrame,
  durationFrames,
  parallaxLocalStartFrame = 0,
}) => {
  const delay = Math.max(0, Math.min(durationFrames - 1, parallaxLocalStartFrame));
  return (
    <DepthParallaxImage
      video={storyParallaxVideoPath(image.trim())}
      sceneStartFrame={sceneStartFrame + delay}
      durationFrames={Math.max(1, durationFrames - delay)}
    />
  );
};
