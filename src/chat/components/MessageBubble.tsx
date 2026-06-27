import React from "react";
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useChatTheme} from "../ThemeContext";
import {useChatTypography} from "../TypographyContext";
import {CHAT, CHAT_OVERLAY, hexToRgba} from "../theme";
import {ReadReceiptIcon} from "./icons";
import {EmojiText} from "./EmojiText";
import {BubbleTail} from "./BubbleTail";

type Props = {
  text: string;
  image?: string;
  sentAt: string;
  author: "me" | "them";
  revealFrame: number;
  emphasizeFinale?: boolean;
  /** Компактные скруглённые пузыри для storyOverlay */
  variant?: "default" | "overlay";
};

const MetaRow: React.FC<{
  sentAt: string;
  isMe: boolean;
  compact?: boolean;
}> = ({sentAt, isMe, compact = false}) => {
  const theme = useChatTheme();
  const typography = useChatTypography();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: compact ? 4 : 6,
        minHeight: compact ? CHAT_OVERLAY.metaRowMinHeight : CHAT.metaRowMinHeight,
        marginTop: compact ? CHAT_OVERLAY.metaRowMarginTop : 4,
      }}
    >
      <span style={{fontSize: typography.messageTimeFontSize, color: theme.textMeta, lineHeight: 1}}>
        {sentAt}
      </span>
      {isMe ? <ReadReceiptIcon size={CHAT.readReceiptSize} color={theme.readReceipt} /> : null}
    </div>
  );
};

const TimeOverlay: React.FC<{sentAt: string; isMe: boolean}> = ({sentAt, isMe}) => {
  const theme = useChatTheme();
  const typography = useChatTypography();

  return (
    <div
      style={{
        position: "absolute",
        right: CHAT.imageBubblePadding,
        bottom: CHAT.imageBubblePadding,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: CHAT.imageTimeOverlayPadding,
        borderRadius: 14,
        background: CHAT.imageTimeOverlayBg,
      }}
    >
      <span
        style={{
          fontSize: typography.messageTimeFontSize,
          color: "#ffffff",
          lineHeight: 1,
        }}
      >
        {sentAt}
      </span>
      {isMe ? <ReadReceiptIcon size={CHAT.readReceiptSize} color={theme.readReceipt} /> : null}
    </div>
  );
};

export const MessageBubble: React.FC<Props> = ({
  text,
  image,
  sentAt,
  author,
  revealFrame,
  emphasizeFinale = false,
  variant = "default",
}) => {
  const compact = variant === "overlay";
  const bubbleStyle = compact ? CHAT_OVERLAY : CHAT;
  const theme = useChatTheme();
  const typography = useChatTypography();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const relative = frame - revealFrame;
  const isMe = author === "me";
  const solidBg = isMe ? theme.bubbleOutgoing : theme.bubbleIncoming;
  const bg = compact
    ? hexToRgba(solidBg, CHAT_OVERLAY.bubbleAlpha)
    : solidBg;
  const hasImage = Boolean(image);
  const caption = text.trim();
  const hasCaption = caption.length > 0;
  const textOnly = !hasImage && hasCaption;

  const progress = spring({
    frame: Math.max(0, relative),
    fps,
    config: {damping: 18, stiffness: 180, mass: 0.85},
  });

  const opacity = interpolate(relative, [-4, 0, 6], [0, 0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateX = (isMe ? 16 : -16) * (1 - progress);
  const finaleBoost = emphasizeFinale
    ? interpolate(relative, [0, 18, 45], [0, 0.04, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const scale = 0.92 + 0.08 * progress + finaleBoost;

  return (
    <div
      style={{
        position: "relative",
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: hasImage ? CHAT.imageMaxWidth : bubbleStyle.messageMaxWidth,
        marginBottom: bubbleStyle.bubbleMarginBottom,
        transform: `translateX(${translateX}px) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          background: bg,
          borderRadius: bubbleStyle.bubbleRadius,
          ...(compact
            ? {}
            : {
                borderTopLeftRadius: isMe ? CHAT.bubbleRadius : 5,
                borderTopRightRadius: isMe ? 5 : CHAT.bubbleRadius,
                borderBottomLeftRadius: isMe ? CHAT.bubbleRadius : 5,
                borderBottomRightRadius: isMe ? 5 : CHAT.bubbleRadius,
              }),
          padding: textOnly
            ? bubbleStyle.bubblePadding
            : hasImage
              ? CHAT.imageBubblePadding
              : bubbleStyle.bubblePadding,
          boxShadow: compact
            ? "0 2px 16px rgba(0, 0, 0, 0.22)"
            : theme.bubbleShadow,
          backdropFilter: compact ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
          WebkitBackdropFilter: compact ? `blur(${CHAT_OVERLAY.backdropBlur}px)` : undefined,
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <div style={{position: "relative", lineHeight: 0}}>
            <Img
              src={staticFile(image!)}
              style={{
                display: "block",
                width: "100%",
                maxWidth: CHAT.imageMaxWidth,
                maxHeight: CHAT.imageMaxHeight,
                objectFit: "cover",
                borderRadius: CHAT.imageInnerRadius,
              }}
            />
            {!hasCaption ? <TimeOverlay sentAt={sentAt} isMe={isMe} /> : null}
          </div>
        ) : null}

        {hasCaption ? (
          <div style={{padding: hasImage ? CHAT.imageCaptionPadding : 0}}>
            <EmojiText
              text={caption}
              style={{
                fontSize: typography.messageFontSize,
                lineHeight: CHAT.messageLineHeight,
                color: theme.textPrimary,
                display: "block",
              }}
            />
            <MetaRow sentAt={sentAt} isMe={isMe} compact={compact} />
          </div>
        ) : null}
      </div>
      {compact ? null : <BubbleTail side={isMe ? "right" : "left"} color={bg} />}
    </div>
  );
};
