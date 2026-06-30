import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";
import {VIDEO_LAYOUT} from "../theme";
import {EmojiText} from "./EmojiText";

type Props = {
  text: string;
  author: "me" | "them";
  speakerLabel: string;
  revealFrame: number;
  emphasizeFinale?: boolean;
};

export const NarrationBeat: React.FC<Props> = ({
  text,
  author,
  speakerLabel,
  revealFrame,
  emphasizeFinale = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
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
  const translateY = interpolate(enter, [0, 1], [28, 0]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${VIDEO_LAYOUT.narrationPaddingX}px`,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          maxWidth: VIDEO_LAYOUT.narrationMaxWidth,
          textAlign: "center",
        }}
      >
        {speakerLabel ? (
          <div
            style={{
              fontSize: VIDEO_LAYOUT.narrationAuthorSize,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: author === "me" ? "#7dd3c0" : "#94a8c4",
              marginBottom: VIDEO_LAYOUT.narrationAuthorGap,
            }}
          >
            {speakerLabel}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: CHAT_FONT_FAMILY,
            fontSize: emphasizeFinale
              ? Math.round(VIDEO_LAYOUT.narrationFontSize * 1.08)
              : VIDEO_LAYOUT.narrationFontSize,
            lineHeight: VIDEO_LAYOUT.narrationLineHeight,
            fontWeight: 500,
            color: "#f3f6fa",
            textShadow: "0 2px 24px rgba(0, 0, 0, 0.45)",
          }}
        >
          <EmojiText text={text} />
        </div>
      </div>
    </div>
  );
};
