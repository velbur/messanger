import React from "react";
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";

type Props = {
  image: string;
  title: string;
  startFrame: number;
  durationFrames: number;
};

/**
 * Обложка-превью: цепляющий кадр на весь экран + крупное название ролика.
 * Вшивается в самый конец видео, чтобы при публикации на YouTube можно было
 * вручную выбрать этот кадр как превью.
 */
export const PreviewCover: React.FC<Props> = ({image, title, startFrame, durationFrames}) => {
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
  // Лёгкий наезд, чтобы кадр «дышал» и не выглядел вклеенным стопом
  const scale = interpolate(local, [0, durationFrames], [1.04, 1.09], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const text = title.trim();

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

      {/* Затемнение сверху/снизу — текст читается на любом фоне */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.12) 26%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {text ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: 150,
            paddingLeft: 72,
            paddingRight: 72,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: CHAT_FONT_FAMILY,
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              lineHeight: 1.04,
              textAlign: "center",
              textTransform: "uppercase",
              color: "#FFFFFF",
              WebkitTextStroke: "3px rgba(0,0,0,0.55)",
              textShadow:
                "0 6px 22px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            {text}
          </p>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
