import os from "node:os";
import path from "node:path";
import {mkdir} from "node:fs/promises";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import {getBundleLocation} from "./bundle-cache.mjs";
import {buildTimeline, pickThumbnailFrame} from "../src/chat/timeline.ts";

const DEFAULT_CONCURRENCY = 5;

/** Число доступных ядер (Remotion не разрешает concurrency больше этого значения) */
const getCpuCount = () => {
  const available =
    typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, available || 1);
};

/** @returns {number} 1..(число ядер), по умолчанию 5; всегда ограничено числом CPU */
export const getRenderConcurrency = () => {
  const maxCpus = getCpuCount();
  const raw = process.env.RENDER_CONCURRENCY;
  const requested =
    raw === undefined || raw === "" ? DEFAULT_CONCURRENCY : Number.parseInt(raw, 10);
  const safe = Number.isFinite(requested) ? requested : DEFAULT_CONCURRENCY;
  return Math.min(maxCpus, Math.max(1, safe));
};

/**
 * @param {{ projectRoot: string, inputRel: string, outputRel: string }} opts
 */
export const buildNativeRenderCommand = ({projectRoot, inputRel, outputRel}) => {
  const concurrency = getRenderConcurrency();
  const root = projectRoot.includes(" ") ? `"${projectRoot}"` : projectRoot;
  return `cd ${root} && RENDER_CONCURRENCY=${concurrency} node --import tsx scripts/render.mjs --input ${inputRel} --output ${outputRel}`;
};

/**
 * Пресет x264: ускоряет этап кодирования (финальный "хвост") без изменения CRF.
 * "veryfast" заметно быстрее дефолтного "medium"; качество при том же CRF
 * перцептивно то же, файл лишь немного больше. Переопределяется X264_PRESET.
 */
const getX264Preset = () => {
  const valid = new Set([
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
  ]);
  const raw = (process.env.X264_PRESET ?? "").trim().toLowerCase();
  return valid.has(raw) ? raw : "veryfast";
};

/**
 * Аппаратное кодирование (h264_videotoolbox на macOS). Только нативный запуск,
 * НЕ в Docker/podman (Linux-VM не видит медиа-движок Apple). Включается
 * REMOTION_HW=1; CRF несовместим с HW, поэтому используется videoBitrate.
 */
const getHardwareAccelerationOptions = () => {
  const enabled = ["1", "true", "yes"].includes(
    (process.env.REMOTION_HW ?? "").trim().toLowerCase(),
  );
  if (!enabled) {
    return null;
  }
  const bitrate = (process.env.VIDEO_BITRATE ?? "20M").trim() || "20M";
  return {hardwareAcceleration: "if-possible", videoBitrate: bitrate};
};

/**
 * @param {{
 *   conversation: object,
 *   outputPath: string,
 *   concurrency?: number,
 *   onProgress?: (progress: import("@remotion/renderer").RenderMediaProgress) => void,
 *   cancelSignal?: import("@remotion/renderer").CancelSignal,
 *   onCompositionReady?: (durationInFrames: number) => void,
 *   onBundleStatus?: (message: string) => void,
 * }} opts
 */
export async function renderChatVideo({
  conversation,
  outputPath,
  concurrency,
  onProgress,
  cancelSignal,
  onCompositionReady,
  onBundleStatus,
}) {
  const outputAbs = path.resolve(outputPath);
  await mkdir(path.dirname(outputAbs), {recursive: true});

  const bundleLocation = await getBundleLocation({onStatus: onBundleStatus});

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ChatVideo",
    inputProps: {conversation},
  });

  onCompositionReady?.(composition.durationInFrames);

  const hwOptions = getHardwareAccelerationOptions();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: outputAbs,
    inputProps: {conversation},
    concurrency: concurrency ?? getRenderConcurrency(),
    onProgress,
    cancelSignal,
    // x264Preset применим только к программному libx264; для videotoolbox опция -preset недопустима
    ...(hwOptions ?? {x264Preset: getX264Preset()}),
  });

  return outputAbs;
}

/**
 * @param {{
 *   conversation: object,
 *   outputPath: string,
 *   onBundleStatus?: (message: string) => void,
 * }} opts
 */
export async function renderChatThumbnail({conversation, outputPath, onBundleStatus}) {
  const outputAbs = path.resolve(outputPath);
  await mkdir(path.dirname(outputAbs), {recursive: true});

  const bundleLocation = await getBundleLocation({onStatus: onBundleStatus ?? (() => {})});
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ChatVideo",
    inputProps: {conversation},
  });

  const timeline = buildTimeline(conversation);
  const frame = pickThumbnailFrame(timeline, composition.durationInFrames);

  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputAbs,
    inputProps: {conversation},
    frame,
    imageFormat: "jpeg",
    jpegQuality: 88,
  });

  return outputAbs;
}
