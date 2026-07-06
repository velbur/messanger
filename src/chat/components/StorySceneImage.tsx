import React from "react";
import {AbsoluteFill} from "remotion";
import type {StorySceneAnimation} from "../story";
import {storyMotionLoopFrames} from "../story-motion";
import {storyVideoPathForImage} from "../story-video-paths";
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
  animation === "parallax" || animation === "depthParallax" || animation === "video-parallax";

const isHybridVideoAnimation = (animation: StorySceneAnimation): boolean =>
  animation === "video" || animation === "video-parallax" || animation === "video-kenburns";

const hybridVideoFallbackAnimation = (
  animation: StorySceneAnimation,
): "static" | "kenburns" | "depthParallax" => {
  if (animation === "video-parallax") {
    return "depthParallax";
  }
  if (animation === "video-kenburns") {
    return "kenburns";
  }
  return "static";
};

const MotionScene: React.FC<{
  image: string;
  animation: StorySceneAnimation;
  localFrame: number;
  durationFrames: number;
  sceneStartFrame: number;
  motionLoopFrames: number;
}> = ({image, animation, localFrame, durationFrames, sceneStartFrame, motionLoopFrames}) => {
  const trimmed = image.trim();
  // depthParallax уже несёт объёмные пылинки, запечённые в loop → плоский
  // CSS-оверлей приглушаем, чтобы не было «снегопада» из двух систем
  const particleIntensity =
    animation === "none" ? 0.35 : usesDepthParallax(animation) ? 0.4 : 0.72;
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
        <DepthDisplacementImage
          image={trimmed}
          sceneStartFrame={sceneStartFrame}
          durationFrames={durationFrames}
        />
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
  const trimmedImage = image?.trim();
  const trimmedVideo = video?.trim();
  const hybridVideo =
    trimmedVideo ||
    ((animation === "video-parallax" || animation === "video-kenburns") && trimmedImage
      ? storyVideoPathForImage(trimmedImage)
      : undefined);

  if (isHybridVideoAnimation(animation) && hybridVideo) {
    return (
      <StorySceneVideo
        video={hybridVideo}
        image={trimmedImage}
        videoDurationMs={videoDurationMs}
        sceneStartFrame={sceneStartFrame}
        sceneDurationFrames={durationFrames}
        localFrame={localFrame}
        fallbackAnimation={hybridVideoFallbackAnimation(animation)}
      />
    );
  }

  if (trimmedImage) {
    return (
      <MotionScene
        image={trimmedImage}
        animation={
          animation === "video"
            ? "none"
            : animation === "video-parallax" || animation === "video-kenburns"
              ? "kenburns"
              : animation
        }
        localFrame={localFrame}
        durationFrames={durationFrames}
        sceneStartFrame={sceneStartFrame}
        motionLoopFrames={motionLoopFrameCount}
      />
    );
  }

  return null;
};
