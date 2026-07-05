export type StorySceneTransition = "crossfade" | "zoom" | "push";

export const DEFAULT_STORY_SCENE_TRANSITION: StorySceneTransition = "zoom";

export const STORY_SCENE_TRANSITION_FRAMES: Record<StorySceneTransition, number> = {
  crossfade: 12,
  zoom: 15,
  push: 14,
};

export type SceneTransitionFrameStyle = {
  opacity: number;
  scale: number;
  translateXPercent: number;
  translateYPercent: number;
  blurPx: number;
};

const smoothstep = (value: number): number => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};

export const coerceStorySceneTransition = (value: unknown): StorySceneTransition => {
  if (value === "crossfade" || value === "zoom" || value === "push") {
    return value;
  }
  return DEFAULT_STORY_SCENE_TRANSITION;
};

export const storySceneTransitionFrames = (transition: StorySceneTransition): number =>
  STORY_SCENE_TRANSITION_FRAMES[transition];

export const sceneTransitionProgress = (
  localFrame: number,
  durationFrames: number,
): number => {
  if (durationFrames <= 0) {
    return 1;
  }
  return smoothstep(Math.min(1, Math.max(0, localFrame / durationFrames)));
};

const baseStyle = (): SceneTransitionFrameStyle => ({
  opacity: 1,
  scale: 1,
  translateXPercent: 0,
  translateYPercent: 0,
  blurPx: 0,
});

export const outgoingSceneTransitionStyle = (
  progress: number,
  transition: StorySceneTransition,
): SceneTransitionFrameStyle => {
  const style = baseStyle();

  if (transition === "crossfade") {
    style.opacity = 1;
    return style;
  }

  if (transition === "zoom") {
    style.opacity = 1 - progress * 0.92;
    style.scale = 1 + progress * 0.09;
    style.blurPx = progress * 3.5;
    return style;
  }

  style.opacity = 1 - progress;
  style.translateXPercent = -progress * 20;
  style.scale = 1 - progress * 0.04;
  return style;
};

export const incomingSceneTransitionStyle = (
  progress: number,
  transition: StorySceneTransition,
): SceneTransitionFrameStyle => {
  const style = baseStyle();

  if (transition === "crossfade") {
    style.opacity = progress;
    return style;
  }

  if (transition === "zoom") {
    style.opacity = progress;
    style.scale = 1.14 - progress * 0.14;
    style.translateYPercent = (1 - progress) * -2.2;
    return style;
  }

  style.opacity = progress;
  style.translateXPercent = (1 - progress) * 24;
  return style;
};

/** Краткая вспышка в середине перехода — акцент на смене кадра */
export const sceneTransitionFlashOpacity = (
  progress: number,
  transition: StorySceneTransition,
): number => {
  if (transition === "crossfade" || progress <= 0 || progress >= 1) {
    return 0;
  }
  const peak = transition === "zoom" ? 0.2 : 0.1;
  return Math.sin(progress * Math.PI) * peak;
};
