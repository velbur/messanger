import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {useChatTypography} from "../TypographyContext";
import {CHAT_FONT_FAMILY} from "../fonts";
import {CENTER_SCREEN} from "../theme";
import {EmojiText} from "./EmojiText";

type Props = {
  text: string;
  revealFrame: number;
  emphasizeFinale?: boolean;
};

export const CenterScreenMessage: React.FC<Props> = ({
  text,
  revealFrame,
  emphasizeFinale = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const typography = useChatTypography();
  const caption = text.trim();
  if (!caption) {
    return null;
  }

  const localFrame = Math.max(0, frame - revealFrame);
  const enter = spring({
    frame: localFrame,
    fps,
    config: {damping: 22, stiffness: 120, mass: 0.9},
  });
  const opacity = interpolate(localFrame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const translateY = interpolate(enter, [0, 1], [24, 0]);
  const fontSize = emphasizeFinale
    ? Math.round(typography.messageFontSize * 1.08)
    : typography.messageFontSize;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${CENTER_SCREEN.paddingX}px`,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          maxWidth: CENTER_SCREEN.maxWidth,
          textAlign: "center",
          fontFamily: CHAT_FONT_FAMILY,
          fontSize,
          lineHeight: CENTER_SCREEN.lineHeight,
          fontWeight: 500,
          color: "#f3f6fa",
          textShadow: "0 2px 20px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 0, 0, 0.45)",
        }}
      >
        <EmojiText text={caption} />
      </div>
    </div>
  );
};
