import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {pipeline, RawImage, env} from "@xenova/transformers";
import {STORY_DEPTH_MODEL} from "./story-depth-spec.mjs";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";
import {
  describeDepthV2Status,
  inferDepthV2Batch,
  isDepthV2Available,
  readDepthRawFile,
} from "./story-depth-v2.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const CACHE_DIR = path.join(ROOT, ".cache/huggingface");

/** Меняй при правках алгоритма — старые depth-карты пересоберутся */
export const DEPTH_LAYER_VERSION = 13;

const DEPTH_BLUR_SIGMA = 4;
const ALPHA_FEATHER_SIGMA = 3.2;
/** Лёгкое размытие только под самым ближним планом */
const BACKGROUND_PLATE_BLUR_SIGMA = 14;

env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;

let depthEstimatorPromise = null;
let resolvedProviderPromise = null;

const getDepthEstimator = () => {
  if (!depthEstimatorPromise) {
    depthEstimatorPromise = pipeline("depth-estimation", STORY_DEPTH_MODEL);
  }
  return depthEstimatorPromise;
};

const safePublicAbs = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь к изображению");
  }
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь к изображению");
  }
  return {relative: normalized, absolute};
};

const readDepthMeta = async (paths) => {
  try {
    const metaAbs = safePublicAbs(
      String(paths.mid).replace(/\.layer-mid\.png$/, ".depth-meta.json"),
    ).absolute;
    const raw = await fs.readFile(metaAbs, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** xenova | depth-v2 */
export const resolveDepthProvider = async () => {
  const explicit = process.env.STORY_DEPTH_PROVIDER?.trim().toLowerCase();
  if (explicit === "xenova") {
    return "xenova";
  }
  if (explicit === "depth-v2" || explicit === "v2") {
    if (!(await isDepthV2Available())) {
      throw new Error(
        "STORY_DEPTH_PROVIDER=depth-v2, но Python/transformers недоступны. На воркере: WORKER_GPU=1 ./run.sh worker --build",
      );
    }
    return "depth-v2";
  }
  if (explicit === "auto" || !explicit) {
    if (await isDepthV2Available()) {
      return "depth-v2";
    }
    return "xenova";
  }
  throw new Error(`Неизвестный STORY_DEPTH_PROVIDER: ${explicit}`);
};

export const getResolvedDepthProvider = async () => {
  if (!resolvedProviderPromise) {
    resolvedProviderPromise = resolveDepthProvider();
  }
  return resolvedProviderPromise;
};

export const probeStoryDepth = async () => {
  const provider = await getResolvedDepthProvider();
  if (provider === "depth-v2") {
    return {
      provider,
      ...(await describeDepthV2Status().then((message) => ({message}))),
    };
  }
  return {provider, message: `Depth Xenova: ${STORY_DEPTH_MODEL}`};
};

const smoothstep = (edge0, edge1, x) => {
  const span = Math.max(edge1 - edge0, 1e-6);
  const t = Math.max(0, Math.min(1, (x - edge0) / span));
  return t * t * (3 - 2 * t);
};

const depthToUint8 = (depthData, pixelCount) => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pixelCount; i += 1) {
    const value = depthData[i];
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  const range = Math.max(max - min, 1e-6);
  const out = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    out[i] = Math.round(((depthData[i] - min) / range) * 255);
  }
  return out;
};

const resizeDepthToMatch = async (depthUint8, depthW, depthH, targetW, targetH) => {
  if (depthW === targetW && depthH === targetH) {
    return depthUint8;
  }
  const resized = await sharp(Buffer.from(depthUint8), {
    raw: {width: depthW, height: depthH, channels: 1},
  })
    .toColourspace("b-w")
    .resize(targetW, targetH, {fit: "fill"})
    .greyscale()
    .raw()
    .toBuffer();
  return new Uint8Array(resized);
};

const blurDepthMap = async (depthUint8, width, height) => {
  // blur на raw channels:1 даёт горизонтальные полосы — сначала в greyscale-изображение
  const blurred = await sharp(Buffer.from(depthUint8), {
    raw: {width, height, channels: 1},
  })
    .toColourspace("b-w")
    .blur(DEPTH_BLUR_SIGMA)
    .greyscale()
    .raw()
    .toBuffer();
  return new Uint8Array(blurred);
};

const layerWeights = (depthByte) => {
  const d = depthByte / 255;
  const near = smoothstep(0.74, 0.96, d);
  const far = 1 - smoothstep(0.06, 0.32, d);
  let mid = Math.max(0, 1 - far - near);
  const sum = far + mid + near;
  if (sum < 1e-6) {
    return {far: 1 / 3, mid: 1 / 3, near: 1 / 3};
  }
  return {far: far / sum, mid: mid / sum, near: near / sum};
};

const buildBackgroundPlate = (source, blurredSource, depthUint8, width, height) => {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const {near} = layerWeights(depthUint8[i]);
    const hole = Math.min(1, near ** 1.35 * 0.75);
    const si = i * 4;
    for (let c = 0; c < 3; c += 1) {
      out[si + c] = Math.round(source[si + c] * (1 - hole) + blurredSource[si + c] * hole);
    }
    out[si + 3] = 255;
  }
  return out;
};

