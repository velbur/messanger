/** Суффиксы файлов depth-параллакса рядом с story-кадром */
export const STORY_DEPTH_SUFFIX = ".depth.png";
export const STORY_LAYER_SUFFIXES = {
  far: ".layer-far.png",
  mid: ".layer-mid.png",
  near: ".layer-near.png",
} as const;

export type StoryDepthLayerPaths = {
  depth: string;
  far: string;
  mid: string;
  near: string;
};

export const storyLayerPaths = (imagePublicPath: string): StoryDepthLayerPaths => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return {
    depth: `${base}${STORY_DEPTH_SUFFIX}`,
    far: `${base}${STORY_LAYER_SUFFIXES.far}`,
    mid: `${base}${STORY_LAYER_SUFFIXES.mid}`,
    near: `${base}${STORY_LAYER_SUFFIXES.near}`,
  };
};
