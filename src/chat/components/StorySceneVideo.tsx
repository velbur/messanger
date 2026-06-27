import React from "react";
import {
  AbsoluteFill,
  Loop,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import {storyVideoForwardDurationFrames} from "../story-motion";

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
  const loopDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);

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
            src={staticFile(video)}
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
