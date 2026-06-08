import React from "react";
import {TEXT_FONT_FAMILY} from "../fonts";

const SVG_NS = "http://www.w3.org/2000/svg";

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  variant?: "svg" | "css" | "circle";
};

const headerStroke = (size: number, strokeWidth?: number): number =>
  strokeWidth ?? Math.max(1.8, size * 0.042);

/** В 24×24 есть поля — лёгкое увеличение только для иконок шапки */
const headerIconScale = (size: number): number | undefined =>
  size >= 40 ? 1.08 : undefined;

const HeaderIconGroup: React.FC<{size: number; children: React.ReactNode}> = ({size, children}) => {
  const scale = headerIconScale(size);
  if (!scale) {
    return <>{children}</>;
  }
  return <g transform={`translate(12 12) scale(${scale}) translate(-12 -12)`}>{children}</g>;
};

const inputBarIconScale = (size: number): number | undefined =>
  size >= 40 ? 1.18 : undefined;

const InputBarIconGroup: React.FC<{size: number; children: React.ReactNode}> = ({size, children}) => {
  const scale = inputBarIconScale(size);
  if (!scale) {
    return <>{children}</>;
  }
  return <g transform={`translate(12 12) scale(${scale}) translate(-12 -12)`}>{children}</g>;
};

const inputStroke = (size: number, strokeWidth?: number): number =>
  strokeWidth ?? Math.max(2, size * 0.047);

export const PlusIcon: React.FC<IconProps> = ({
  size = 28,
  color = "#8696a0",
  variant = "svg",
}) => {
  if (variant === "css") {
    const bar = Math.max(2, Math.round(size * 0.08));
    const len = Math.round(size * 0.55);
    return (
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: len,
            height: bar,
            marginLeft: -len / 2,
            marginTop: -bar / 2,
            backgroundColor: color,
            borderRadius: bar,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: bar,
            height: len,
            marginLeft: -bar / 2,
            marginTop: -len / 2,
            backgroundColor: color,
            borderRadius: bar,
          }}
        />
      </div>
    );
  }

  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const SmileIcon: React.FC<IconProps> = ({size = 28, color = "#8696a0", strokeWidth}) => {
  const sw = strokeWidth ?? Math.max(1.4, size * 0.034);
  const eyeR = Math.max(1, size * 0.028);
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={sw} />
      <circle cx="9" cy="10" r={eyeR} fill={color} />
      <circle cx="15" cy="10" r={eyeR} fill={color} />
      <path
        d="M8.5 14.5c1.2 1.4 2.8 2.1 3.5 2.1s2.3-.7 3.5-2.1"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const MicIcon: React.FC<IconProps> = ({size = 28, color = "#8696a0", strokeWidth}) => {
  const sw = inputStroke(size, strokeWidth);
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <InputBarIconGroup size={size}>
        <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth={sw} />
        <path
          d="M6 11a6 6 0 0 0 12 0M12 17v3"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </InputBarIconGroup>
    </svg>
  );
};

export const SendIcon: React.FC<IconProps> = ({
  size = 28,
  color = "#00a884",
  variant = "svg",
}) => {
  if (variant === "circle") {
    const arrow = Math.round(size * 0.5);
    return (
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          background: color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <svg xmlns={SVG_NS} width={arrow} height={arrow} viewBox="0 0 24 24" fill="none">
          <InputBarIconGroup size={arrow}>
            <path d="M19 12l-14-7 4 7 -4 7 14-7z" fill="#fff" />
          </InputBarIconGroup>
        </svg>
      </div>
    );
  }

  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12l-14-7 4 7 -4 7 14-7z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const BackIcon: React.FC<IconProps> = ({size = 32, color = "#fff", strokeWidth}) => {
  const sw = headerStroke(size, strokeWidth);
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6L9 12l6 6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Контурная иконка видеозвонка (как в WhatsApp) */
export const VideoCallIcon: React.FC<IconProps> = ({size = 28, color = "#fff", strokeWidth}) => {
  const sw = headerStroke(size, strokeWidth);
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <HeaderIconGroup size={size}>
        <rect x="3" y="7" width="12" height="10" rx="2" stroke={color} strokeWidth={sw} />
        <path
          d="M15 10.5l5.5-3v9l-5.5-3v-3z"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </HeaderIconGroup>
    </svg>
  );
};

export const PhoneIcon: React.FC<IconProps> = ({size = 28, color = "#fff", strokeWidth}) => {
  const sw = headerStroke(size, strokeWidth);
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <HeaderIconGroup size={size}>
        <path
          d="M8 4h3l1.5 4-2 1.2a11 11 0 0 0 5.3 5.3L15 12.5 19 14v3a2 2 0 0 1-2.2 2A15 15 0 0 1 6.2 6.2 2 2 0 0 1 8 4z"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </HeaderIconGroup>
    </svg>
  );
};

export const MenuIcon: React.FC<IconProps> = ({size = 28, color = "#fff"}) => {
  const dotR = Math.min(2.2, Math.max(1.7, size * 0.05));
  return (
    <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <HeaderIconGroup size={size}>
        <circle cx="12" cy="6" r={dotR} fill={color} />
        <circle cx="12" cy="12" r={dotR} fill={color} />
        <circle cx="12" cy="18" r={dotR} fill={color} />
      </HeaderIconGroup>
    </svg>
  );
};

export const BatteryIcon: React.FC<IconProps> = ({size = 24, color = "#fff"}) => (
  <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 28 14" fill="none" aria-hidden>
    <rect x="1" y="2" width="22" height="10" rx="2.2" stroke={color} strokeWidth="1.5" />
    <rect x="24" y="5" width="2.5" height="4" rx="0.8" fill={color} />
  </svg>
);

/** Галочки прочтения — символ ✓ в Inter (SVG в headless часто даёт □) */
export const ReadReceiptIcon: React.FC<IconProps> = ({size = 18, color = "#53bdeb"}) => (
  <span
    aria-hidden
    style={{
      color,
      fontSize: size,
      fontFamily: TEXT_FONT_FAMILY,
      fontWeight: 600,
      letterSpacing: -3,
      lineHeight: 1,
    }}
  >
    ✓✓
  </span>
);

export const SignalIcon: React.FC<IconProps> = ({size = 22, color = "#fff"}) => (
  <svg xmlns={SVG_NS} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="2" y="16" width="3" height="4" rx="0.8" fill={color} />
    <rect x="7" y="13" width="3" height="7" rx="0.8" fill={color} />
    <rect x="12" y="10" width="3" height="10" rx="0.8" fill={color} />
    <rect x="17" y="6" width="3" height="14" rx="0.8" fill={color} />
  </svg>
);
