import React from "react";
import {AbsoluteFill, OffthreadVideo, staticFile} from "remotion";

type Props = {
  /** Путь к запечённому parallax-clip (.parallax.mp4) */
  video: string;
};

/**
 * Настоящий depth-parallax (3D-photo): загодя запечённый clip из одной
 * картинки + depth-карты. Проигрывается один раз на длину сцены — без loop.
 */
export const DepthParallaxImage: React.FC<Props> = ({video}) => (
  <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#050505"}}>
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
  </AbsoluteFill>
);
