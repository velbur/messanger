import React from "react";
import {CHAT_FONT_FAMILY} from "../fonts";
import {useChatTheme} from "../ThemeContext";
import {CHROME, LAYOUT} from "../theme";
import {BatteryIcon, SignalIcon} from "./icons";

type Props = {
  time: string;
  overlayChrome?: boolean;
};

const S = CHROME.statusBar;

export const StatusBar: React.FC<Props> = ({time, overlayChrome = false}) => {
  const theme = useChatTheme();

  return (
    <div
      style={{
        height: LAYOUT.statusBarH,
        flexShrink: 0,
        color: theme.headerText,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${S.paddingX}px`,
        fontSize: S.timeFontSize,
        fontWeight: 600,
        fontFamily: CHAT_FONT_FAMILY,
        background: overlayChrome ? "rgba(11, 20, 26, 0.45)" : theme.statusBarBg,
        letterSpacing: 0.2,
      }}
    >
      <span style={{fontVariantNumeric: "tabular-nums"}}>{time}</span>
      <div style={{display: "flex", gap: S.iconsGap, alignItems: "center"}}>
        <SignalIcon size={S.signalIcon} color={theme.headerText} />
        <span style={{fontSize: S.networkFontSize, fontWeight: 600, letterSpacing: 0.2}}>5G</span>
        <BatteryIcon size={S.batteryIcon} color={theme.headerText} />
      </div>
    </div>
  );
};
