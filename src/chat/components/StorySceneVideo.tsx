import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  storyVideoForwardDurationFrames,
  storyVideoParallaxFadeStartFrame,
  storyVideoParallaxHandoffFrame,
  storyVideoParallaxPhaseFrames,
  STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES,
  storyVideoSceneMotion,
  storyVideoSourceFrameAtPlayFrame,
  storyVideoSourceFrameCount,
} from "../story-motion";
import {storyVideoHoldFramePathForVideo} from "../story-video-paths";
import {storyParallaxVideoPathForVideo} from "../story-depth-paths";
import {StoryAtmosphereParticles} from "./StoryAtmosphereParticles";

import {DepthDisplacementImage} from "./DepthDisplacementImage";

type Props = {
  video: string;
  image?: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  fallbackAnimation?: "kenburns" | "depthParallax";
};

/** Ken Burns hold: плавный crossfade с замершего Veo */
const HOLD_CROSSFADE_FRAMES = 12;

const baseCoverStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transformOrigin: "center center",
};

const withMotionStyle = (
  motion: {scale: number; translateX: number; translateY: number},
  opacity: number,
): React.CSSProperties => ({
  ...baseCoverStyle,
  opacity,
  transform: `scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%)`,
});

export const StorySceneVideo: React.FC<Props> = ({
  video,
  image,
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
  fallbackAnimation = "kenburns",
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, frame - sceneStartFrame);
  const isDepthParallax = fallbackAnimation === "depthParallax";
  const lastSourceFrame = Math.max(0, storyVideoSourceFrameCount(videoDurationMs) - 1);
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const handoffFrame = isDepthParallax
    ? storyVideoParallaxHandoffFrame(videoDurationMs, fps, sceneDurationFrames)
    : playFrames;
  const fadeStartFrame = isDepthParallax
    ? storyVideoParallaxFadeStartFrame(videoDurationMs, fps, sceneDurationFrames)
    : handoffFrame;
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const crossfadeStart = Math.max(0, playFrames - HOLD_CROSSFADE_FRAMES);
  const showVideo = isDepthParallax ? localFrame < handoffFrame : localFrame < playFrames;

  const motion = storyVideoSceneMotion(video, localFrame);
  const videoOpacity = isDepthParallax
    ? localFrame < fadeStartFrame
      ? 1
      : localFrame < handoffFrame
        ? interpolate(localFrame, [fadeStartFrame, handoffFrame], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          })
        : 0
    : 1;
  const videoStyle = isDepthParallax
    ? {...baseCoverStyle, opacity: videoOpacity}
    : withMotionStyle(motion, 1);

  const parallaxOpacity = isDepthParallax
    ? localFrame < fadeStartFrame
      ? 0
      : localFrame < handoffFrame
        ? interpolate(localFrame, [fadeStartFrame, handoffFrame], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.quad),
          })
        : 1
    : 0;

  /** depthParallax: резкий переход (без ghosting). Ken Burns hold: crossfade. */
  const holdOpacity = isDepthParallax
    ? localFrame >= playFrames
      ? 1
      : 0
    : localFrame < crossfadeStart
      ? 0
      : localFrame < playFrames
        ? interpolate(localFrame, [crossfadeStart, playFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.quad),
          })
        : 1;

  const sourceFrame = isDepthParallax
    ? localFrame >= fadeStartFrame
      ? lastSourceFrame
      : storyVideoSourceFrameAtPlayFrame(
          localFrame,
          Math.max(1, fadeStartFrame),
          lastSourceFrame,
        )
    : localFrame >= crossfadeStart
      ? lastSourceFrame
      : storyVideoSourceFrameAtPlayFrame(
          localFrame,
          Math.max(1, crossfadeStart),
          lastSourceFrame,
        );

  const parallaxStartFrame = isDepthParallax ? fadeStartFrame : crossfadeStart;
  const parallaxPhaseFrames = isDepthParallax
    ? storyVideoParallaxPhaseFrames(videoDurationMs, sceneDurationFrames, fps)
    : Math.max(1, sceneDurationFrames - parallaxStartFrame);

  const particleIntensity = isDepthParallax
    ? localFrame >= fadeStartFrame
      ? 1
      : interpolate(localFrame, [Math.max(0, fadeStartFrame - 8), fadeStartFrame], [0.5, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
    : interpolate(localFrame, [crossfadeStart, playFrames], [0.5, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <Sequence
      key={`scene-${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        {isDepthParallax ? (
          <DepthDisplacementImage
            image={holdFrame}
            parallaxVideo={storyParallaxVideoPathForVideo(video)}
            sceneStartFrame={sceneStartFrame + fadeStartFrame}
            durationFrames={parallaxPhaseFrames}
            opacity={parallaxOpacity}
            premountFor={STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES + 8}
          />
        ) : null}
        {showVideo ? (
          <OffthreadVideo
            src={staticFile(video)}
            muted
            startFrom={sourceFrame}
            style={videoStyle}
          />
        ) : null}
        {!isDepthParallax ? (
          <Img src={staticFile(holdFrame)} style={withMotionStyle(motion, holdOpacity)} />
        ) : null}
        <StoryAtmosphereParticles seed={video} intensity={particleIntensity} />
      </AbsoluteFill>
    </Sequence>
  );
};
