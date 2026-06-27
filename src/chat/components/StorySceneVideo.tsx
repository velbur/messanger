import React from "react";
import {AbsoluteFill, Sequence, staticFile, Video} from "remotion";

type Props = {
  video: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
};

export const StorySceneVideo: React.FC<Props> = ({
  video,
  sceneStartFrame,
  sceneDurationFrames,
}) => {
  return (
    <Sequence from={sceneStartFrame} durationInFrames={sceneDurationFrames} layout="none">
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <Video
          src={staticFile(video)}
          muted
          loop
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
