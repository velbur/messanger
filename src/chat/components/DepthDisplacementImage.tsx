import React from "react";
import {storyParallaxVideoPath} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  image: string;
};

/** Проигрывает запечённый parallax-clip рядом со story-кадром (.parallax.mp4). */
export const DepthDisplacementImage: React.FC<Props> = ({image}) => (
  <DepthParallaxImage video={storyParallaxVideoPath(image.trim())} />
);
