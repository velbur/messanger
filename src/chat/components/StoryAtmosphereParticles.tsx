import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {hashSeed} from "../story-motion";

type Props = {
  /** Сид для детерминированной раскладки частиц (обычно путь к видео) */
  seed: string;
  /** 0..1 — общая видимость слоя (усиливаем на hold-фазе) */
  intensity?: number;
  /** Цвет частиц (rgb без alpha) */
  rgb?: string;
};

const PARTICLE_COUNT = 44;

/** Детерминированное псевдо-случайное [0,1) — без Math.random (важно для многопроцессного рендера) */
const rnd = (seed: string, key: string): number => (hashSeed(`${seed}:${key}`) % 100000) / 100000;

/**
 * Атмосферная «пыль» поверх story-кадра: лёгкие парящие частицы.
 * Полностью детерминирована от номера кадра — одинакова на всех воркерах.
 */
export const StoryAtmosphereParticles: React.FC<Props> = ({
  seed,
  intensity = 1,
  rgb = "225, 235, 255",
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  if (intensity <= 0) {
    return null;
  }

  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const r = (key: string) => rnd(seed, `${i}:${key}`);

    const baseX = r("x") * 100;
    const baseY = r("y") * 100;
    const size = 2 + r("s") * 5.5;
    const swayAmp = 1 + r("sa") * 3;
    const swayFreq = 0.12 + r("sf") * 0.32;
    const phase = r("p") * Math.PI * 2;
    const driftY = 0.5 + r("vy") * 1.6; // %/сек, медленно вниз
    const baseOpacity = 0.18 + r("o") * 0.4;
    const flickFreq = 0.4 + r("ff") * 1.4;
    // часть частиц чёткие, часть размытые — ощущение глубины
    const blur = 0.3 + r("b") * r("b") * 2.2;

    const x = baseX + swayAmp * Math.sin(t * swayFreq + phase);
    const y = (((baseY + driftY * t) % 108) + 108) % 108 - 4; // бесшовный wrap
    const flick = 0.55 + 0.45 * Math.sin(t * flickFreq + phase);
    const opacity = baseOpacity * flick * intensity;

    particles.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          background: `rgba(${rgb}, ${opacity.toFixed(3)})`,
          filter: `blur(${blur.toFixed(2)}px)`,
          transform: "translate(-50%, -50%)",
        }}
      />,
    );
  }

  return <AbsoluteFill style={{pointerEvents: "none"}}>{particles}</AbsoluteFill>;
};
