import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";

type Props = {
  image: string;
  title: string;
};

/**
 * Статичная «обложка»: цепляющий кадр на весь экран + крупное название ролика.
 * Используется и как отдельная композиция для запекания PNG (renderStill),
 * и как картинка, которая потом вшивается в конец видео.
 */
export const PreviewCoverArt: React.FC<Props> = ({image, title}) => {
  const ref = image.trim();
  const text = title.trim();

  return (
    <AbsoluteFill style={{backgroundColor: "#000000"}}>
      {ref ? (
        <Img
          src={staticFile(ref)}
          style={{width: "100%", height: "100%", objectFit: "cover"}}
        />
      ) : null}

      {/* Лёгкое затемнение по краям — текст по центру читается на любом фоне */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      {text ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
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
              paintOrder: "stroke fill",
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

export const PREVIEW_COVER_ART_MARKER = "preview-cover-art-v2";
