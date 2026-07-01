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

/** Hold-кадр плавно проявляется поверх замершего видео (видео не гасим — иначе чёрный кадр) */
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
  const lastSourceFrame = Math.max(0, storyVideoSourceFrameCount(videoDurationMs) - 1);
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const crossfadeStart = Math.max(0, playFrames - HOLD_CROSSFADE_FRAMES);
  const showVideo = localFrame < playFrames;

  // Зум идёт непрерывно через всю сцену — поэтому паузы при замирании клипа нет
  const motion = storyVideoSceneMotion(video, localFrame);

  const holdOpacity =
    localFrame < crossfadeStart
      ? 0
      : localFrame < playFrames
        ? interpolate(localFrame, [crossfadeStart, playFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.quad),
          })
        : 1;

  // До crossfade — проигрываем Veo; к crossfadeStart уже на последнем кадре (без скачка)
  const sourceFrame =
    localFrame >= crossfadeStart
      ? lastSourceFrame
      : storyVideoSourceFrameAtPlayFrame(
          localFrame,
          Math.max(1, crossfadeStart),
          lastSourceFrame,
        );

  const parallaxMotionStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: holdOpacity,
  };

  // Частицы тоньше во время живого видео, ярче на hold-кадре
  const particleIntensity = interpolate(
    localFrame,
    [crossfadeStart, playFrames],
    [0.5, 1],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

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
            style={withMotionStyle(motion, 1)}
          />
        ) : null}
        {/* Всегда в дереве для preload; виден только с crossfade */}
        {fallbackAnimation === "depthParallax" ? (
          <div style={parallaxMotionStyle}>
            <DepthDisplacementImage
              image={holdFrame}
              parallaxVideo={storyParallaxVideoPathForVideo(video)}
              sceneStartFrame={sceneStartFrame}
              durationFrames={sceneDurationFrames}
              parallaxLocalStartFrame={crossfadeStart}
            />
          </div>
        ) : (
          <Img src={staticFile(holdFrame)} style={withMotionStyle(motion, holdOpacity)} />
        )}
        <StoryAtmosphereParticles seed={video} intensity={particleIntensity} />
      </AbsoluteFill>
    </Sequence>
  );
};
