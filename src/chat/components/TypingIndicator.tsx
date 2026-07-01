import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {useChatTheme} from "../ThemeContext";
import {CHAT, CHAT_OVERLAY, CHROME, S, hexToRgba} from "../theme";
import {BubbleTail} from "./BubbleTail";

const T = CHROME.typing;

export const TypingIndicator: React.FC<{variant?: "default" | "overlay" | "center"}> = ({
  variant = "default",
}) => {
  const theme = useChatTheme();
  const frame = useCurrentFrame();
  const compact = variant === "overlay";
  const centered = variant === "center";
  const typingBg = centered
    ? "rgba(11, 20, 26, 0.55)"
    : compact
      ? hexToRgba(theme.bubbleIncoming, CHAT_OVERLAY.bubbleAlpha)
      : theme.bubbleIncoming;
  const dotSize = centered ? S(18) : T.dotSize;
  const gap = centered ? S(12) : T.gap;

  const bubble = (
    <div
      style={{
        background: typingBg,
        borderRadius: centered ? S(28) : compact ? CHAT_OVERLAY.bubbleRadius : T.borderRadius,
        ...(compact || centered
          ? {}
          : {
              borderTopLeftRadius: 5,
              borderBottomLeftRadius: 5,
            }),
        padding: centered
          ? `${S(22)}px ${S(28)}px`
          : compact
            ? `${S(12)}px ${S(16)}px`
            : T.padding,
        minWidth: centered ? S(96) : compact ? S(56) : T.minWidth,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        boxShadow: centered
          ? "0 4px 28px rgba(0, 0, 0, 0.35)"
          : compact
            ? "0 2px 16px rgba(0, 0, 0, 0.22)"
            : theme.bubbleShadow,
        backdropFilter: compact || centered ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
        WebkitBackdropFilter: compact || centered ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
      }}
    >
      {[0, 1, 2].map((dot) => {
        const local = (frame + dot * 6) % 36;
        const scale = interpolate(local, [0, 12, 24, 36], [0.55, 1, 0.65, 0.55], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={dot}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              background: centered ? "#e9edef" : theme.typingDot,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </div>
  );

  if (centered) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {bubble}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        marginBottom: compact ? CHAT_OVERLAY.bubbleMarginBottom : CHAT.bubbleMarginBottom,
      }}
    >
      {bubble}
      {compact ? null : <BubbleTail side="left" color={typingBg} />}
    </div>
  );
};
