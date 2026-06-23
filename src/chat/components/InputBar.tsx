import React from "react";
import {useCurrentFrame} from "remotion";
import {TEXT_FONT_FAMILY} from "../fonts";
import {useChatTheme} from "../ThemeContext";
import {CHROME, LAYOUT} from "../theme";
import {MicIcon, PlusIcon, SendIcon, SmileIcon} from "./icons";

type Props = {
  typedText: string;
  placeholder?: string;
};

const I = CHROME.input;

export const InputBar: React.FC<Props> = ({typedText, placeholder = "Сообщение"}) => {
  const theme = useChatTheme();
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 25) % 2 === 0;
  const hasText = typedText.length > 0;

  return (
    <div
      style={{
        minHeight: LAYOUT.inputBarH,
        flexShrink: 0,
        background: theme.inputBarBg,
        padding: I.padding,
        display: "flex",
        alignItems: "center",
        gap: I.gap,
      }}
    >
      <div
        style={{
          width: I.plusBtn,
          height: I.plusBtn,
          borderRadius: I.plusBtn / 2,
          border: `${I.plusBorder}px solid ${theme.inputIcon}`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <PlusIcon size={I.plusIcon} color={theme.inputIcon} variant="css" />
      </div>

      <div
        style={{
          flex: 1,
          borderRadius: I.fieldRadius,
          background: theme.inputFieldBg,
          minHeight: I.fieldMinH,
          display: "flex",
          alignItems: "center",
          padding: `0 ${I.fieldPaddingX}px`,
          gap: I.fieldGap,
          boxShadow: "0 1px 2px rgba(11, 20, 26, 0.08)",
        }}
      >
        <SmileIcon size={I.fieldIcon} color={theme.inputIcon} strokeWidth={I.smileIconStroke} />
        <span
          style={{
            flex: 1,
            fontFamily: TEXT_FONT_FAMILY,
            fontSize: I.textFontSize,
            color: hasText ? theme.textPrimary : theme.inputPlaceholder,
            lineHeight: 1.28,
          }}
        >
          {typedText || placeholder}
        </span>
        {hasText ? (
          <span style={{opacity: blink ? 1 : 0, fontFamily: TEXT_FONT_FAMILY, color: theme.textPrimary}}>
            |
          </span>
        ) : null}
      </div>

      <div
        style={{
          width: I.actionSlot,
          height: I.actionSlot,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {hasText ? (
          <SendIcon size={I.sendBtn} variant="circle" />
        ) : (
          <MicIcon size={I.fieldIcon} color={theme.inputIcon} strokeWidth={I.fieldIconStroke} />
        )}
      </div>
    </div>
  );
};
