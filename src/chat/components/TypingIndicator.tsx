import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {useChatTheme} from "../ThemeContext";
import {CHAT, CHAT_OVERLAY, CHROME, S, hexToRgba} from "../theme";
import {BubbleTail} from "./BubbleTail";

const T = CHROME.typing;

export const TypingIndicator: React.FC<{variant?: "default" | "overlay"}> = ({variant = "default"}) => {
  const theme = useChatTheme();
  const frame = useCurrentFrame();
  const compact = variant === "overlay";
  const typingBg = compact
    ? hexToRgba(theme.bubbleIncoming, CHAT_OVERLAY.bubbleAlpha)
    : theme.bubbleIncoming;

  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        marginBottom: compact ? CHAT_OVERLAY.bubbleMarginBottom : CHAT.bubbleMarginBottom,
      }}
    >
      <div
        style={{
          background: typingBg,
          borderRadius: compact ? CHAT_OVERLAY.bubbleRadius : T.borderRadius,
          ...(compact
            ? {}
            : {
                borderTopLeftRadius: 5,
                borderBottomLeftRadius: 5,
              }),
          padding: compact ? `${S(12)}px ${S(16)}px` : T.padding,
          minWidth: compact ? S(56) : T.minWidth,
          display: "flex",
          alignItems: "center",
          gap: T.gap,
          boxShadow: compact ? "0 2px 16px rgba(0, 0, 0, 0.22)" : theme.bubbleShadow,
          backdropFilter: compact ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
          WebkitBackdropFilter: compact ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
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
                width: T.dotSize,
                height: T.dotSize,
                borderRadius: T.dotSize / 2,
                background: theme.typingDot,
                transform: `scale(${scale})`,
              }}
            />
          );
        })}
      </div>
      {compact ? null : <BubbleTail side="left" color={typingBg} />}
    </div>
  );
};
