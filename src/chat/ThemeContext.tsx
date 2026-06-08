import React, {createContext, useContext} from "react";
import {getTheme, type ChatTheme, type WallpaperMode} from "./theme";

const ThemeContext = createContext<ChatTheme>(getTheme("default"));

export const ChatThemeProvider: React.FC<{
  mode: WallpaperMode;
  children: React.ReactNode;
}> = ({mode, children}) => (
  <ThemeContext.Provider value={getTheme(mode)}>{children}</ThemeContext.Provider>
);

export const useChatTheme = (): ChatTheme => useContext(ThemeContext);
