import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {existsSync, statSync} from "node:fs";
import path from "node:path";
import {storyVideoLoopPathForVideo} from "../src/chat/story-video-paths.ts";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

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

const needsLoopRebuild = (sourceAbs, loopAbs) => {
  if (!existsSync(loopAbs)) {
    return true;
  }
  if (!existsSync(sourceAbs)) {
    return false;
  }
  return statSync(sourceAbs).mtimeMs > statSync(loopAbs).mtimeMs;
};

/** Собрать MP4: оригинал + reverse (пинг-понг для Remotion Loop) */
export const buildStoryVideoLoopFile = async (sourceAbs, loopAbs) => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    sourceAbs,
    "-filter_complex",
    "[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0[out]",
    "-map",
    "[out]",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    loopAbs,
  ]);
};

export const ensureStoryVideoLoopFile = async (videoRef, logs = []) => {
  const {absolute: sourceAbs} = safePublicPath(videoRef);
  if (!existsSync(sourceAbs)) {
    return null;
  }

  const loopRef = storyVideoLoopPathForVideo(videoRef);
  const {absolute: loopAbs} = safePublicPath(loopRef);

  if (!needsLoopRebuild(sourceAbs, loopAbs)) {
    return loopRef;
  }

  await buildStoryVideoLoopFile(sourceAbs, loopAbs);
  logs.push(`Story loop: ${loopRef}`);
  return loopRef;
};

export const ensureStoryVideoLoopFiles = async (videoRefs, {logs = []} = {}) => {
  const built = [];
  for (const videoRef of videoRefs) {
    const loopRef = await ensureStoryVideoLoopFile(videoRef, logs);
    if (loopRef) {
      built.push(loopRef);
    }
  }
  return built;
};

export const collectStoryVideoLoopRefs = (videoRefs) =>
  videoRefs.map((ref) => storyVideoLoopPathForVideo(ref));
