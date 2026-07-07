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

const isBakedVoicePath = (relativePath) => /\.pr\d+\.[^.]+$/i.test(String(relativePath ?? ""));

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

/** Скорость, уже запечённая в имени файла (.pr400 → ×4). */
export const parseBakedRateFromPath = (sourceRel) => {
  const match = String(sourceRel).match(/\.pr(\d+)\.[^.]+$/i);
  if (!match) {
    return 1;
  }
  const scaled = Number(match[1]);
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return 1;
  }
  return scaled / 100;
};

/** Найти существующий WAV: сначала оригинал, иначе путь из JSON (.pr*). */
export const resolveVoiceFileForBake = (rawRef) => {
  const normalized = String(rawRef ?? "").trim().replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("Пустой путь к озвучке");
  }

  const originalRel = originalVoicePublicPath(normalized);
  const candidates = [];
  const seen = new Set();
  const add = (rel) => {
    if (!rel || seen.has(rel)) {
      return;
    }
    seen.add(rel);
    candidates.push(rel);
  };
  add(originalRel);
  add(normalized);

  for (const rel of candidates) {
    try {
      const {absolute} = safePublicPath(rel);
      if (existsSync(absolute)) {
        return {relative: rel, absolute, originalRel};
      }
    } catch {
      /* try next */
    }
  }

  throw new Error(`Озвучка не найдена: ${originalRel}`);
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

const bakeOneVoiceFile = async (rawRef, targetRate) => {
  const {relative: sourceRel, absolute: sourceAbs, originalRel} = resolveVoiceFileForBake(rawRef);
  const sourceRate = parseBakedRateFromPath(sourceRel);
  const targetRel = bakedVoicePublicPath(originalRel, targetRate);
  const {absolute: targetAbs} = safePublicPath(targetRel);

  if (sourceRel === targetRel) {
    return {relative: sourceRel, absolute: sourceAbs, cached: true};
  }

  const effectiveAtempo = targetRate / sourceRate;
  if (Math.abs(effectiveAtempo - 1) < 0.0001) {
    if (existsSync(targetAbs)) {
      return {relative: targetRel, absolute: targetAbs, cached: true};
    }
  }

  if (!(await shouldRebake(sourceAbs, targetAbs)) && existsSync(targetAbs)) {
    return {relative: targetRel, absolute: targetAbs, cached: true};
  }

  const filter = buildAtempoFilter(effectiveAtempo);
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

/** Вернуть voiceAudio к исходным WAV (без .prNNN), если файл есть на диске. */
export const restoreOriginalVoiceAudioForConversation = async (conversation, {logs = []} = {}) => {
  if (!conversation?.voiceover?.enabled) {
    return {restored: 0};
  }

  let restored = 0;
  for (const message of conversation.messages ?? []) {
    const rawRef = String(message.voiceAudio ?? "").trim();
    if (!rawRef || !message.voiceDurationMs) {
      continue;
    }
    const sourceRel = originalVoicePublicPath(rawRef);
    if (sourceRel === rawRef && !isBakedVoicePath(rawRef)) {
      continue;
    }
    try {
      const {absolute} = safePublicPath(sourceRel);
      if (!existsSync(absolute)) {
        continue;
      }
      message.voiceAudio = sourceRel;
      message.voiceDurationMs = await probeAudioDurationMs(absolute);
      restored += 1;
    } catch {
      /* skip */
    }
  }

  if (restored > 0) {
    logs.push(`Озвучка: восстановлены исходные WAV (${restored} реплик, без .pr*)`);
  }

  return {restored};
};

/**
 * Перед рендером: вернуть voiceAudio к исходным WAV (без .pr*).
 * Скорость задаётся только ползунком через Remotion playbackRate — без ffmpeg bake.
 */
export const prepareVoiceAudioForRender = async (
  conversation,
  {logs = [], userVoiceRate: rawUserVoiceRate} = {},
) => {
  const userVoiceRate = normalizeVoicePlaybackRate(rawUserVoiceRate);
  if (!conversation?.voiceover?.enabled) {
    return {baked: 0, restored: 0, rate: 1};
  }

  const {restored} = await restoreOriginalVoiceAudioForConversation(conversation, {logs});

  if (Math.abs(userVoiceRate - 1) >= 0.01) {
    logs.push(`Озвучка: скорость ползунка ×${userVoiceRate.toFixed(2)} (Remotion playbackRate)`);
  }

  return {baked: 0, cached: 0, restored, rate: userVoiceRate, boostedClips: 0};
};

/**
 * @deprecated Используйте prepareVoiceAudioForRender
 */
export const bakeVoicePlaybackRateForConversation = async (
  conversation,
  {logs = [], rate: explicitRate} = {},
) => prepareVoiceAudioForRender(conversation, {logs, userVoiceRate: explicitRate});
