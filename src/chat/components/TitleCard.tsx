import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";
import {CHROME} from "../theme";

const T = CHROME.titleCard;

type Props = {
  text: string;
  startFrame: number;
  durationFrames: number;
};

export const TitleCard: React.FC<Props> = ({text, startFrame, durationFrames}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  if (local < 0 || local >= durationFrames) {
    return null;
  }

  const fadeIn = Math.min(18, Math.max(6, Math.floor(durationFrames * 0.06)));
  const fadeOutStart = durationFrames - fadeIn;
  const opacity = interpolate(
    local,
    [0, fadeIn, fadeOutStart, durationFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <AbsoluteFill
      style={{
        zIndex: 30,
        pointerEvents: "none",
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <p
        style={{
          margin: 0,
          padding: `0 ${T.paddingX}px`,
          maxWidth: "100%",
          fontFamily: CHAT_FONT_FAMILY,
          fontSize: T.fontSize,
          fontWeight: 600,
          color: "#FFFFFF",
          lineHeight: T.lineHeight,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
};
