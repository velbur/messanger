import React from "react";
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from "remotion";

type Props = {
  image: string;
  startFrame: number;
  durationFrames: number;
};

/**
 * Обложка-превью в конце видео. Название уже запечено в картинку
 * (renderStill композиции PreviewCover), поэтому здесь только показываем
 * готовый кадр с лёгким наездом и плавным появлением.
 */
export const PreviewCover: React.FC<Props> = ({image, startFrame, durationFrames}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  if (local < 0 || local >= durationFrames) {
    return null;
  }

  const ref = image.trim();
  if (!ref) {
    return null;
  }

  const fadeIn = Math.min(10, Math.max(4, Math.floor(durationFrames * 0.12)));
  const opacity = interpolate(local, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(local, [0, durationFrames], [1.04, 1.09], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{zIndex: 40, pointerEvents: "none", backgroundColor: "#000000", opacity}}>
      <AbsoluteFill style={{overflow: "hidden"}}>
        <Img
          src={staticFile(ref)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
