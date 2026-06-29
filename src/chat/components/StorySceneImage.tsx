import React from "react";
import {AbsoluteFill} from "remotion";
import type {StorySceneAnimation} from "../story";
import {storyMotionLoopFrames} from "../story-motion";
import {DepthDisplacementImage} from "./DepthDisplacementImage";
import {KenBurnsImage} from "./KenBurnsImage";
import {PerspectiveParallaxImage} from "./PerspectiveParallaxImage";
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

const usesDepthParallax = (animation: StorySceneAnimation): boolean =>
  animation === "parallax" || animation === "depthParallax";

const MotionScene: React.FC<{
  image: string;
  animation: StorySceneAnimation;
  localFrame: number;
  durationFrames: number;
  motionLoopFrames: number;
}> = ({image, animation, localFrame, durationFrames, motionLoopFrames}) => {
  const trimmed = image.trim();
  // depthParallax уже несёт объёмные пылинки, запечённые в loop → плоский
  // CSS-оверлей приглушаем, чтобы не было «снегопада» из двух систем
  const particleIntensity =
    animation === "none" ? 0.35 : usesDepthParallax(animation) ? 0.28 : 0.72;
  const particles = <StoryAtmosphereParticles seed={trimmed} intensity={particleIntensity} />;

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

  if (usesDepthParallax(animation)) {
    return (
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <DepthDisplacementImage image={trimmed} loopFrames={motionLoopFrames} />
        {particles}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <PerspectiveParallaxImage
        image={trimmed}
        localFrame={localFrame}
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
