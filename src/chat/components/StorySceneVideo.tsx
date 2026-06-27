import React from "react";
import {
  AbsoluteFill,
  Loop,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import {
  storyVideoLoopDurationMs,
  storyVideoLoopPathForVideo,
} from "../story-video-paths";

type Props = {
  video: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
};

export const StorySceneVideo: React.FC<Props> = ({
  video,
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
}) => {
  const {fps} = useVideoConfig();
  const loopVideo = storyVideoLoopPathForVideo(video);
  const loopDurationFrames = Math.max(
    2,
    Math.round((storyVideoLoopDurationMs(videoDurationMs) / 1000) * fps),
  );

  return (
    <Sequence
      key={`${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <Loop durationInFrames={loopDurationFrames}>
          <OffthreadVideo
            src={staticFile(loopVideo)}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Loop>
      </AbsoluteFill>
    </Sequence>
  );
};
