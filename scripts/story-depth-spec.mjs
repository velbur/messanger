/** Суффиксы файлов depth-параллакса рядом с story-кадром */
export const STORY_DEPTH_SUFFIX = ".depth.png";
export const STORY_LAYER_SUFFIXES = {
  far: ".layer-far.png",
  mid: ".layer-mid.png",
  near: ".layer-near.png",
};

export const STORY_DEPTH_MODEL = "Xenova/depth-anything-small-hf";

/** Hugging Face Depth Anything V2 (Python + CUDA на воркере) */
export const STORY_DEPTH_V2_MODEL_LARGE = "depth-anything/Depth-Anything-V2-Large-hf";
export const STORY_DEPTH_V2_MODEL_SMALL = "depth-anything/Depth-Anything-V2-Small-hf";

export const storyLayerPaths = (imagePublicPath) => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return {
    depth: `${base}${STORY_DEPTH_SUFFIX}`,
    far: `${base}${STORY_LAYER_SUFFIXES.far}`,
    mid: `${base}${STORY_LAYER_SUFFIXES.mid}`,
    near: `${base}${STORY_LAYER_SUFFIXES.near}`,
  };
};
