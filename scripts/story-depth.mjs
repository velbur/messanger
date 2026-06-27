import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {pipeline, RawImage, env} from "@xenova/transformers";
import {STORY_DEPTH_MODEL} from "./story-depth-spec.mjs";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const CACHE_DIR = path.join(ROOT, ".cache/huggingface");

/** Меняй при правках алгоритма слоёв — старые кэши пересоберутся */
export const DEPTH_LAYER_VERSION = 2;

const DEPTH_BLUR_SIGMA = 5;
const ALPHA_FEATHER_SIGMA = 2.5;

env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;

let depthEstimatorPromise = null;

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

const readDepthMetaVersion = async (paths) => {
  try {
    const metaAbs = safePublicAbs(
      String(paths.mid).replace(/\.layer-mid\.png$/, ".depth-meta.json"),
    ).absolute;
    const raw = await fs.readFile(metaAbs, "utf8");
    const parsed = JSON.parse(raw);
    return Number(parsed?.version) || 0;
  } catch {
    return 0;
  }
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
    .resize(targetW, targetH, {fit: "fill"})
    .raw()
    .toBuffer();
  return new Uint8Array(resized);
};

const blurDepthMap = async (depthUint8, width, height) => {
  const blurred = await sharp(Buffer.from(depthUint8), {
    raw: {width, height, channels: 1},
  })
    .blur(DEPTH_BLUR_SIGMA)
    .raw()
    .toBuffer();
  return new Uint8Array(blurred);
};

const layerWeights = (depthByte) => {
  const d = depthByte / 255;
  const near = smoothstep(0.52, 0.78, d);
  const far = 1 - smoothstep(0.2, 0.42, d);
  const mid = Math.max(0, 1 - far - near);
  return {mid, near};
};

const buildOverlayLayer = (source, depthUint8, width, height, band) => {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const weights = layerWeights(depthUint8[i]);
    const alpha = Math.round((band === "mid" ? weights.mid : weights.near) * 255);
    const si = i * 4;
    out[si] = source[si];
    out[si + 1] = source[si + 1];
    out[si + 2] = source[si + 2];
    out[si + 3] = alpha;
  }
  return out;
};

const featherLayerAlpha = async (buffer, width, height) => {
  const pixelCount = width * height;
  const alpha = Buffer.alloc(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    alpha[i] = buffer[i * 4 + 3];
  }

  const blurredAlpha = await sharp(alpha, {raw: {width, height, channels: 1}})
    .blur(ALPHA_FEATHER_SIGMA)
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

const writeLayerPngs = async ({imageAbs, depthUint8, width, height, paths}) => {
  const softenedDepth = await blurDepthMap(depthUint8, width, height);
  const source = await sharp(imageAbs).ensureAlpha().raw().toBuffer();

  const mid = await featherLayerAlpha(
    buildOverlayLayer(source, softenedDepth, width, height, "mid"),
    width,
    height,
  );
  const near = await featherLayerAlpha(
    buildOverlayLayer(source, softenedDepth, width, height, "near"),
    width,
    height,
  );

  const depthAbs = safePublicAbs(paths.depth).absolute;
  const metaAbs = safePublicAbs(
    String(paths.mid).replace(/\.layer-mid\.png$/, ".depth-meta.json"),
  ).absolute;
  await fs.mkdir(path.dirname(depthAbs), {recursive: true});

  await sharp(Buffer.from(softenedDepth), {raw: {width, height, channels: 1}})
    .png()
    .toFile(depthAbs);

  const writeLayer = async (buffer, rel) => {
    const abs = safePublicAbs(rel).absolute;
    await sharp(buffer, {raw: {width, height, channels: 4}}).png().toFile(abs);
  };

  await writeLayer(mid, paths.mid);
  await writeLayer(near, paths.near);
  await fs.writeFile(metaAbs, `${JSON.stringify({version: DEPTH_LAYER_VERSION})}\n`, "utf8");
};

export const isStoryDepthAvailable = async (imagePublicPath) => {
  const paths = storyLayerPaths(imagePublicPath);
  try {
    const version = await readDepthMetaVersion(paths);
    if (version < DEPTH_LAYER_VERSION) {
      return false;
    }
    await fs.access(safePublicAbs(paths.mid).absolute);
    await fs.access(safePublicAbs(paths.near).absolute);
    return true;
  } catch {
    return false;
  }
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

  await writeLayerPngs({imageAbs, depthUint8, width, height, paths});

  return {skipped: false, paths, relative: rel, width, height};
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

  for (const imagePath of targets) {
    try {
      const result = await generateStoryDepthAssets(imagePath, {force});
      if (result.skipped) {
        logs.push(`Depth: слои уже есть → ${imagePath}`);
      } else {
        logs.push(`Depth: слои созданы → ${imagePath}`);
      }
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
