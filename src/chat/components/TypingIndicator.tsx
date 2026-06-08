import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {useChatTheme} from "../ThemeContext";
import {CHAT, CHROME} from "../theme";

const T = CHROME.typing;
import {BubbleTail} from "./BubbleTail";

export const TypingIndicator: React.FC = () => {
  const theme = useChatTheme();
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        marginBottom: CHAT.bubbleMarginBottom,
      }}
    >
      <div
        style={{
          background: theme.bubbleIncoming,
          borderRadius: T.borderRadius,
          borderTopLeftRadius: 5,
          borderBottomLeftRadius: 5,
          padding: T.padding,
          minWidth: T.minWidth,
          display: "flex",
          alignItems: "center",
          gap: T.gap,
          boxShadow: theme.bubbleShadow,
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
      <BubbleTail side="left" color={theme.bubbleIncoming} />
    </div>
  );
};
