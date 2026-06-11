import React from "react";
import {AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";

type Props = {
  image: string;
  durationFrames: number;
};

const FullscreenImageLayer: React.FC<Props> = ({image, durationFrames}) => {
  const frame = useCurrentFrame();

  const fade = Math.min(10, Math.max(4, Math.floor(durationFrames * 0.08)));
  const fadeOutStart = durationFrames - fade;
  const opacity = interpolate(
    frame,
    [0, fade, fadeOutStart, durationFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <AbsoluteFill
      style={{
        zIndex: 25,
        pointerEvents: "none",
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <Img
        src={staticFile(image)}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
};

type SequenceProps = Props & {
  startFrame: number;
};

export const FullscreenImage: React.FC<SequenceProps> = ({image, startFrame, durationFrames}) => {
  if (durationFrames <= 0) {
    return null;
  }

  return (
    <Sequence from={startFrame} durationInFrames={durationFrames} layout="none">
      <FullscreenImageLayer image={image} durationFrames={durationFrames} />
    </Sequence>
  );
};
