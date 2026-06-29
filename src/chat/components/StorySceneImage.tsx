import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import type {StorySceneAnimation} from "../story";
import {storyLayerPaths} from "../story-depth-paths";
import {storyMotionLoopFrames} from "../story-motion";
import {DepthParallaxImage} from "./DepthParallaxImage";
import {KenBurnsImage} from "./KenBurnsImage";
import {ParallaxStoryImage} from "./ParallaxStoryImage";
import {StoryAtmosphereParticles} from "./StoryAtmosphereParticles";
import {StorySceneVideo} from "./StorySceneVideo";

type Props = {
  image?: string;
  video?: string;
  videoDurationMs?: number;
  videoLoop?: boolean;
  localFrame: number;
  durationFrames: number;
  sceneStartFrame: number;
  animation: StorySceneAnimation;
  motionLoopSec?: number;
};

const MotionScene: React.FC<{
  image: string;
  animation: StorySceneAnimation;
  localFrame: number;
  durationFrames: number;
  motionLoopFrames: number;
}> = ({image, animation, localFrame, durationFrames, motionLoopFrames}) => {
  const trimmed = image.trim();
  const particles = (
    <StoryAtmosphereParticles seed={trimmed} intensity={animation === "none" ? 0.35 : 0.72} />
  );

  if (animation === "none") {
    return (
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <KenBurnsImage
          image={trimmed}
          localFrame={localFrame}
          durationFrames={durationFrames}
          animation="none"
        />
        {particles}
      </AbsoluteFill>
    );
  }

  if (animation === "kenburns") {
    return (
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <KenBurnsImage
          image={trimmed}
          localFrame={localFrame}
          durationFrames={durationFrames}
          animation="kenburns"
          loop
          loopFrames={motionLoopFrames}
        />
        {particles}
      </AbsoluteFill>
    );
  }

  if (animation === "depthParallax") {
    return (
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <DepthParallaxImage
          image={trimmed}
          layers={storyLayerPaths(trimmed)}
          localFrame={localFrame}
          durationFrames={durationFrames}
          loopFrames={motionLoopFrames}
        />
        {particles}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <ParallaxStoryImage
        image={trimmed}
        localFrame={localFrame}
        durationFrames={durationFrames}
        loopFrames={motionLoopFrames}
      />
      {particles}
    </AbsoluteFill>
  );
};

export const StorySceneImage: React.FC<Props> = ({
  image,
  video,
  videoDurationMs,
  localFrame,
  durationFrames,
  sceneStartFrame,
  animation,
  motionLoopSec = 3,
}) => {
  const motionLoopFrameCount = storyMotionLoopFrames(motionLoopSec);

  if (animation === "video" && video?.trim()) {
    return (
      <StorySceneVideo
        video={video.trim()}
        image={image?.trim()}
        videoDurationMs={videoDurationMs}
        sceneStartFrame={sceneStartFrame}
        sceneDurationFrames={durationFrames}
      />
    );
  }

  if (image?.trim()) {
    return (
      <MotionScene
        image={image.trim()}
        animation={animation === "video" ? "kenburns" : animation}
        localFrame={localFrame}
        durationFrames={durationFrames}
        motionLoopFrames={motionLoopFrameCount}
      />
    );
  }

  return null;
};
