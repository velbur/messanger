import React from "react";
import {
  AbsoluteFill,
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

/** Видео поверх hold-PNG гаснет за 6 кадров; hold с zoom сразу под ним */
const VIDEO_FADE_OUT_FRAMES = 6;

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
  const holdStart = Math.max(0, playFrames - VIDEO_FADE_OUT_FRAMES);
  const holdLocalFrame = Math.max(0, localFrame - holdStart);
  const inHoldPhase = localFrame >= holdStart;

  const videoOpacity =
    !inHoldPhase
      ? 1
      : localFrame < playFrames
        ? interpolate(localFrame, [holdStart, playFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 0;

  const sourceFrame = inHoldPhase
    ? lastSourceFrame
    : storyVideoSourceFrameAtPlayFrame(localFrame, playFrames, lastSourceFrame);

  const motion = inHoldPhase
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
        {inHoldPhase ? (
          <Img src={staticFile(holdFrame)} style={withMotionStyle(motion, 1)} />
        ) : null}
        {localFrame < playFrames && videoOpacity > 0 ? (
          <AbsoluteFill style={{opacity: videoOpacity}}>
            <OffthreadVideo
              src={staticFile(video)}
              muted
              startFrom={sourceFrame}
              style={
                inHoldPhase
                  ? withMotionStyle(motion, 1)
                  : baseCoverStyle
              }
            />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </Sequence>
  );
};
