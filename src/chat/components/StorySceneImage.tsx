import React from "react";
import {Img, staticFile} from "remotion";
import type {StorySceneAnimation} from "../story";
import {StorySceneVideo} from "./StorySceneVideo";

type Props = {
  image?: string;
  video?: string;
  videoDurationMs?: number;
  localFrame: number;
  durationFrames: number;
  animation: StorySceneAnimation;
};

export const StorySceneImage: React.FC<Props> = ({
  image,
  video,
  videoDurationMs,
  localFrame,
  animation,
}) => {
  if (animation === "video" && video?.trim()) {
    return (
      <StorySceneVideo
        video={video.trim()}
        localFrame={localFrame}
        videoDurationMs={videoDurationMs}
      />
    );
  }

  if (animation === "none" && image?.trim()) {
    return (
      <Img
        src={staticFile(image.trim())}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }

  return null;
};
