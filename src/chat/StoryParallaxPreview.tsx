import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {DepthParallaxImage} from "./components/DepthParallaxImage";
import {KenBurnsImage} from "./components/KenBurnsImage";
import {storyParallaxVideoPath} from "./story-depth-paths";
import {storyMotionLoopFrames} from "./story-motion";

export const STORY_PARALLAX_PREVIEW_MARKER = "story-parallax-preview-v2";

void STORY_PARALLAX_PREVIEW_MARKER;

type Props = {
  image: string;
  animation: "kenburns" | "depthParallax";
  motionLoopSec?: number;
};

export const StoryParallaxPreview: React.FC<Props> = ({
  image,
  animation,
  motionLoopSec = 3,
}) => {
  const frame = useCurrentFrame();
  const trimmed = image.trim();
  const loopFrames = storyMotionLoopFrames(motionLoopSec);

  return (
    <AbsoluteFill style={{backgroundColor: "#000000", overflow: "hidden"}}>
      {animation === "kenburns" ? (
        <KenBurnsImage
          image={trimmed}
          localFrame={frame}
          durationFrames={loopFrames}
          animation="kenburns"
          loop
          loopFrames={loopFrames}
        />
      ) : (
        <DepthParallaxImage video={storyParallaxVideoPath(trimmed)} loopFrames={loopFrames} />
      )}
    </AbsoluteFill>
  );
};
