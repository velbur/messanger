import React from "react";
import {
  AbsoluteFill,
  Loop,
  OffthreadVideo,
  Series,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import {
  storyVideoForwardDurationFrames,
  storyVideoSourceFrameCount,
} from "../story-motion";

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
  const sourceFrameCount = storyVideoSourceFrameCount(videoDurationMs);
  const forwardDuration = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const pingPongPeriod = forwardDuration * 2;

  return (
    <Sequence
      key={`${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <Loop durationInFrames={pingPongPeriod}>
          <Series>
            <Series.Sequence durationInFrames={forwardDuration}>
              <OffthreadVideo
                src={staticFile(video)}
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Series.Sequence>
            <Series.Sequence durationInFrames={forwardDuration}>
              <OffthreadVideo
                src={staticFile(video)}
                muted
                startFrom={sourceFrameCount - 1}
                playbackRate={-1}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Series.Sequence>
          </Series>
        </Loop>
      </AbsoluteFill>
    </Sequence>
  );
};