const blurSourcePlate = async (source, width, height) => {
  return sharp(source, {raw: {width, height, channels: 4}})
    .blur(BACKGROUND_PLATE_BLUR_SIGMA)
    .raw()
    .toBuffer();
};

const buildBandLayer = (source, depthUint8, width, height, band) => {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const weights = layerWeights(depthUint8[i]);
    const weight = band === "far" ? weights.far : band === "mid" ? weights.mid : weights.near;
    const alpha = Math.round(weight * 255);
    const si = i * 4;
    out[si] = source[si];
    out[si + 1] = source[si + 1];
    out[si + 2] = source[si + 2];
    out[si + 3] = alpha;
  }
  return out;
};

const erodeLayerAlpha = (buffer, width, height, radius = 2) => {
  const out = Buffer.from(buffer);
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const i = y * width + x;
      let minA = 255;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const j = (y + dy) * width + (x + dx);
          minA = Math.min(minA, buffer[j * 4 + 3]);
        }
      }
      out[i * 4 + 3] = minA;
    }
  }
  return out;
};

const featherLayerAlpha = async (buffer, width, height) => {
  const pixelCount = width * height;
  const alpha = Buffer.alloc(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    alpha[i] = buffer[i * 4 + 3];
  }

  const blurredAlpha = await sharp(Buffer.from(alpha), {raw: {width, height, channels: 1}})
    .toColourspace("b-w")
    .blur(ALPHA_FEATHER_SIGMA)
    .greyscale()
    .raw()
    .toBuffer();

  const out = Buffer.from(buffer);
  for (let i = 0; i < pixelCount; i += 1) {
    const original = buffer[i * 4 + 3];
    const feathered = blurredAlpha[i];
    out[i * 4 + 3] = Math.round((original * feathered) / 255);
  }
  return out;
};

const writeLayerPngs = async ({imageAbs, depthUint8, width, height, paths, metaExtra = {}}) => {
  const softenedDepth = await blurDepthMap(depthUint8, width, height);
  const source = await sharp(imageAbs).ensureAlpha().raw().toBuffer();
  const blurredSource = await blurSourcePlate(source, width, height);

  const far = buildBackgroundPlate(source, blurredSource, softenedDepth, width, height);
  const mid = await featherLayerAlpha(
    buildBandLayer(source, softenedDepth, width, height, "mid"),
    width,
    height,
  );
  const near = await featherLayerAlpha(
    erodeLayerAlpha(
      buildBandLayer(source, softenedDepth, width, height, "near"),
      width,
      height,
      2,
    ),
    width,
    height,
  );

  const depthAbs = safePublicAbs(paths.depth).absolute;
  const metaAbs = safePublicAbs(
    String(paths.mid).replace(/\.layer-mid\.png$/, ".depth-meta.json"),
  ).absolute;
  await fs.mkdir(path.dirname(depthAbs), {recursive: true});

  await sharp(Buffer.from(softenedDepth), {raw: {width, height, channels: 1}})
    .toColourspace("b-w")
    .png()
    .toFile(depthAbs);

  const writeLayer = async (buffer, rel) => {
    const abs = safePublicAbs(rel).absolute;
    await sharp(buffer, {raw: {width, height, channels: 4}}).png().toFile(abs);
  };

  await writeLayer(far, paths.far);
  await writeLayer(mid, paths.mid);
  await writeLayer(near, paths.near);
  await fs.writeFile(
    metaAbs,
    `${JSON.stringify({version: DEPTH_LAYER_VERSION, mode: "layers", ...metaExtra})}\n`,
    "utf8",
  );
};

export const isStoryDepthAvailable = async (imagePublicPath) => {
  const paths = storyLayerPaths(imagePublicPath);
  try {
    const meta = await readDepthMeta(paths);
    if (!meta || Number(meta.version) < DEPTH_LAYER_VERSION || meta.mode !== "layers") {
      return false;
    }
    await fs.access(safePublicAbs(paths.depth).absolute);
    await fs.access(safePublicAbs(paths.far).absolute);
    await fs.access(safePublicAbs(paths.mid).absolute);
    await fs.access(safePublicAbs(paths.near).absolute);
    return true;
  } catch {
    return false;
  }
};

