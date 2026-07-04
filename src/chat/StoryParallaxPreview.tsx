import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {StorySceneImage} from "./components/StorySceneImage";

// Бамп маркера форсит пересборку бандла Remotion.
export const STORY_PARALLAX_PREVIEW_MARKER = "story-parallax-preview-v4";

void STORY_PARALLAX_PREVIEW_MARKER;

type Props = {
  image: string;
  animation: "kenburns" | "depthParallax";
  /** Длина превью в кадрах (совпадает с bake clip) */
  durationFrames?: number;
  /** Длина motion-loop в секундах (как в вебе) */
  motionLoopSec?: number;
};

/**
 * Превью для test:parallax. Делегирует РЕАЛЬНОМУ веб-компоненту StorySceneImage,
 * чтобы тест 1:1 совпадал с продакшеном: тот же parallax-clip, движение камеры,
 * оверлей атмосферных частиц и loop у Ken Burns. Никакой параллельной реализации.
 */
export const StoryParallaxPreview: React.FC<Props> = ({
  image,
  animation,
  durationFrames = 90,
  motionLoopSec = 3,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: "#000000", overflow: "hidden"}}>
      <StorySceneImage
        image={image.trim()}
        localFrame={frame}
        durationFrames={durationFrames}
        sceneStartFrame={0}
        animation={animation}
        motionLoopSec={motionLoopSec}
      />
    </AbsoluteFill>
  );
};
