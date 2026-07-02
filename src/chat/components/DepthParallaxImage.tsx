import React from "react";
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile} from "remotion";

type Props = {
  /** Путь к запечённому parallax-clip (.parallax.mp4) */
  video: string;
  /** Кадр композиции, с которого начинается сцена */
  sceneStartFrame: number;
  /** Длина сцены в кадрах (должна совпадать с bake clip) */
  durationFrames: number;
  /** Монтировать заранее для декодирования до появления */
  premountFor?: number;
};

/**
 * Depth-parallax: запечённый clip проигрывается с начала каждой сцены
 * (Sequence), а не с глобального кадра 0 — иначе parallax есть только на opening.
 */
export const DepthParallaxImage: React.FC<Props> = ({
  video,
  sceneStartFrame,
  durationFrames,
  premountFor = 0,
}) => (
  <Sequence
    from={sceneStartFrame}
    durationInFrames={Math.max(1, durationFrames)}
    premountFor={Math.max(0, premountFor)}
    layout="none"
  >
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
  </Sequence>
);
