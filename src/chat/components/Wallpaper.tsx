import React from "react";
import {useChatTheme} from "../ThemeContext";

export const Wallpaper: React.FC = () => {
  const theme = useChatTheme();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        backgroundColor: theme.chatBg,
        backgroundImage:
          `radial-gradient(circle at 25px 25px, ${theme.chatPatternColor} 6px, transparent 7px), ` +
          `radial-gradient(circle at 75px 75px, ${theme.chatPatternColor} 6px, transparent 7px)`,
        backgroundSize: "100px 100px",
      }}
    />
  );
};
