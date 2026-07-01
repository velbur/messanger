/** Суффиксы файлов depth-параллакса рядом с story-кадром */
import {storyVideoHoldFramePathForVideo} from "./story-video-paths";

export const STORY_DEPTH_SUFFIX = ".depth.png";
/** Запечённый seamless parallax-loop (3D-photo), который проигрывается в Remotion */
export const STORY_PARALLAX_VIDEO_SUFFIX = ".parallax.mp4";

/** @deprecated старый 2.5D через RGBA-слои — заменён на запечённое видео */
export const STORY_LAYER_SUFFIXES = {
  far: ".layer-far.png",
  mid: ".layer-mid.png",
  near: ".layer-near.png",
} as const;

export type StoryDepthPaths = {
  depth: string;
  parallaxVideo: string;
};

export const storyLayerPaths = (imagePublicPath: string): StoryDepthPaths => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return {
    depth: `${base}${STORY_DEPTH_SUFFIX}`,
    parallaxVideo: `${base}${STORY_PARALLAX_VIDEO_SUFFIX}`,
  };
};

/** Путь к запечённому parallax-loop рядом со story-кадром */
export const storyParallaxVideoPath = (imagePublicPath: string): string =>
  storyLayerPaths(imagePublicPath).parallaxVideo;

/** Parallax после Veo: запекается с hold-кадра (.video-hold.png), не с исходного PNG */
export const storyParallaxVideoPathForVideo = (videoPublicPath: string): string =>
  storyParallaxVideoPath(storyVideoHoldFramePathForVideo(videoPublicPath));
