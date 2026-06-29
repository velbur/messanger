import React from "react";
import {storyLayerPaths} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";

type Props = {
  image: string;
  localFrame: number;
  directionSeed?: string;
  loopFrames?: number;
};

/** Три RGBA depth-слоя (генерятся в story-depth.mjs), не дублирование кадра + mask. */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  localFrame,
  directionSeed = image,
  loopFrames,
}) => (
  <DepthParallaxImage
    layers={storyLayerPaths(image.trim())}
    localFrame={localFrame}
    directionSeed={directionSeed}
    loopFrames={loopFrames}
  />
);
