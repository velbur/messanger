import React from "react";
import {Img, staticFile} from "remotion";
import type {StorySceneAnimation} from "../story";
import {storyLayerPaths} from "../story-depth-paths";
import {DepthParallaxImage} from "./DepthParallaxImage";
import {KenBurnsImage} from "./KenBurnsImage";
import {ParallaxStoryImage} from "./ParallaxStoryImage";

type Props = {
  image: string;
  localFrame: number;
  durationFrames: number;
  animation: StorySceneAnimation;
  directionSeed?: string;
  /** true — depth-слои сгенерированы на воркере */
  depthParallax?: boolean;
};

export const StorySceneImage: React.FC<Props> = ({
  image,
  localFrame,
  durationFrames,
  animation,
  directionSeed,
  depthParallax = true,
}) => {
  if (animation === "parallax" && depthParallax) {
    return (
      <DepthParallaxImage
        image={image}
        layers={storyLayerPaths(image)}
        localFrame={localFrame}
        durationFrames={durationFrames}
        directionSeed={directionSeed ?? image}
      />
    );
  }

  if (animation === "parallax") {
    return (
      <ParallaxStoryImage
        image={image}
        localFrame={localFrame}
        durationFrames={durationFrames}
        directionSeed={directionSeed}
      />
    );
  }

  if (animation === "kenburns") {
    return (
      <KenBurnsImage
        image={image}
        localFrame={localFrame}
        durationFrames={durationFrames}
        animation="kenburns"
        directionSeed={directionSeed}
      />
    );
  }

  return (
    <Img
      src={staticFile(image)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
};
