import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";
import {CHROME} from "../theme";

const O = CHROME.outro;

const YT_RED = "#FF0000";
const YT_RED_DARK = "#CC0000";

const YoutubePlayIcon: React.FC<{size: number}> = ({size}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    style={{flexShrink: 0}}
  >
    <path
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8z"
      fill="#FFFFFF"
    />
    <path d="M9.75 15.02l6.5-3.52-6.5-3.52v7.04z" fill={YT_RED_DARK} />
  </svg>
);

type Props = {
  startFrame: number;
  text: string;
};

export const SubscribeOutro: React.FC<Props> = ({startFrame, text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - startFrame;

  if (local < 0) {
    return null;
  }

  const overlayOpacity = interpolate(local, [0, 22], [0, 0.52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pop = spring({
    frame: local,
    fps,
    config: {damping: 13, stiffness: 140, mass: 0.85},
  });

  const scale = interpolate(pop, [0, 1], [0.55, 1]);
  const cardOpacity = interpolate(local, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulse =
    local > 36
      ? 1 + Math.sin((local - 36) / (fps * 0.55)) * 0.035
      : 1;

  const shimmer = interpolate(
    (local % Math.round(fps * 1.8)) / (fps * 1.8),
    [0, 0.5, 1],
    [0.92, 1, 0.92],
  );

  const glowSpread = 18 + 14 * shimmer * pulse;
  const glowAlpha = 0.35 + 0.25 * shimmer;

  return (
    <AbsoluteFill
      style={{
        zIndex: 20,
        pointerEvents: "none",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(11, 20, 26, ${overlayOpacity})`,
          backdropFilter: overlayOpacity > 0.1 ? "blur(6px)" : undefined,
        }}
      />

      <div
        style={{
          opacity: cardOpacity,
          transform: `scale(${scale * pulse})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: O.iconGap,
            padding: O.buttonPadding,
            borderRadius: 9999,
            background: `linear-gradient(180deg, ${YT_RED} 0%, ${YT_RED_DARK} 100%)`,
            boxShadow: [
              `0 ${Math.round(10 * shimmer)}px ${Math.round(28 * shimmer)}px rgba(204, 0, 0, ${glowAlpha})`,
              `0 0 ${Math.round(glowSpread)}px rgba(255, 60, 60, ${0.55 * shimmer})`,
              "0 2px 0 rgba(255,255,255,0.25) inset",
              "0 -2px 0 rgba(0,0,0,0.15) inset",
            ].join(", "),
          }}
        >
          <YoutubePlayIcon size={O.iconSize} />
          <span
            style={{
              fontFamily: CHAT_FONT_FAMILY,
              fontSize: O.fontSize,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: 0.3,
              lineHeight: 1.1,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
