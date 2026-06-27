import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

/** Длительность видео в миллисекундах через ffprobe */
export const probeVideoDurationMs = async (absolutePath) => {
  const {stdout} = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate,nb_frames,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      absolutePath,
    ],
    {encoding: "utf8", maxBuffer: 2 * 1024 * 1024},
  );
  const data = JSON.parse(stdout);
  const streamDuration = Number(data?.streams?.[0]?.duration);
  const formatDuration = Number(data?.format?.duration);
  const seconds = Number.isFinite(streamDuration) && streamDuration > 0
    ? streamDuration
    : formatDuration;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Не удалось определить длительность видео: ${absolutePath}`);
  }
  return Math.max(100, Math.round(seconds * 1000));
};
