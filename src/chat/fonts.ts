import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {loadFont as loadNotoColorEmoji} from "@remotion/google-fonts/NotoColorEmoji";

const fontOptions = {ignoreTooManyRequestsWarning: true} as const;

loadInter("normal", {
  ...fontOptions,
  weights: ["400", "600", "700"],
  subsets: ["latin", "cyrillic"],
});

// Цветные emoji (иначе в headless Linux — пустые квадраты □)
loadNotoColorEmoji("normal", {
  ...fontOptions,
  weights: ["400"],
  subsets: ["emoji"],
});

export const TEXT_FONT_FAMILY = '"Inter", sans-serif';
export const EMOJI_FONT_FAMILY = '"Noto Color Emoji"';
/** Общий fallback (шапка и т.п.) */
export const CHAT_FONT_FAMILY = `${TEXT_FONT_FAMILY}, ${EMOJI_FONT_FAMILY}, sans-serif`;
