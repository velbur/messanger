/** Частота кадров видео (должна совпадать с fps в Root.tsx) */
export const FPS = 30;

export const msToFrames = (ms: number): number => Math.max(1, Math.round((ms / 1000) * FPS));
