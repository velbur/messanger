import React from "react";
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from "remotion";
import {storyVideoPingPongSourceFrame} from "../story-motion";

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
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - sceneStartFrame);
  const sourceFrame = storyVideoPingPongSourceFrame(localFrame, videoDurationMs);

  return (
    <Sequence from={sceneStartFrame} durationInFrames={sceneDurationFrames} layout="none">
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <OffthreadVideo
          src={staticFile(video)}
          muted
          startFrom={sourceFrame}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    </Sequence>
  );
};
