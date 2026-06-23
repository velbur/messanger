/** Встроенные shortcodes вида :smile: */
export const EMOJI_SHORTCODES: Record<string, string> = {
  smile: "😊",
  grin: "😁",
  laugh: "😂",
  rofl: "🤣",
  wink: "😉",
  blush: "😊",
  heart: "❤️",
  heart_eyes: "😍",
  kiss: "😘",
  thumbsup: "👍",
  thumbsdown: "👎",
  clap: "👏",
  wave: "👋",
  ok: "👌",
  fire: "🔥",
  star: "⭐",
  party: "🎉",
  tada: "🎉",
  rocket: "🚀",
  check: "✅",
  cross: "❌",
  warning: "⚠️",
  question: "❓",
  exclamation: "❗",
  thinking: "🤔",
  cry: "😢",
  sob: "😭",
  angry: "😠",
  cool: "😎",
  sweat: "😅",
  pleading: "🥺",
  eyes: "👀",
  muscle: "💪",
  pray: "🙏",
  hundred: "💯",
  movie: "🎬",
  camera: "📷",
  phone: "📱",
  mail: "✉️",
  bell: "🔔",
  clock: "⏰",
  sun: "☀️",
  moon: "🌙",
  coffee: "☕",
  beer: "🍺",
  pizza: "🍕",
  cake: "🎂",
  gift: "🎁",
  money: "💰",
  chart: "📈",
  pin: "📌",
  link: "🔗",
};

/** Текстовые аналоги (ASCII-смайлы) */
export const EMOJI_TEXT_EQUIVALENTS: Record<string, string> = {
  ":-)": "🙂",
  ":)": "🙂",
  "=)": "🙂",
  ":-(": "🙁",
  ":(": "🙁",
  "=(": "🙁",
  ":-D": "😄",
  ":D": "😄",
  "=D": "😄",
  ":-P": "😛",
  ":P": "😛",
  ";-)": "😉",
  ";)": "😉",
  ":-o": "😮",
  ":o": "😮",
  ":-/": "😕",
  ":/": "😕",
  ":'(": "😢",
  "<3": "❤️",
  "</3": "💔",
  ":*": "😘",
  ":-*": "😘",
  "O:)": "😇",
  ">:(": "😠",
  ":-|": "😐",
  ":|": "😐",
};

const shortcodePattern = /:([a-zA-Z0-9_+-]+):/g;

const textEquivalentEntries = Object.entries(EMOJI_TEXT_EQUIVALENTS).sort(
  (a, b) => b[0].length - a[0].length,
);

const lookupShortcode = (
  code: string,
  custom?: Record<string, string>,
): string | undefined => {
  const key = code.toLowerCase();
  return custom?.[key] ?? EMOJI_SHORTCODES[key];
};

/** Заменяет :alias: и текстовые аналоги на emoji. Unicode-emoji в строке не трогает. */
export const expandEmojis = (text: string, custom?: Record<string, string>): string => {
  let result = text.replace(shortcodePattern, (match, code: string) => {
    return lookupShortcode(code, custom) ?? match;
  });

  for (const [literal, emoji] of textEquivalentEntries) {
    if (result.includes(literal)) {
      result = result.split(literal).join(emoji);
    }
  }

  return result;
};

/** Длина строки с учётом emoji (суррогатные пары). */
export const charCount = (text: string): number => [...text].length;
