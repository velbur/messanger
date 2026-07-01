import React from "react";
import {storyParallaxVideoPath} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  /** PNG-источник bake (.png или .video-hold.png) */
  image: string;
  sceneStartFrame: number;
  durationFrames: number;
  /** Локальный кадр сцены, с которого начинать parallax-clip (кадр 0 = нейтраль) */
  parallaxLocalStartFrame?: number;
  /** Явный путь к .parallax.mp4 (для video-parallax с hold-кадра) */
  parallaxVideo?: string;
};

/** Проигрывает запечённый parallax-clip рядом со story-кадром (.parallax.mp4). */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  sceneStartFrame,
  durationFrames,
  parallaxLocalStartFrame = 0,
  parallaxVideo,
}) => {
  const delay = Math.max(0, Math.min(durationFrames - 1, parallaxLocalStartFrame));
  const video = parallaxVideo?.trim() || storyParallaxVideoPath(image.trim());
  return (
    <DepthParallaxImage
      video={video}
      sceneStartFrame={sceneStartFrame + delay}
      durationFrames={Math.max(1, durationFrames - delay)}
    />
  );
};
