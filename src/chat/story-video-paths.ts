/** Суффикс MP4 рядом со story-кадром (images/foo/bar.png → images/foo/bar.video.mp4) */
export const STORY_VIDEO_SUFFIX = ".video.mp4";

/** Пинг-понг: вперёд + назад для бесшовного loop в Remotion */
export const STORY_VIDEO_LOOP_SUFFIX = ".video.loop.mp4";

export const OPENROUTER_STORY_VIDEO_PROFILE = "veo-3.1-lite-loop-v1";

export const storyVideoPathForImage = (imagePublicPath: string): string => {
  const base = String(imagePublicPath).replace(/\.(png|jpe?g|webp)$/i, "");
  return `${base}${STORY_VIDEO_SUFFIX}`;
};

export const storyVideoLoopPathForVideo = (videoPublicPath: string): string => {
  const base = String(videoPublicPath)
    .replace(/\.video\.loop\.mp4$/i, "")
    .replace(/\.video\.mp4$/i, "");
  return `${base}${STORY_VIDEO_LOOP_SUFFIX}`;
};

/** Длительность пинг-понг-файла (вперёд + назад) */
export const storyVideoLoopDurationMs = (videoDurationMs?: number): number =>
  (videoDurationMs ?? 4000) * 2;
