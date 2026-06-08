import React from "react";
import {EMOJI_FONT_FAMILY, TEXT_FONT_FAMILY} from "../fonts";

const emojiSegment =
  /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

const normalizeText = (text: string): string =>
  text
    // × часто не попадает в subset Inter → «□»
    .replace(/\u00D7/g, "x")
    // одиночный VS16 без глифа в Inter → «□»
    .replace(/\uFE0F/g, "");

export const splitTextAndEmoji = (text: string): Array<{kind: "text" | "emoji"; value: string}> => {
  const normalized = normalizeText(text);
  const parts: Array<{kind: "text" | "emoji"; value: string}> = [];
  let lastIndex = 0;

  for (const match of normalized.matchAll(emojiSegment)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({kind: "text", value: normalized.slice(lastIndex, index)});
    }
    parts.push({kind: "emoji", value: match[0]});
    lastIndex = index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    parts.push({kind: "text", value: normalized.slice(lastIndex)});
  }

  return parts.length > 0 ? parts : [{kind: "text", value: normalized}];
};

type Props = {
  text: string;
  style?: React.CSSProperties;
};

/** Текст и emoji разными шрифтами — без «□» из-за Inter */
export const EmojiText: React.FC<Props> = ({text, style}) => {
  const parts = splitTextAndEmoji(text);

  return (
    <span style={{whiteSpace: "pre-wrap", ...style}}>
      {parts.map((part, index) =>
        part.kind === "emoji" ? (
          <span
            key={`e-${index}`}
            style={{
              fontFamily: EMOJI_FONT_FAMILY,
              fontSize: style?.fontSize,
              lineHeight: style?.lineHeight,
            }}
          >
            {part.value}
          </span>
        ) : (
          <span key={`t-${index}`} style={{fontFamily: TEXT_FONT_FAMILY}}>
            {part.value}
          </span>
        ),
      )}
    </span>
  );
};
