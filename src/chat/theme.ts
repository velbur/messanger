/** Масштаб всего UI (+20% к базовым размерам) */
export const S = (n: number): number => Math.round(n * 1.2);

/** Единый отступ под UI YouTube Shorts (справа и снизу) */
export const SHORTS_SAFE_AREA = S(128);

export type WallpaperMode = "default" | "dark";

export type ChatTheme = {
  headerBg: string;
  headerText: string;
  headerSubtext: string;
  statusBarBg: string;
  chatBg: string;
  chatPatternColor: string;
  bubbleIncoming: string;
  bubbleOutgoing: string;
  bubbleShadow: string;
  textPrimary: string;
  textMeta: string;
  readReceipt: string;
  inputBarBg: string;
  inputFieldBg: string;
  inputPlaceholder: string;
  inputIcon: string;
  accent: string;
  avatarPlaceholder: string;
  typingDot: string;
};

/** Светлая тема (классический WhatsApp) */
const LIGHT_THEME: ChatTheme = {
  headerBg: "#1f2c34",
  headerText: "#ffffff",
  headerSubtext: "#8696a0",
  statusBarBg: "#0b141a",
  chatBg: "#efeae2",
  chatPatternColor: "rgba(0,0,0,0.04)",
  bubbleIncoming: "#ffffff",
  bubbleOutgoing: "#d9fdd3",
  bubbleShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13)",
  textPrimary: "#111b21",
  textMeta: "#667781",
  readReceipt: "#53bdeb",
  inputBarBg: "#f0f2f5",
  inputFieldBg: "#ffffff",
  inputPlaceholder: "#667781",
  inputIcon: "#54656f",
  accent: "#00a884",
  avatarPlaceholder: "linear-gradient(160deg, #7ec8f7 0%, #5b9bd5 100%)",
  typingDot: "#90a4ae",
};

/** Тёмная тема WhatsApp */
const DARK_THEME: ChatTheme = {
  headerBg: "#1f2c34",
  headerText: "#ffffff",
  headerSubtext: "#8696a0",
  statusBarBg: "#0b141a",
  chatBg: "#0b141a",
  chatPatternColor: "rgba(255,255,255,0.03)",
  bubbleIncoming: "#202c33",
  bubbleOutgoing: "#005c4b",
  bubbleShadow: "0 1px 0.5px rgba(0, 0, 0, 0.35)",
  textPrimary: "#e9edef",
  textMeta: "#8696a0",
  readReceipt: "#53bdeb",
  inputBarBg: "#1f2c34",
  inputFieldBg: "#2a3942",
  inputPlaceholder: "#8696a0",
  inputIcon: "#aebac1",
  accent: "#00a884",
  avatarPlaceholder: "linear-gradient(160deg, #5b9bd5 0%, #3d7ab8 100%)",
  typingDot: "#8696a0",
};

export const THEMES: Record<WallpaperMode, ChatTheme> = {
  default: LIGHT_THEME,
  dark: DARK_THEME,
};

export const getTheme = (mode: WallpaperMode): ChatTheme => THEMES[mode] ?? LIGHT_THEME;

/** @deprecated используйте getTheme(mode) */
export const WA = LIGHT_THEME;

/** Типографика и пузыри переписки */
export const CHAT = {
  messageFontSize: S(44),
  messageLineHeight: 1.28,
  messageTimeFontSize: S(26),
  messageMaxWidth: S(800),
  bubblePadding: `${S(12)}px ${S(16)}px ${S(10)}px ${S(18)}px`,
  bubbleRadius: S(18),
  bubbleMarginBottom: S(6),
  readReceiptSize: S(17),
  metaRowMinHeight: S(28),
  scrollLineHeight: S(52),
  charsPerLine: 22,
  imageMaxWidth: S(560),
  imageMaxHeight: S(420),
  imageInnerRadius: S(14),
  imageBubblePadding: S(4),
  imageCaptionPadding: `${S(10)}px ${S(14)}px ${S(8)}px`,
  imageTimeOverlayBg: "rgba(11, 20, 26, 0.55)",
  imageTimeOverlayPadding: `${S(4)}px ${S(10)}px`,
} as const;

export const LAYOUT = {
  statusBarH: S(72),
  headerH: S(132),
  inputBarH: S(178),
  chatPaddingTop: S(8),
  chatPaddingLeft: SHORTS_SAFE_AREA,
  chatPaddingRight: SHORTS_SAFE_AREA,
  shortsSafeAreaBottom: SHORTS_SAFE_AREA,
  chatPaddingBottom: S(12),
} as const;

/** Размеры элементов верхней и нижней панели */
export const CHROME = {
  statusBar: {
    paddingX: S(34),
    timeFontSize: S(36),
    signalIcon: S(26),
    networkFontSize: S(24),
    batteryIcon: S(30),
    iconsGap: S(9),
  },
  header: {
    paddingRight: S(18),
    backTouch: S(60),
    backIcon: S(38),
    avatarSize: S(66),
    avatarGap: S(18),
    nameFontSize: S(40),
    statusFontSize: S(24),
    textGap: S(4),
    actionIcon: S(42),
    actionIconStroke: 2.4,
    backIconStroke: 2.2,
    actionGap: S(26),
    actionPaddingRight: S(6),
  },
  input: {
    padding: `${S(14)}px ${S(18)}px ${S(12)}px`,
    gap: S(14),
    plusBtn: S(64),
    plusIcon: S(34),
    plusBorder: 2.5,
    fieldMinH: S(92),
    fieldRadius: S(34),
    fieldPaddingX: S(22),
    fieldGap: S(18),
    /** Совпадает с CHAT.messageFontSize */
    textFontSize: S(40),
    fieldIcon: S(52),
    fieldIconStroke: 2.6,
    smileIconStroke: 1.9,
    actionSlot: S(76),
    sendBtn: S(76),
  },
  typing: {
    padding: `${S(18)}px ${S(20)}px`,
    minWidth: S(76),
    dotSize: S(12),
    gap: S(8),
    borderRadius: S(18),
  },
  outro: {
    buttonPadding: `${S(26)}px ${S(48)}px`,
    fontSize: S(52),
    iconSize: S(44),
    iconGap: S(16),
  },
  titleCard: {
    fontSize: S(52),
    paddingX: S(72),
    lineHeight: 1.3,
  },
} as const;

export const chromeHeight =
  LAYOUT.statusBarH + LAYOUT.headerH + LAYOUT.inputBarH + LAYOUT.shortsSafeAreaBottom;

/** Параметры story-split: верхняя панель + компактный чат */
export const SPLIT_LAYOUT = {
  frameWidth: 1080,
  frameHeight: 1920,
  crossfadeFrames: 12,
} as const;

export const splitPanelHeights = (
  topPanelRatio: number,
  storyPanelHeight: number,
): {topH: number; bottomH: number} => {
  const frameHeight = SPLIT_LAYOUT.frameHeight;
  const topH = Math.round(storyPanelHeight);
  const bottomH = Math.max(0, frameHeight - topH);
  void topPanelRatio;
  return {topH, bottomH};
};

export const splitChatScale = (bottomPanelHeight: number): number =>
  Math.min(1, bottomPanelHeight / SPLIT_LAYOUT.frameHeight);
