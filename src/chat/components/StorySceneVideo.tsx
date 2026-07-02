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
  storyVideoParallaxHandoffFrame,
  storyVideoParallaxPhaseFrames,
  STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES,
  storyVideoSceneMotion,
  storyVideoSourceFrameAtPlayFrame,
  storyVideoSourceFrameCount,
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
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
  localFrame: localFrameProp,
  fallbackAnimation = "kenburns",
}) => {
  const compositionFrame = useCurrentFrame();
  const localFrame =
    localFrameProp ?? Math.max(0, compositionFrame - sceneStartFrame);
  const {fps} = useVideoConfig();
  const isDepthParallax = fallbackAnimation === "depthParallax";
  const lastSourceFrame = Math.max(0, storyVideoSourceFrameCount(videoDurationMs) - 1);
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const handoffFrame = isDepthParallax
    ? storyVideoParallaxHandoffFrame(videoDurationMs, fps, sceneDurationFrames)
    : playFrames;
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const crossfadeStart = Math.max(0, playFrames - HOLD_CROSSFADE_FRAMES);
  const showVideo = localFrame < handoffFrame;

  const motion = storyVideoSceneMotion(video, localFrame);
  const videoStyle = isDepthParallax ? baseCoverStyle : withMotionStyle(motion, 1);

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
    ? storyVideoSourceFrameAtPlayFrame(localFrame, Math.max(1, handoffFrame), lastSourceFrame)
    : localFrame >= crossfadeStart
      ? lastSourceFrame
      : storyVideoSourceFrameAtPlayFrame(
          localFrame,
          Math.max(1, crossfadeStart),
          lastSourceFrame,
        );

  const parallaxPhaseFrames = isDepthParallax
    ? storyVideoParallaxPhaseFrames(videoDurationMs, sceneDurationFrames, fps)
    : Math.max(1, sceneDurationFrames - crossfadeStart);

  const particleIntensity = isDepthParallax
    ? localFrame < handoffFrame
      ? 0
      : interpolate(localFrame, [handoffFrame, handoffFrame + 10], [0.5, 1], {
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
        {showVideo ? (
          <OffthreadVideo
            src={staticFile(video)}
            muted
            startFrom={sourceFrame}
            style={videoStyle}
          />
        ) : null}
        {isDepthParallax ? (
          <>
            {localFrame >= handoffFrame ? (
              <Img
                src={staticFile(holdFrame)}
                style={{...baseCoverStyle, position: "absolute", inset: 0, zIndex: 0}}
              />
            ) : null}
            <AbsoluteFill style={{zIndex: 1}}>
              <DepthDisplacementImage
                image={holdFrame}
                parallaxVideo={storyParallaxVideoPathForVideo(video)}
                sceneStartFrame={handoffFrame}
                durationFrames={parallaxPhaseFrames}
                premountFor={STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES}
              />
            </AbsoluteFill>
          </>
        ) : (
          <Img src={staticFile(holdFrame)} style={withMotionStyle(motion, holdOpacity)} />
        )}
        <StoryAtmosphereParticles seed={video} intensity={particleIntensity} />
      </AbsoluteFill>
    </Sequence>
  );
};
