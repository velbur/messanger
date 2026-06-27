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
  storyVideoHoldMotion,
  storyVideoSourceFrameAtPlayFrame,
  storyVideoSourceFrameCount,
} from "../story-motion";
import {storyVideoHoldFramePathForVideo} from "../story-video-paths";

type Props = {
  video: string;
  image?: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
};

/** Плавный crossfade: видео 1→0, hold+zoom 0→1 */
const HOLD_CROSSFADE_FRAMES = 15;

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
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, frame - sceneStartFrame);
  const lastSourceFrame = Math.max(0, storyVideoSourceFrameCount(videoDurationMs) - 1);
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const crossfadeStart = Math.max(0, playFrames - HOLD_CROSSFADE_FRAMES);
  const inCrossfadeOrHold = localFrame >= crossfadeStart;
  const holdLocalFrame = Math.max(0, localFrame - crossfadeStart);

  const crossfadeProgress =
    localFrame < crossfadeStart
      ? 0
      : localFrame < playFrames
        ? interpolate(localFrame, [crossfadeStart, playFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.quad),
          })
        : 1;

  const videoOpacity = 1 - crossfadeProgress;
  const holdOpacity = crossfadeProgress;

  const sourceFrame = inCrossfadeOrHold
    ? lastSourceFrame
    : storyVideoSourceFrameAtPlayFrame(localFrame, playFrames, lastSourceFrame);

  const motion = inCrossfadeOrHold
    ? storyVideoHoldMotion(video, holdLocalFrame)
    : {scale: 1, translateX: 0, translateY: 0};

  return (
    <Sequence
      key={`hold-${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        {holdOpacity > 0 ? (
          <Img src={staticFile(holdFrame)} style={withMotionStyle(motion, holdOpacity)} />
        ) : null}
        {videoOpacity > 0 && localFrame < playFrames ? (
          <OffthreadVideo
            src={staticFile(video)}
            muted
            startFrom={sourceFrame}
            style={
              inCrossfadeOrHold
                ? withMotionStyle(motion, videoOpacity)
                : {...baseCoverStyle, opacity: videoOpacity}
            }
          />
        ) : null}
      </AbsoluteFill>
    </Sequence>
  );
};
