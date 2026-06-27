/** Суффикс MP4 рядом со story-кадром (images/foo/bar.png → images/foo/bar.video.mp4) */
export const STORY_VIDEO_SUFFIX = ".video.mp4";

export const OPENROUTER_STORY_VIDEO_PROFILE = "veo-3.1-lite-loop-v1";

export const storyVideoPathForImage = (imagePublicPath: string): string => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return `${base}${STORY_VIDEO_SUFFIX}`;
};
