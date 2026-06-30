import React from "react";
import {storyParallaxVideoPath} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  image: string;
  sceneStartFrame: number;
  durationFrames: number;
};

/** Проигрывает запечённый parallax-clip рядом со story-кадром (.parallax.mp4). */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  sceneStartFrame,
  durationFrames,
}) => (
  <DepthParallaxImage
    video={storyParallaxVideoPath(image.trim())}
    sceneStartFrame={sceneStartFrame}
    durationFrames={durationFrames}
  />
);
