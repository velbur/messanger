import React from "react";
import {AbsoluteFill, Freeze, OffthreadVideo, staticFile} from "remotion";
import {msToFrames} from "../fps";

type Props = {
  video: string;
  localFrame: number;
  videoDurationMs?: number;
};

export const StorySceneVideo: React.FC<Props> = ({video, localFrame, videoDurationMs}) => {
  const videoDurationFrames = videoDurationMs ? Math.max(1, msToFrames(videoDurationMs)) : undefined;
  const frame =
    videoDurationFrames && videoDurationFrames > 0
      ? localFrame % videoDurationFrames
      : localFrame;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
      <Freeze frame={frame}>
        <OffthreadVideo
          src={staticFile(video)}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Freeze>
    </AbsoluteFill>
  );
};
