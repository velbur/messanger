import React from "react";
import {AbsoluteFill, Loop, OffthreadVideo, Sequence, staticFile} from "remotion";
import {msToFrames} from "../fps";

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
  const videoDurationFrames = Math.max(1, msToFrames(videoDurationMs ?? 4000));

  return (
    <Sequence from={sceneStartFrame} durationInFrames={sceneDurationFrames} layout="none">
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <Loop durationInFrames={videoDurationFrames} layout="none">
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
