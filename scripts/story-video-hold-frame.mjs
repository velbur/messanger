import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {existsSync, statSync} from "node:fs";
import path from "node:path";
import {storyVideoHoldFramePathForVideo} from "../src/chat/story-video-paths.ts";
import {probeVideoDurationMs} from "./media-duration.mjs";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
export const PUBLIC_DIR = path.join(ROOT, "public");

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

const needsHoldFrameRebuild = (sourceAbs, holdAbs) => {
  if (!existsSync(holdAbs)) {
    return true;
  }
  if (!existsSync(sourceAbs)) {
    return false;
  }
  return statSync(sourceAbs).mtimeMs > statSync(holdAbs).mtimeMs;
};

/** Извлечь последний кадр MP4 в PNG рядом с клипом */
export const buildStoryVideoHoldFrameFile = async (sourceAbs, holdAbs) => {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-y", "-sseof", "-1", "-i", sourceAbs, "-frames:v", "1", "-update", "1", holdAbs],
      {maxBuffer: 8 * 1024 * 1024},
    );
  } catch {
    const durationMs = await probeVideoDurationMs(sourceAbs);
    const seekSec = Math.max(0, durationMs / 1000 - 0.08).toFixed(3);
    await execFileAsync(
      "ffmpeg",
      ["-y", "-ss", seekSec, "-i", sourceAbs, "-frames:v", "1", "-q:v", "2", holdAbs],
      {maxBuffer: 8 * 1024 * 1024},
    );
  }

  if (!existsSync(holdAbs) || statSync(holdAbs).size < 1024) {
    throw new Error(`ffmpeg не создал hold-кадр: ${holdAbs}`);
  }
};

export const ensureStoryVideoHoldFrameFile = async (videoRef, logs = []) => {
  const {absolute: sourceAbs} = safePublicPath(videoRef);
  if (!existsSync(sourceAbs)) {
    throw new Error("файл не найден");
  }

  const holdRef = storyVideoHoldFramePathForVideo(videoRef);
  const {absolute: holdAbs} = safePublicPath(holdRef);

  if (!needsHoldFrameRebuild(sourceAbs, holdAbs)) {
    return holdRef;
  }

  await buildStoryVideoHoldFrameFile(sourceAbs, holdAbs);
  logs.push(`Story hold-кадр: ${holdRef}`);
  return holdRef;
};
