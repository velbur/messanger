import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";

const HOOK_DURATION_FRAMES = 54;

type Props = {
  text: string;
};

export const HookOverlay: React.FC<Props> = ({text}) => {
  const frame = useCurrentFrame();
  const caption = text.trim();
  if (!caption || frame >= HOOK_DURATION_FRAMES) {
    return null;
  }

  const opacity = interpolate(frame, [0, 8, HOOK_DURATION_FRAMES - 10, HOOK_DURATION_FRAMES], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 15,
        pointerEvents: "none",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 168,
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      <div
        style={{
          opacity,
          maxWidth: "100%",
          padding: "14px 22px",
          borderRadius: 16,
          background: "rgba(11, 20, 26, 0.78)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
        }}
      >
        <span
          style={{
            fontFamily: CHAT_FONT_FAMILY,
            fontSize: 34,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
            textAlign: "center",
            display: "block",
          }}
        >
          {caption}
        </span>
      </div>
    </AbsoluteFill>
  );
};
