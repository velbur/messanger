import path from "node:path";
import {mkdir} from "node:fs/promises";
import {bundle} from "@remotion/bundler";
import {renderMedia, selectComposition} from "@remotion/renderer";

const entryPoint = path.resolve("src/index.ts");
const DEFAULT_CONCURRENCY = 5;

/** @returns {number} 1–16, по умолчанию 5 (оптимально для ~16 GB RAM) */
export const getRenderConcurrency = () => {
  const raw = process.env.RENDER_CONCURRENCY;
  if (raw === undefined || raw === "") {
    return DEFAULT_CONCURRENCY;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CONCURRENCY;
  }
  return Math.min(16, Math.max(1, parsed));
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
