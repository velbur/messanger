import bezierEasing from "bezier-easing";
import {interpolate} from "remotion";

const cinematicEase = bezierEasing(0.22, 1, 0.36, 1);

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

export const motionVectors = (directionSeed: string): {panX: number; panY: number} => {
  const seed = hashSeed(directionSeed);
  return {
    panX: seed % 2 === 0 ? 1 : -1,
    panY: seed % 3 === 0 ? 1 : -1,
  };
};
