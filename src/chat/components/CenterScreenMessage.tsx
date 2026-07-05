import React, {useMemo} from "react";
import {Easing, interpolate, useCurrentFrame} from "remotion";
import {useChatTypography} from "../TypographyContext";
import {CENTER_SCREEN_FONT} from "../fonts";
import {CENTER_SCREEN} from "../theme";
import {EmojiText} from "./EmojiText";

type Props = {
  text: string;
  revealFrame: number;
  voiceDurationFrames?: number;
  emphasizeFinale?: boolean;
};

const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);

const resolveVisibleStep = (
  words: string[],
  localFrame: number,
  durationFrames: number,
) => {
  const wordsPerStep = CENTER_SCREEN.wordsPerStep;
  const numPairs = Math.max(1, Math.ceil(words.length / wordsPerStep));
  const duration =
    durationFrames > 0 ? durationFrames : numPairs * CENTER_SCREEN.framesPerPairFallback;
  const progress = Math.min(1, Math.max(0, localFrame / duration));
  const pairIndex = Math.min(numPairs - 1, Math.floor(progress * numPairs));
  const start = pairIndex * wordsPerStep;
  const visibleText = words.slice(start, start + wordsPerStep).join(" ");
  const pairStartFrame = (pairIndex / numPairs) * duration;
  const fadeIn = localFrame - pairStartFrame;
  const opacity =
    pairIndex === 0 && fadeIn < 4
      ? interpolate(fadeIn, [0, 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : fadeIn < 3
        ? interpolate(fadeIn, [0, 2], [0.15, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 1;

  return {visibleText, opacity};
};

export const CenterScreenMessage: React.FC<Props> = ({
  text,
  revealFrame,
  voiceDurationFrames = 0,
  emphasizeFinale = false,
}) => {
  const frame = useCurrentFrame();
  const typography = useChatTypography();
  const words = useMemo(() => splitWords(text), [text]);
  if (!words.length) {
    return null;
  }

  const localFrame = Math.max(0, frame - revealFrame);
  const {visibleText, opacity: stepOpacity} = resolveVisibleStep(
    words,
    localFrame,
    voiceDurationFrames,
  );

  const enterOpacity = interpolate(localFrame, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = enterOpacity * stepOpacity;

  const fontSize = emphasizeFinale
    ? Math.round(typography.messageFontSize * CENTER_SCREEN.fontScale * 1.06)
    : Math.round(typography.messageFontSize * CENTER_SCREEN.fontScale);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: `0 ${CENTER_SCREEN.paddingX}px`,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: CENTER_SCREEN.maxWidth,
          padding: `${CENTER_SCREEN.platePaddingY}px ${CENTER_SCREEN.platePaddingX}px`,
          borderRadius: CENTER_SCREEN.plateRadius,
          background: CENTER_SCREEN.plateBg,
          border: `1px solid ${CENTER_SCREEN.plateBorder}`,
          backdropFilter: `blur(${CENTER_SCREEN.plateBlur}px)`,
          WebkitBackdropFilter: `blur(${CENTER_SCREEN.plateBlur}px)`,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.22)",
          textAlign: "center",
          fontFamily: CENTER_SCREEN_FONT,
          fontSize,
          lineHeight: CENTER_SCREEN.lineHeight,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "#f8fafc",
        }}
      >
        <EmojiText text={visibleText} />
      </div>
    </div>
  );
};
