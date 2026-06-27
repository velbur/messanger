/** Суффикс MP4 рядом со story-кадром (images/foo/bar.png → images/foo/bar.video.mp4) */
export const STORY_VIDEO_SUFFIX = ".video.mp4";

/** MP4 с crossfade end→start для Remotion Loop */
export const STORY_VIDEO_SEAMLESS_SUFFIX = ".video.seamless.mp4";

export const OPENROUTER_STORY_VIDEO_PROFILE = "veo-3.1-lite-loop-v1";

export const storyVideoPathForImage = (imagePublicPath: string): string => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return `${base}${STORY_VIDEO_SUFFIX}`;
};

export const storyVideoSeamlessPathForVideo = (videoPublicPath: string): string => {
  const base = String(videoPublicPath)
    .replace(/\.video\.seamless\.mp4$/i, "")
    .replace(/\.video\.mp4$/i, "");
  return `${base}${STORY_VIDEO_SEAMLESS_SUFFIX}`;
};

/** Файл для воспроизведения: seamless-версия для loop-сцен */
export const storyVideoPlaybackPath = (videoPublicPath: string, loop: boolean): string =>
  loop ? storyVideoSeamlessPathForVideo(videoPublicPath) : videoPublicPath;
