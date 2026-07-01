import React from "react";
import {AbsoluteFill} from "remotion";
import {StorySceneVideo} from "./components/StorySceneVideo";
import {storyVideoPathForImage} from "./story-video-paths";

export const STORY_VIDEO_PARALLAX_PREVIEW_MARKER = "story-video-parallax-preview-v9";

void STORY_VIDEO_PARALLAX_PREVIEW_MARKER;

type Props = {
  image: string;
  videoDurationMs?: number;
  /** Длина всего превью: Veo + parallax (кадры композиции) */
  durationFrames?: number;
};

/** Превью гибрида: 4 с Veo → depth parallax до конца сцены */
export const StoryVideoParallaxPreview: React.FC<Props> = ({
  image,
  videoDurationMs = 4000,
  durationFrames = 300,
}) => {
  const trimmed = image.trim();
  const video = storyVideoPathForImage(trimmed);

  return (
    <AbsoluteFill style={{backgroundColor: "#000000", overflow: "hidden"}}>
      <StorySceneVideo
        video={video}
        image={trimmed}
        videoDurationMs={videoDurationMs}
        sceneStartFrame={0}
        sceneDurationFrames={durationFrames}
        fallbackAnimation="depthParallax"
      />
    </AbsoluteFill>
  );
};
