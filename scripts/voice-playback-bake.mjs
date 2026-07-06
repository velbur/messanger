import path from "node:path";
import {mkdir, stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {probeAudioDurationMs} from "./tts/audio-duration.mjs";
import {normalizeVoicePlaybackRate} from "../src/chat/voiceover.ts";

const execFileAsync = promisify(execFile);

const safePublicPath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь к аудио");
  }
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь к аудио");
  }
  return {relative: normalized, absolute};
};

/** Тег в имени файла: msg-1.pr150.wav для playbackRate 1.5 */
export const voicePlaybackRatePathTag = (rate) => {
  const rounded = Math.round(Number(rate) * 100);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return "pr100";
  }
  return `pr${rounded}`;
};

/** Путь к WAV с запечённой скоростью (или исходный при rate ≈ 1). */
export const bakedVoicePublicPath = (sourceRel, rate) => {
  const normalized = originalVoicePublicPath(sourceRel);
  if (Math.abs(rate - 1) < 0.01) {
    return normalized;
  }
  const ext = path.extname(normalized);
  const base = normalized.slice(0, -ext.length);
  return `${base}.${voicePlaybackRatePathTag(rate)}${ext}`;
};

/** Исходный WAV без суффикса .pr150 от прошлого bake. */
export const originalVoicePublicPath = (sourceRel) => {
  const normalized = String(sourceRel).replace(/^\/+/, "");
  const match = normalized.match(/^(.+)\.pr\d+(\.[^.]+)$/i);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return normalized;
};

/** Цепочка atempo как в Remotion (поддержка 0.5–4). */
export const buildAtempoFilter = (playbackRate) => {
  const rate = Number(playbackRate);
  if (!Number.isFinite(rate) || Math.abs(rate - 1) < 0.0001) {
    return null;
  }
  if (rate >= 0.5 && rate <= 2) {
    return `atempo=${rate.toFixed(5)}`;
  }
  const root = Math.sqrt(rate);
  const left = buildAtempoFilter(root);
  const right = buildAtempoFilter(root);
  return left && right ? `${left},${right}` : `atempo=${rate.toFixed(5)}`;
};

const shouldRebake = async (sourceAbs, targetAbs) => {
  if (!existsSync(targetAbs)) {
    return true;
  }
  const [srcStat, dstStat] = await Promise.all([stat(sourceAbs), stat(targetAbs)]);
  return srcStat.mtimeMs > dstStat.mtimeMs + 1;
};

const bakeOneVoiceFile = async (sourceRel, rate) => {
  const targetRel = bakedVoicePublicPath(sourceRel, rate);
  const {absolute: sourceAbs} = safePublicPath(sourceRel);
  const {absolute: targetAbs} = safePublicPath(targetRel);

  if (!existsSync(sourceAbs)) {
    throw new Error(`Озвучка не найдена: ${sourceRel}`);
  }

  if (!(await shouldRebake(sourceAbs, targetAbs))) {
    return {relative: targetRel, absolute: targetAbs, cached: true};
  }

  const filter = buildAtempoFilter(rate);
  if (!filter) {
    return {relative: sourceRel, absolute: sourceAbs, cached: true};
  }

  await mkdir(path.dirname(targetAbs), {recursive: true});
  await execFileAsync(
    process.env.FFMPEG_BIN ?? "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-i", sourceAbs, "-af", filter, targetAbs],
    {maxBuffer: 8 * 1024 * 1024},
  );

  return {relative: targetRel, absolute: targetAbs, cached: false};
};

/**
 * Запекает скорость озвучки в WAV (ffmpeg atempo). rate — из ползунка UI, не из JSON.
 */
export const bakeVoicePlaybackRateForConversation = async (
  conversation,
  {logs = [], rate: explicitRate} = {},
) => {
  const rate = normalizeVoicePlaybackRate(explicitRate);
  if (!conversation.voiceover?.enabled || Math.abs(rate - 1) < 0.01) {
    return {baked: 0, rate: 1};
  }

  let baked = 0;
  let cached = 0;

  for (const message of conversation.messages ?? []) {
    const rawRef = String(message.voiceAudio ?? "").trim();
    if (!rawRef || !message.voiceDurationMs) {
      continue;
    }
    const sourceRel = originalVoicePublicPath(rawRef);

    const result = await bakeOneVoiceFile(sourceRel, rate);
    message.voiceAudio = result.relative;
    message.voiceDurationMs = await probeAudioDurationMs(result.absolute);
    if (result.cached) {
      cached += 1;
    } else {
      baked += 1;
    }
  }

  const summary =
    baked > 0
      ? `Озвучка: скорость ×${rate.toFixed(2)} запечена в WAV (${baked} новых, ${cached} из кэша)`
      : `Озвучка: скорость ×${rate.toFixed(2)} — WAV из кэша (${cached} реплик)`;
  logs.push(summary);

  return {baked, cached, rate};
};
