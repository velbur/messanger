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
  storyVideoParallaxOverlayStartFrame,
  storyVideoParallaxPhaseFrames,
  STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES,
  STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES,
  storyVideoSceneMotion,
} from "../story-motion";
import {STORY_SCENE_VIDEO_LOCAL_FRAME_REV} from "../story";
import {storyVideoHoldFramePathForVideo} from "../story-video-paths";
import {storyParallaxVideoPathForVideo} from "../story-depth-paths";
import {StoryAtmosphereParticles} from "./StoryAtmosphereParticles";

import {DepthDisplacementImage} from "./DepthDisplacementImage";

void STORY_SCENE_VIDEO_LOCAL_FRAME_REV;

type Props = {
  video: string;
  image?: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  /** Локальный кадр сцены (0 = начало). StoryPanel передаёт явно; превью — из useCurrentFrame − sceneStartFrame */
  localFrame?: number;
  fallbackAnimation?: "static" | "kenburns" | "depthParallax";
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

const crossfadeOpacity = (
  localFrame: number,
  startFrame: number,
  endFrame: number,
  direction: "in" | "out",
): number => {
  if (localFrame < startFrame) {
    return direction === "in" ? 0 : 1;
  }
  if (localFrame >= endFrame) {
    return direction === "in" ? 1 : 0;
  }
  const t = interpolate(localFrame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  return direction === "in" ? t : 1 - t;
};

export const StorySceneVideo: React.FC<Props> = ({
  video,
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
  localFrame: localFrameProp,
  fallbackAnimation = "static",
}) => {
  const compositionFrame = useCurrentFrame();
  const localFrame =
    localFrameProp ?? Math.max(0, compositionFrame - sceneStartFrame);
  const {fps} = useVideoConfig();
  const isDepthParallax = fallbackAnimation === "depthParallax";
  const isStatic = fallbackAnimation === "static";
  const playFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const parallaxOverlayStart = isDepthParallax
    ? storyVideoParallaxOverlayStartFrame(videoDurationMs, fps)
    : Math.max(0, playFrames - HOLD_CROSSFADE_FRAMES);
  const parallaxCrossfadeEnd = isDepthParallax
    ? Math.min(playFrames, parallaxOverlayStart + STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES)
    : playFrames;
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const videoOpacity = isDepthParallax
    ? crossfadeOpacity(localFrame, parallaxOverlayStart, parallaxCrossfadeEnd, "out")
    : 1;
  const parallaxOpacity = isDepthParallax
    ? crossfadeOpacity(localFrame, parallaxOverlayStart, parallaxCrossfadeEnd, "in")
    : 0;
  const showVideo = isDepthParallax
    ? localFrame < parallaxCrossfadeEnd && videoOpacity > 0.001
    : localFrame < playFrames;

  const motion = storyVideoSceneMotion(video, localFrame);
  const videoStyle: React.CSSProperties =
    isDepthParallax || isStatic
      ? {...baseCoverStyle, opacity: videoOpacity}
      : withMotionStyle(motion, 1);

  /** depthParallax: hold под parallax. Ken Burns: crossfade + zoom на hold-кадре */
  const holdOpacity = isDepthParallax
    ? localFrame >= parallaxOverlayStart
      ? 1
      : 0
    : localFrame < parallaxOverlayStart
      ? 0
      : localFrame < playFrames
        ? interpolate(localFrame, [parallaxOverlayStart, playFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.quad),
          })
        : 1;

  const parallaxPhaseFrames = isDepthParallax
    ? storyVideoParallaxPhaseFrames(videoDurationMs, sceneDurationFrames, fps)
    : Math.max(1, sceneDurationFrames - parallaxOverlayStart);

  const particleIntensity = isStatic
    ? 0.35
    : isDepthParallax
      ? parallaxOpacity < 0.05
        ? interpolate(videoOpacity, [0.2, 1], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : interpolate(parallaxOpacity, [0, 1], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
      : interpolate(localFrame, [parallaxOverlayStart, playFrames], [0.5, 1], {
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
          <>
            {localFrame >= parallaxOverlayStart ? (
              <Img
                src={staticFile(holdFrame)}
                style={{...baseCoverStyle, position: "absolute", inset: 0, zIndex: 0}}
              />
            ) : null}
            {localFrame >= parallaxOverlayStart - STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES ? (
              <AbsoluteFill style={{zIndex: 1, opacity: parallaxOpacity}}>
                <DepthDisplacementImage
                  image={holdFrame}
                  parallaxVideo={storyParallaxVideoPathForVideo(video)}
                  sceneStartFrame={parallaxOverlayStart}
                  durationFrames={parallaxPhaseFrames}
                  premountFor={STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES}
                />
              </AbsoluteFill>
            ) : null}
          </>
        ) : isStatic ? (
          localFrame >= playFrames ? (
            <Img
              src={staticFile(holdFrame)}
              style={{...baseCoverStyle, position: "absolute", inset: 0}}
            />
          ) : null
        ) : (
          <Img
            src={staticFile(storyVideoHoldFramePathForVideo(video))}
            style={withMotionStyle(motion, holdOpacity)}
          />
        )}
        {showVideo ? (
          <OffthreadVideo
            src={staticFile(video)}
            muted
            style={{...videoStyle, position: "absolute", inset: 0, zIndex: 2}}
          />
        ) : null}
        <StoryAtmosphereParticles seed={video} intensity={particleIntensity} />
      </AbsoluteFill>
    </Sequence>
  );
};
