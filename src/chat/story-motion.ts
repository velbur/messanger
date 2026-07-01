import bezierEasing from "bezier-easing";
import {interpolate} from "remotion";
import {FPS} from "./fps";

const cinematicEase = bezierEasing(0.22, 1, 0.36, 1);

/** Длина одного цикла motion-анимации (Ken Burns / parallax), секунды */
export const STORY_MOTION_LOOP_SEC = 3;

/** Кадров композиции: parallax стартует раньше, без «зависания» на хвосте Veo */
export const STORY_VIDEO_PARALLAX_HANDOFF_TRIM_FRAMES = 20;
/** Crossfade Veo → parallax: parallax монтируется заранее и уже двигается под fade */
export const STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES = 10;

/** Длина одного цикла Ken Burns / parallax для бесшовного повтора, кадры */
export const STORY_MOTION_LOOP_FRAMES = STORY_MOTION_LOOP_SEC * FPS;

export const storyMotionLoopFrames = (loopSec: number = STORY_MOTION_LOOP_SEC): number =>
  Math.max(2, Math.round(loopSec * FPS));

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

/** Длительность одного цикла loop в кадрах композиции */
export const storyVideoForwardDurationFrames = (
  videoDurationMs: number | undefined,
  compositionFps: number,
): number => Math.max(2, Math.round(((videoDurationMs ?? 4000) / 1000) * compositionFps));

/** Кадр handoff Veo → depth parallax (раньше конца клипа на TRIM кадров) */
export const storyVideoParallaxHandoffFrame = (
  videoDurationMs: number | undefined,
  compositionFps: number,
  sceneDurationFrames: number,
): number => {
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, compositionFps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  return Math.max(2, playFrames - STORY_VIDEO_PARALLAX_HANDOFF_TRIM_FRAMES);
};

/** Кадр начала crossfade: Veo на последнем кадре, parallax уже играет под ним */
export const storyVideoParallaxFadeStartFrame = (
  videoDurationMs: number | undefined,
  compositionFps: number,
  sceneDurationFrames: number,
): number =>
  Math.max(
    1,
    storyVideoParallaxHandoffFrame(videoDurationMs, compositionFps, sceneDurationFrames) -
      STORY_VIDEO_PARALLAX_CROSSFADE_FRAMES,
  );

/** Длина parallax-фазы (с учётом premount/crossfade до handoff) */
export const storyVideoParallaxPhaseFrames = (
  videoDurationMs: number | undefined,
  sceneDurationFrames: number,
  compositionFps: number,
): number =>
  Math.max(
    1,
    sceneDurationFrames -
      storyVideoParallaxFadeStartFrame(videoDurationMs, compositionFps, sceneDurationFrames),
  );

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

/**
 * Непрерывный Ken Burns на всю story-сцену (видео + hold-кадр).
 * Зум идёт с первого кадра, поэтому когда Veo-клип «замирает» в конце,
 * камера продолжает плавно наезжать — нет ощущения паузы.
 */
export const STORY_VIDEO_ZOOM_RAMP_FRAMES = 12 * FPS;

export const storyVideoSceneMotion = (
  directionSeed: string,
  sceneLocalFrame: number,
): {scale: number; translateX: number; translateY: number} => {
  const {panX, panY} = motionVectors(directionSeed);
  const seed = hashSeed(directionSeed);
  const t = sceneLocalFrame / FPS;
  // cinematicEase — быстрый старт, поэтому движение заметно уже в первые секунды
  const progress = sceneMotionProgress(sceneLocalFrame, STORY_VIDEO_ZOOM_RAMP_FRAMES);
  const rampScale = interpolate(progress, [0, 1], [1.0, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const extraDrift = Math.min(
    0.04,
    (Math.max(0, sceneLocalFrame - STORY_VIDEO_ZOOM_RAMP_FRAMES) / (30 * FPS)) * 0.04,
  );
  const breathe = 0.01 * Math.sin(t * 0.6 + seed * 0.013);
  const panPhase = t * 0.5 + seed * 0.019;
  return {
    scale: rampScale + extraDrift + breathe,
    translateX: panX * (progress * 1.6 + 0.5 * Math.sin(panPhase)),
    translateY: panY * (progress * 1.0 + 0.32 * Math.cos(panPhase * 0.9)),
  };
};

export const storyVideoSourceFrameAtPlayFrame = (
  playLocalFrame: number,
  playFrames: number,
  lastVideoFrame: number,
): number =>
  Math.round(
    interpolate(
      Math.max(0, playLocalFrame),
      [0, Math.max(1, playFrames - 1)],
      [0, lastVideoFrame],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
    ),
  );

export const motionVectors = (directionSeed: string): {panX: number; panY: number} => {
  const seed = hashSeed(directionSeed);
  return {
    panX: seed % 2 === 0 ? 1 : -1,
    panY: seed % 3 === 0 ? 1 : -1,
  };
};

/** Чередование направления parallax-камеры: чётные сцены вправо, нечётные влево */
export const parallaxMotionVectorsForScene = (
  sceneIndex: number,
): {panX: number; panY: number} => ({
  panX: sceneIndex % 2 === 0 ? 1 : -1,
  panY: -1,
});

/**
 * Depth-parallax (3D-photo) запекается заранее в .parallax.mp4.
 * За сцену: размах 0→пик→0 (туда-обратно); panX по sceneIndex задаёт,
 * в какую сторону сначала «выезжает» камера (чётные вправо, нечётные влево).
 */
