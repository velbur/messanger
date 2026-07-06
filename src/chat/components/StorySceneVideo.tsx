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
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  // Veo проигрывается 1:1 по wall-clock: Sequence from={sceneStartFrame} задаёт
  // старт, дальше OffthreadVideo идёт естественно (Remotion сам сводит 24→30 fps).
  // Никакого динамического trimBefore/startFrom — иначе кадр складывается с
  // естественным ходом и видео ускоряется.
  const showVideo = isDepthParallax
    ? localFrame < parallaxOverlayStart
    : localFrame < playFrames;

  const motion = storyVideoSceneMotion(video, localFrame);
  const videoStyle =
    isDepthParallax || isStatic ? baseCoverStyle : withMotionStyle(motion, 1);

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
      ? localFrame < parallaxOverlayStart
        ? 0
        : interpolate(localFrame, [parallaxOverlayStart, parallaxOverlayStart + 10], [0.5, 1], {
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
        {showVideo ? (
          <OffthreadVideo src={staticFile(video)} muted style={videoStyle} />
        ) : null}
        {isDepthParallax ? (
          <>
            {localFrame >= parallaxOverlayStart ? (
              <Img
                src={staticFile(holdFrame)}
                style={{...baseCoverStyle, position: "absolute", inset: 0, zIndex: 0}}
              />
            ) : null}
            <AbsoluteFill style={{zIndex: 1}}>
              <DepthDisplacementImage
                image={holdFrame}
                parallaxVideo={storyParallaxVideoPathForVideo(video)}
                sceneStartFrame={parallaxOverlayStart}
                durationFrames={parallaxPhaseFrames}
                premountFor={STORY_VIDEO_PARALLAX_PREMOUNT_FRAMES}
              />
            </AbsoluteFill>
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
        <StoryAtmosphereParticles seed={video} intensity={particleIntensity} />
      </AbsoluteFill>
    </Sequence>
  );
};
