import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {DepthParallaxImage} from "./components/DepthParallaxImage";
import {KenBurnsImage} from "./components/KenBurnsImage";
import {storyParallaxVideoPath} from "./story-depth-paths";

export const STORY_PARALLAX_PREVIEW_MARKER = "story-parallax-preview-v3";

void STORY_PARALLAX_PREVIEW_MARKER;

type Props = {
  image: string;
  animation: "kenburns" | "depthParallax";
  /** Длина превью в кадрах (совпадает с bake clip) */
  durationFrames?: number;
};

export const StoryParallaxPreview: React.FC<Props> = ({
  image,
  animation,
  durationFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const trimmed = image.trim();

  return (
    <AbsoluteFill style={{backgroundColor: "#000000", overflow: "hidden"}}>
      {animation === "kenburns" ? (
        <KenBurnsImage
          image={trimmed}
          localFrame={frame}
          durationFrames={durationFrames}
          animation="kenburns"
        />
      ) : (
        <DepthParallaxImage
          video={storyParallaxVideoPath(trimmed)}
          sceneStartFrame={0}
          durationFrames={durationFrames}
        />
      )}
    </AbsoluteFill>
  );
};
