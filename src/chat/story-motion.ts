import bezierEasing from "bezier-easing";
import {interpolate} from "remotion";
import {FPS} from "./fps";

const cinematicEase = bezierEasing(0.22, 1, 0.36, 1);

/** Длина одного цикла Ken Burns для бесшовного повтора, кадры */
export const STORY_MOTION_LOOP_FRAMES = 6 * FPS;

export const hashSeed = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const sceneMotionProgress = (localFrame: number, durationFrames: number): number => {
  const safeDuration = Math.max(1, durationFrames);
  const linear = interpolate(localFrame, [0, safeDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return cinematicEase(linear);
};

/** Пинг-понг 0→1→0 для бесшовного зацикливания статичного кадра */
export const sceneMotionLoopProgress = (
  localFrame: number,
  loopFrames: number = STORY_MOTION_LOOP_FRAMES,
): number => {
  const safeLoop = Math.max(2, loopFrames);
  const pos = ((localFrame % safeLoop) + safeLoop) % safeLoop;
  const t = pos / safeLoop;
  const triangle = t < 0.5 ? t * 2 : 2 - t * 2;
  return cinematicEase(triangle);
};

/** Veo story-клипы — 24 fps; не путать с FPS композиции (30) */
export const STORY_VIDEO_SOURCE_FPS = 24;

/** Число кадров в исходном MP4 по длительности */
export const storyVideoSourceFrameCount = (videoDurationMs?: number): number =>
  Math.max(2, Math.round(((videoDurationMs ?? 4000) / 1000) * STORY_VIDEO_SOURCE_FPS));

/** Длительность проигрывания «вперёд» в кадрах композиции (24 fps источник → fps ролика) */
export const storyVideoForwardDurationFrames = (
  videoDurationMs: number | undefined,
  compositionFps: number,
): number => {
  const frameCount = storyVideoSourceFrameCount(videoDurationMs);
  return Math.max(2, Math.round((frameCount / STORY_VIDEO_SOURCE_FPS) * compositionFps));
};

/** Бесшовное зацикливание: кадр источника по локальному кадру сцены */
export const storyVideoLoopFrame = (localFrame: number, videoDurationMs?: number): number => {
  const frameCount = storyVideoSourceFrameCount(videoDurationMs);
  return ((localFrame % frameCount) + frameCount) % frameCount;
};

/** Пинг-понг по реальному числу кадров Veo (24 fps) — мягче, чем резкий modulo */
export const storyVideoPingPongSourceFrame = (
  localFrame: number,
  videoDurationMs?: number,
): number => videoPingPongFrame(localFrame, storyVideoSourceFrameCount(videoDurationMs));

/** Пинг-понг по кадрам видео — без рывка на стыке loop */
export const videoPingPongFrame = (localFrame: number, durationFrames: number): number => {
  const n = Math.max(2, durationFrames - 1);
  const period = n * 2;
  const t = ((localFrame % period) + period) % period;
  return t <= n ? t : period - t;
};

export const motionVectors = (directionSeed: string): {panX: number; panY: number} => {
  const seed = hashSeed(directionSeed);
  return {
    panX: seed % 2 === 0 ? 1 : -1,
    panY: seed % 3 === 0 ? 1 : -1,
  };
};
