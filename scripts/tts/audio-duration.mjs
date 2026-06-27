import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

/** Длительность WAV/MP3 в миллисекундах через ffprobe */
export const probeAudioDurationMs = async (absolutePath) => {
  const {stdout} = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absolutePath,
    ],
    {encoding: "utf8"},
  );
  const seconds = Number(String(stdout).trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Не удалось определить длительность: ${absolutePath}`);
  }
  return Math.max(50, Math.round(seconds * 1000));
};
