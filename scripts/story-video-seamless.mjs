import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {existsSync, statSync} from "node:fs";
import path from "node:path";
import {storyVideoSeamlessPathForVideo} from "../src/chat/story-video-paths.ts";
import {probeVideoDurationMs} from "./media-duration.mjs";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
export const PUBLIC_DIR = path.join(ROOT, "public");

/** Длина кроссфейда end→start для бесшовного loop */
export const SEAMLESS_LOOP_FADE_SEC = 0.25;

const safePublicPath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь");
  }
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь");
  }
  return {relative: normalized, absolute};
};

const needsSeamlessRebuild = (sourceAbs, seamlessAbs) => {
  if (!existsSync(seamlessAbs)) {
    return true;
  }
  if (!existsSync(sourceAbs)) {
    return false;
  }
  return statSync(sourceAbs).mtimeMs > statSync(seamlessAbs).mtimeMs;
};

/** Склеить тело клипа + короткий crossfade с конца в начало */
export const buildStoryVideoSeamlessFile = async (sourceAbs, seamlessAbs) => {
  const durationMs = await probeVideoDurationMs(sourceAbs);
  const durSec = durationMs / 1000;
  const fadeSec = Math.min(SEAMLESS_LOOP_FADE_SEC, Math.max(0.08, durSec / 5));
  const mainSec = Math.max(0.1, durSec - fadeSec);

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    sourceAbs,
    "-filter_complex",
    `[0:v]split=3[a][b][c];[a]trim=end=${mainSec},setpts=PTS-STARTPTS[main];[b]trim=start=${mainSec},setpts=PTS-STARTPTS[end];[c]trim=end=${fadeSec},setpts=PTS-STARTPTS[start];[end][start]xfade=transition=fade:duration=${fadeSec}:offset=0[xf];[main][xf]concat=n=2:v=1:a=0[out]`,
    "-map",
    "[out]",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    seamlessAbs,
  ]);
};

export const ensureStoryVideoSeamlessFile = async (videoRef, loop, logs = []) => {
  if (!loop) {
    return videoRef;
  }

  const {absolute: sourceAbs} = safePublicPath(videoRef);
  if (!existsSync(sourceAbs)) {
    return videoRef;
  }

  const seamlessRef = storyVideoSeamlessPathForVideo(videoRef);
  const {absolute: seamlessAbs} = safePublicPath(seamlessRef);

  if (!needsSeamlessRebuild(sourceAbs, seamlessAbs)) {
    return seamlessRef;
  }

  await buildStoryVideoSeamlessFile(sourceAbs, seamlessAbs);
  logs.push(`Story seamless loop: ${seamlessRef}`);
  return seamlessRef;
};
