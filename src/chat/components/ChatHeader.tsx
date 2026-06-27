import React from "react";
import {Img, staticFile} from "remotion";
import {CHAT_FONT_FAMILY} from "../fonts";
import {useChatTheme} from "../ThemeContext";
import {CHROME, LAYOUT} from "../theme";
import {BackIcon, MenuIcon, PhoneIcon, VideoCallIcon} from "./icons";

type Props = {
  contactName: string;
  contactStatus: string;
  contactAvatar?: string;
  overlayChrome?: boolean;
};

const H = CHROME.header;

export const ChatHeader: React.FC<Props> = ({
  contactName,
  contactStatus,
  contactAvatar,
  overlayChrome = false,
}) => {
  const theme = useChatTheme();
  const avatarSrc = contactAvatar ? staticFile(contactAvatar) : null;

  return (
    <div
      style={{
        height: LAYOUT.headerH,
        background: overlayChrome ? "rgba(11, 20, 26, 0.55)" : theme.headerBg,
        color: theme.headerText,
        display: "flex",
        alignItems: "center",
        padding: `0 ${H.paddingRight}px 0 0`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: H.backTouch,
          height: H.backTouch,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginLeft: 2,
        }}
      >
        <BackIcon size={H.backIcon} color={theme.headerText} strokeWidth={H.backIconStroke} />
      </div>

      {avatarSrc ? (
        <Img
          src={avatarSrc}
          style={{
            width: H.avatarSize,
            height: H.avatarSize,
            borderRadius: H.avatarSize / 2,
            objectFit: "cover",
            flexShrink: 0,
            marginRight: H.avatarGap,
          }}
        />
      ) : (
        <div
          style={{
            width: H.avatarSize,
            height: H.avatarSize,
            borderRadius: H.avatarSize / 2,
            background: theme.avatarPlaceholder,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            marginRight: H.avatarGap,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={Math.round(H.avatarSize * 0.56)}
            height={Math.round(H.avatarSize * 0.56)}
            viewBox="0 0 24 24"
            fill="#fff"
          >
            <circle cx="12" cy="9" r="4" />
            <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          justifyContent: "center",
          gap: H.textGap,
        }}
      >
        <span
          style={{
            fontSize: H.nameFontSize,
            fontWeight: 600,
            fontFamily: CHAT_FONT_FAMILY,
            lineHeight: 1.1,
            letterSpacing: 0.1,
          }}
        >
          {contactName}
        </span>
        <span
          style={{
            fontSize: H.statusFontSize,
            color: theme.headerSubtext,
            fontFamily: CHAT_FONT_FAMILY,
            lineHeight: 1.15,
            fontWeight: 400,
          }}
        >
          {contactStatus}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: H.actionGap,
          flexShrink: 0,
          paddingRight: H.actionPaddingRight,
          minHeight: H.avatarSize,
        }}
      >
        <VideoCallIcon size={H.actionIcon} color={theme.headerText} strokeWidth={H.actionIconStroke} />
        <PhoneIcon size={H.actionIcon} color={theme.headerText} strokeWidth={H.actionIconStroke} />
        <MenuIcon size={H.actionIcon} color={theme.headerText} />
      </div>
    </div>
  );
};
