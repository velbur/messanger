import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {storyVideoForwardDurationFrames, storyVideoHoldMotion} from "../story-motion";
import {storyVideoHoldFramePathForVideo} from "../story-video-paths";

type Props = {
  video: string;
  image?: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const StoryVideoHold: React.FC<{
  holdFrame: string;
  video: string;
  holdStartFrame: number;
}> = ({holdFrame, video, holdStartFrame}) => {
  const frame = useCurrentFrame();
  const holdLocalFrame = Math.max(0, frame - holdStartFrame);
  const motion = storyVideoHoldMotion(video, holdLocalFrame);

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <AbsoluteFill
        style={{
          transform: `scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%)`,
          transformOrigin: "center center",
        }}
      >
        <Img src={staticFile(holdFrame)} style={videoStyle} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const StorySceneVideo: React.FC<Props> = ({
  video,
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
}) => {
  const {fps} = useVideoConfig();
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const holdFrames = Math.max(0, sceneDurationFrames - playFrames);
  const holdFrame = storyVideoHoldFramePathForVideo(video);
  const holdStartFrame = sceneStartFrame + playFrames;

  return (
    <Sequence
      key={`hold-${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <Series>
        <Series.Sequence durationInFrames={playFrames}>
          <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
            <OffthreadVideo src={staticFile(video)} muted style={videoStyle} />
          </AbsoluteFill>
        </Series.Sequence>
        {holdFrames > 0 ? (
          <Series.Sequence durationInFrames={holdFrames}>
            <StoryVideoHold
              holdFrame={holdFrame}
              video={video}
              holdStartFrame={holdStartFrame}
            />
          </Series.Sequence>
        ) : null}
      </Series>
    </Sequence>
  );
};
