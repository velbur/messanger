import React from "react";
import {Img, staticFile} from "remotion";
import type {StorySceneAnimation} from "../story";
import {KenBurnsImage} from "./KenBurnsImage";
import {StorySceneVideo} from "./StorySceneVideo";

type Props = {
  image?: string;
  video?: string;
  videoDurationMs?: number;
  localFrame: number;
  durationFrames: number;
  sceneStartFrame: number;
  animation: StorySceneAnimation;
};

export const StorySceneImage: React.FC<Props> = ({
  image,
  video,
  videoDurationMs,
  localFrame,
  durationFrames,
  sceneStartFrame,
  animation,
}) => {
  if (animation === "video" && video?.trim()) {
    return (
      <StorySceneVideo
        video={video.trim()}
        videoDurationMs={videoDurationMs}
        sceneStartFrame={sceneStartFrame}
        sceneDurationFrames={durationFrames}
      />
    );
  }

  if (image?.trim()) {
    if (animation === "none") {
      return (
        <KenBurnsImage
          image={image.trim()}
          localFrame={localFrame}
          durationFrames={durationFrames}
          animation="none"
          loop
        />
      );
    }

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