const inferDepthXenova = async (imageAbs) => {
  const estimator = await getDepthEstimator();
  const rawImage = await RawImage.read(imageAbs);
  const result = await estimator(rawImage);
  const depthImage = result.depth ?? result.predicted_depth ?? result;
  const depthData = depthImage.data ?? depthImage;
  const depthW = depthImage.width;
  const depthH = depthImage.height;

  const meta = await sharp(imageAbs).metadata();
  const width = meta.width ?? depthW;
  const height = meta.height ?? depthH;
  const pixelCount = width * height;

  const normalized = depthToUint8(depthData, depthW * depthH);
  const depthUint8 = await resizeDepthToMatch(normalized, depthW, depthH, width, height);

  if (depthUint8.length !== pixelCount) {
    throw new Error(`Depth map size mismatch: ${depthUint8.length} vs ${pixelCount}`);
  }

  return {depthUint8, width, height, metaExtra: {provider: "xenova", model: STORY_DEPTH_MODEL}};
};

const inferDepthMaps = async (targets, provider) => {
  if (provider === "depth-v2") {
    const absPaths = targets.map((rel) => safePublicAbs(rel).absolute);
    const batch = await inferDepthV2Batch(absPaths);
    const byImage = new Map(batch.map((item) => [item.image, item]));
    const out = new Map();
    for (const rel of targets) {
      const abs = safePublicAbs(rel).absolute;
      const item = byImage.get(abs);
      if (!item) {
        throw new Error(`Depth V2: нет результата для ${rel}`);
      }
      const {depthUint8, width, height} = await readDepthRawFile(item.raw);
      out.set(rel, {
        depthUint8,
        width,
        height,
        metaExtra: {provider: "depth-v2", model: item.model, device: item.device},
      });
    }
    return out;
  }

  const out = new Map();
  for (const rel of targets) {
    const {absolute} = safePublicAbs(rel);
    out.set(rel, await inferDepthXenova(absolute));
  }
  return out;
};

export const generateStoryDepthAssets = async (imagePublicPath, {force = false} = {}) => {
  const rel = String(imagePublicPath).replace(/^\/+/, "").trim();
  if (!rel) {
    throw new Error("Пустой путь к story-изображению");
  }

  const paths = storyLayerPaths(rel);
  if (!force && (await isStoryDepthAvailable(rel))) {
    return {skipped: true, paths, relative: rel};
  }

  const {absolute: imageAbs} = safePublicAbs(rel);
  await fs.access(imageAbs);

  const provider = await getResolvedDepthProvider();
  const depthMaps = await inferDepthMaps([rel], provider);
  const {depthUint8, width, height, metaExtra} = depthMaps.get(rel);

  await writeLayerPngs({imageAbs, depthUint8, width, height, paths, metaExtra});

  return {skipped: false, paths, relative: rel, width, height, provider, metaExtra};
};

export const ensureStoryDepthForConversation = async (conversation, {force = false} = {}) => {
  if (!isStoryVisualLayout(conversation)) {
    return [];
  }

  if (conversation?.story?.depthParallax === false) {
    return [];
  }

  const logs = [];
  const targets = [];

  const openingImage = conversation?.story?.opening?.image?.trim();
  if (openingImage) {
    targets.push(openingImage);
  }

  for (const message of conversation?.messages ?? []) {
    const storyImage = message?.storyImage?.trim();
    if (storyImage) {
      targets.push(storyImage);
    }
  }

  const pending = [];
  for (const imagePath of targets) {
    if (!force && (await isStoryDepthAvailable(imagePath))) {
      logs.push(`Depth: слои уже есть → ${imagePath}`);
    } else {
      pending.push(imagePath);
    }
  }

  if (pending.length === 0) {
    return logs;
  }

  const provider = await getResolvedDepthProvider();
  if (provider === "depth-v2") {
    logs.push(await describeDepthV2Status());
  } else {
    logs.push(`Depth Xenova: ${STORY_DEPTH_MODEL}`);
  }

  const depthMaps = await inferDepthMaps(pending, provider);

  for (const imagePath of pending) {
    try {
      const {absolute: imageAbs} = safePublicAbs(imagePath);
      const paths = storyLayerPaths(imagePath);
      const entry = depthMaps.get(imagePath);
      if (!entry) {
        throw new Error("Нет depth map");
      }
      await writeLayerPngs({
        imageAbs,
        depthUint8: entry.depthUint8,
        width: entry.width,
        height: entry.height,
        paths,
        metaExtra: entry.metaExtra,
      });
      const model = entry.metaExtra?.model ? ` (${entry.metaExtra.model})` : "";
      logs.push(`Depth: слои созданы${model} → ${imagePath}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.push(`Depth: ошибка для ${imagePath}: ${reason}`);
    }
  }

  return logs;
};

export const ensureStoryDepthForPublicPath = async (relativePath, options = {}) => {
  const result = await generateStoryDepthAssets(relativePath, options);
  return result.skipped
    ? `Depth: слои уже есть → ${relativePath}`
    : `Depth: слои созданы → ${relativePath}`;
};
