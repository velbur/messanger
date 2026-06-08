import os from "node:os";
import path from "node:path";
import {mkdir} from "node:fs/promises";
import {bundle} from "@remotion/bundler";
import {renderMedia, selectComposition} from "@remotion/renderer";

const entryPoint = path.resolve("src/index.ts");
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
 * @param {{
 *   conversation: object,
 *   outputPath: string,
 *   concurrency?: number,
 *   onProgress?: (progress: import("@remotion/renderer").RenderMediaProgress) => void,
 *   cancelSignal?: import("@remotion/renderer").CancelSignal,
 *   onCompositionReady?: (durationInFrames: number) => void,
 * }} opts
 */
export async function renderChatVideo({
  conversation,
  outputPath,
  concurrency,
  onProgress,
  cancelSignal,
  onCompositionReady,
}) {
  const outputAbs = path.resolve(outputPath);
  await mkdir(path.dirname(outputAbs), {recursive: true});

  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ChatVideo",
    inputProps: {conversation},
  });

  onCompositionReady?.(composition.durationInFrames);

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
  });

  return outputAbs;
}
