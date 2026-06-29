import React from "react";
import {AbsoluteFill, Loop, OffthreadVideo, staticFile} from "remotion";
import {STORY_MOTION_LOOP_FRAMES} from "../story-motion";

type Props = {
  /** Путь к запечённому seamless parallax-loop (.parallax.mp4) */
  video: string;
  /** Длина запечённого цикла в кадрах (по умолчанию 3 с) */
  loopFrames?: number;
};

/**
 * Настоящий depth-parallax (3D-photo): загодя запечённый seamless-loop из одной
 * картинки + depth-карты (inpainted-фон, по-пиксельное смещение по глубине).
 * Здесь просто крутим его на петле — без WebGL, рендер быстрый.
 */
export const DepthParallaxImage: React.FC<Props> = ({
  video,
  loopFrames = STORY_MOTION_LOOP_FRAMES,
}) => (
  <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#050505"}}>
    <Loop durationInFrames={Math.max(2, loopFrames)}>
      <OffthreadVideo
        src={staticFile(video)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: "center center",
        }}
      />
    </Loop>
  </AbsoluteFill>
);
