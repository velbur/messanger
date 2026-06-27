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

const HOLD_CROSSFADE_FRAMES = 8;
/** Начать zoom до конца клипа, чтобы не было «замер → потом движение» */
const MOTION_LEAD_FRAMES = 15;

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

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
  const motionStart = Math.max(0, crossfadeStart - MOTION_LEAD_FRAMES);
  const motionLocalFrame = Math.max(0, localFrame - motionStart);
  const motionActive = localFrame >= motionStart;

  const videoOpacity =
    localFrame < crossfadeStart
      ? 1
      : localFrame < playFrames
        ? interpolate(localFrame, [crossfadeStart, playFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 0;

  const holdOpacity =
    localFrame >= crossfadeStart
      ? interpolate(localFrame, [crossfadeStart, playFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const sourceFrame =
    localFrame >= crossfadeStart
      ? lastSourceFrame
      : storyVideoSourceFrameAtPlayFrame(localFrame, playFrames, lastSourceFrame);

  const motion = motionActive
    ? storyVideoHoldMotion(video, motionLocalFrame)
    : {scale: 1, translateX: 0, translateY: 0};

  return (
    <Sequence
      key={`hold-${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <AbsoluteFill
          style={{
            transform: motionActive
              ? `scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%)`
              : undefined,
            transformOrigin: "center center",
          }}
        >
          {localFrame < playFrames && videoOpacity > 0 ? (
            <AbsoluteFill style={{opacity: videoOpacity}}>
              <OffthreadVideo
                src={staticFile(video)}
                muted
                startFrom={sourceFrame}
                style={videoStyle}
              />
            </AbsoluteFill>
          ) : null}
          {holdOpacity > 0 ? (
            <AbsoluteFill style={{opacity: holdOpacity}}>
              <Img src={staticFile(holdFrame)} style={videoStyle} />
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>
    </Sequence>
  );
};
