import React from "react";
import {storyParallaxVideoPath} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  image: string;
  loopFrames?: number;
};

/** Проигрывает запечённый parallax-loop рядом со story-кадром (.parallax.mp4). */
export const DepthDisplacementImage: React.FC<Props> = ({image, loopFrames}) => (
  <DepthParallaxImage video={storyParallaxVideoPath(image.trim())} loopFrames={loopFrames} />
);
