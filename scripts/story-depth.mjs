import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {pipeline, RawImage, env} from "@xenova/transformers";
import {STORY_DEPTH_MODEL} from "./story-depth-spec.mjs";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";
import {hashSeed, parallaxMotionVectorsForScene} from "../src/chat/story-motion.ts";
import {FPS} from "../src/chat/fps.ts";
import {storyParallaxBakePlanByImage} from "../src/chat/timeline.ts";
import {
  bakeKenBurnsLoopFallback,
  bakeParallaxVideos,
  evenEncodeDim,
  isParallaxBakeAvailable,
} from "./parallax-bake.mjs";
import {
  describeDepthV2Status,
  inferDepthV2Batch,
  isDepthV2Available,
  readDepthRawFile,
} from "./story-depth-v2.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const CACHE_DIR = path.join(ROOT, ".cache/huggingface");
const RAW_TMP_DIR = path.join(ROOT, ".cache/parallax-raw");

/** Меняй при правках алгоритма — старые ассеты пересоберутся */
export const DEPTH_LAYER_VERSION = 35;

/** Доля ширины кадра — очень аккуратное смещение, чтобы не было "резины" */
const PARALLAX_AMPLITUDE_FRAC = 0.035;
/** Ken Burns-зум поверх parallax (0 = выкл) */
const PARALLAX_ZOOM_FRAC = 0.015;
/** Кадров в bake, если нет таймлайна разговора (тест / одиночный кадр) */
const PARALLAX_DEFAULT_FRAMES = 90;
const PARALLAX_MOTION = "linear";
/** Профиль движения: round-trip = туда и обратно за одну сцену */
const PARALLAX_SWEEP = "round-trip";

/** Глубинные эффекты для усиления 3D (запекаются в clip) */
const PARALLAX_FX = {
  dofStrength: 0.32,
  hazeStrength: 0.035,
  dustCount: 0,
  dustStrength: 0,
};

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

const metaRelFor = (paths) => paths.depth.replace(/\.depth\.png$/, ".depth-meta.json");

const readDepthMeta = async (paths) => {
  try {
    const metaAbs = safePublicAbs(metaRelFor(paths)).absolute;
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

/** depth uint8 → raw-файл (8 байт w,h big-endian + w*h байт) для Python-запекателя */
const writeDepthRaw = async (depthUint8, width, height) => {
  await fs.mkdir(RAW_TMP_DIR, {recursive: true});
  const header = Buffer.alloc(8);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  const body = Buffer.from(depthUint8.buffer, depthUint8.byteOffset, depthUint8.byteLength);
  const out = Buffer.concat([header, body]);
  const file = path.join(
    RAW_TMP_DIR,
    `${Date.now()}-${Math.random().toString(36).slice(2)}.raw`,
  );
  await fs.writeFile(file, out);
  return file;
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
  const width = evenEncodeDim(meta.width ?? depthW);
  const height = evenEncodeDim(meta.height ?? depthH);
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

/** Запечь parallax-clip из кадра + depth-карты в .parallax.mp4 (рядом — .depth.png) */
const bakeParallaxAsset = async ({
  rel,
  imageAbs,
  depthUint8,
  width,
  height,
  paths,
  metaExtra,
  frames = PARALLAX_DEFAULT_FRAMES,
  panX,
  panY,
}) => {
  const depthRaw = await writeDepthRaw(depthUint8, width, height);
  try {
    const pan = {panX, panY};
    const outVideo = safePublicAbs(paths.parallaxVideo).absolute;
    const outDepth = safePublicAbs(paths.depth).absolute;
    await fs.mkdir(path.dirname(outVideo), {recursive: true});

    await bakeParallaxVideos([
      {
        image: imageAbs,
        depthRaw,
        outVideo,
        outDepth,
        frames,
        fps: FPS,
        amplitudePx: Math.max(12, Math.round(width * PARALLAX_AMPLITUDE_FRAC)),
        panX: pan.panX,
        panY: pan.panY,
        motion: PARALLAX_MOTION,
        sweep: PARALLAX_SWEEP,
        zoomFrac: PARALLAX_ZOOM_FRAC,
        dofStrength: PARALLAX_FX.dofStrength,
        hazeStrength: PARALLAX_FX.hazeStrength,
        dustCount: PARALLAX_FX.dustCount,
        dustStrength: PARALLAX_FX.dustStrength,
        effectSeed: hashSeed(rel),
      },
    ]);

    const metaAbs = safePublicAbs(metaRelFor(paths)).absolute;
    await fs.writeFile(
      metaAbs,
      `${JSON.stringify({
        version: DEPTH_LAYER_VERSION,
        mode: "video",
        motion: PARALLAX_MOTION,
        sweep: PARALLAX_SWEEP,
        frames,
        fps: FPS,
        width,
        height,
        zoomFrac: PARALLAX_ZOOM_FRAC,
        panX: pan.panX,
        panY: pan.panY,
        fx: PARALLAX_FX,
        ...metaExtra,
      })}\n`,
      "utf8",
    );
  } finally {
    await fs.rm(depthRaw, {force: true});
  }
};

/** Fallback без depth: Ken Burns clip в тот же .parallax.mp4 */
const bakeFallbackAsset = async ({
  rel,
  imageAbs,
  paths,
  frames = PARALLAX_DEFAULT_FRAMES,
  panX,
  panY,
}) => {
  const meta = await sharp(imageAbs).metadata();
  const width = evenEncodeDim(meta.width ?? 1080);
  const height = evenEncodeDim(meta.height ?? 1920);
  const pan = {panX, panY};
  const outVideo = safePublicAbs(paths.parallaxVideo).absolute;
  await fs.mkdir(path.dirname(outVideo), {recursive: true});

  await bakeKenBurnsLoopFallback({
    image: imageAbs,
    width,
    height,
    outVideo,
    frames,
    fps: FPS,
    panX: pan.panX,
    panY: pan.panY,
    motion: PARALLAX_MOTION,
  });

  // Плоская depth-заглушка, чтобы isStoryDepthAvailable/verify не падали
  const depthAbs = safePublicAbs(paths.depth).absolute;
  await sharp({
    create: {width, height, channels: 1, background: {r: 128, g: 128, b: 128}},
  })
    .toColourspace("b-w")
    .png()
    .toFile(depthAbs);

  const metaAbs = safePublicAbs(metaRelFor(paths)).absolute;
  await fs.writeFile(
    metaAbs,
    `${JSON.stringify({
      version: DEPTH_LAYER_VERSION,
      mode: "video",
      motion: PARALLAX_MOTION,
      sweep: PARALLAX_SWEEP,
      frames,
      fps: FPS,
      width,
      height,
      provider: "kenburns-fallback",
      panX: pan.panX,
      panY: pan.panY,
    })}\n`,
    "utf8",
  );
};

export const isStoryDepthAvailable = async (
  imagePublicPath,
  {requiredFrames, requiredPanX} = {},
) => {
  const paths = storyLayerPaths(imagePublicPath);
  try {
    const meta = await readDepthMeta(paths);
    if (!meta || Number(meta.version) < DEPTH_LAYER_VERSION || meta.mode !== "video") {
      return false;
    }
    if (meta.motion !== PARALLAX_MOTION) {
      return false;
    }
    if (meta.sweep !== PARALLAX_SWEEP) {
      return false;
    }
    if (requiredPanX !== undefined && Number(meta.panX) !== requiredPanX) {
      return false;
    }
    if (requiredFrames && Number(meta.frames) < requiredFrames) {
      return false;
    }
    await fs.access(safePublicAbs(paths.depth).absolute);
    await fs.access(safePublicAbs(paths.parallaxVideo).absolute);
    return true;
  } catch {
    return false;
  }
};

export const generateStoryDepthAssets = async (
  imagePublicPath,
  {force = false, frames = PARALLAX_DEFAULT_FRAMES} = {},
) => {
  const rel = String(imagePublicPath).replace(/^\/+/, "").trim();
  if (!rel) {
    throw new Error("Пустой путь к story-изображению");
  }

  const paths = storyLayerPaths(rel);
  if (!force && (await isStoryDepthAvailable(rel, {requiredFrames: frames}))) {
    return {skipped: true, paths, relative: rel};
  }

  const {absolute: imageAbs} = safePublicAbs(rel);
  await fs.access(imageAbs);

  if (!(await isParallaxBakeAvailable())) {
    const {panX, panY} = parallaxMotionVectorsForScene(0);
    await bakeFallbackAsset({rel, imageAbs, paths, frames, panX, panY});
    return {skipped: false, paths, relative: rel, provider: "kenburns-fallback", fallback: true};
  }

  const provider = await getResolvedDepthProvider();
  const depthMaps = await inferDepthMaps([rel], provider);
  const {depthUint8, width, height, metaExtra} = depthMaps.get(rel);
  const {panX, panY} = parallaxMotionVectorsForScene(0);

  await bakeParallaxAsset({
    rel,
    imageAbs,
    depthUint8,
    width,
    height,
    paths,
    metaExtra,
    frames,
    panX,
    panY,
  });

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
  const bakePlanByImage = storyParallaxBakePlanByImage(conversation);
  const targets = [...bakePlanByImage.keys()];

  const pending = [];
  for (const imagePath of targets) {
    const plan = bakePlanByImage.get(imagePath) ?? {
      frames: PARALLAX_DEFAULT_FRAMES,
      sceneIndex: 0,
    };
    const {panX, panY} = parallaxMotionVectorsForScene(plan.sceneIndex);
    if (!force && (await isStoryDepthAvailable(imagePath, {requiredFrames: plan.frames, requiredPanX: panX}))) {
      logs.push(`Parallax: ассеты уже есть → ${imagePath}`);
    } else {
      pending.push({imagePath, frames: plan.frames, sceneIndex: plan.sceneIndex, panX, panY});
    }
  }

  if (pending.length === 0) {
    return logs;
  }

  if (!(await isParallaxBakeAvailable())) {
    logs.push(
      "Parallax: depth-запекатель недоступен (нет Python+opencv) — печём Ken Burns loop. Полный 3D-photo: ./run.sh setup-native",
    );
    for (const {imagePath, frames, panX, panY} of pending) {
      try {
        const {absolute: imageAbs} = safePublicAbs(imagePath);
        await bakeFallbackAsset({
          rel: imagePath,
          imageAbs,
          paths: storyLayerPaths(imagePath),
          frames,
          panX,
          panY,
        });
        logs.push(`Parallax: Ken Burns clip запечён → ${imagePath}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logs.push(`Parallax: ошибка fallback для ${imagePath}: ${reason}`);
      }
    }
    return logs;
  }

  const provider = await getResolvedDepthProvider();
  if (provider === "depth-v2") {
    logs.push(await describeDepthV2Status());
  } else {
    logs.push(`Depth Xenova: ${STORY_DEPTH_MODEL}`);
  }

  const depthMaps = await inferDepthMaps(
    pending.map(({imagePath}) => imagePath),
    provider,
  );

  for (const {imagePath, frames, sceneIndex, panX, panY} of pending) {
    try {
      const {absolute: imageAbs} = safePublicAbs(imagePath);
      const paths = storyLayerPaths(imagePath);
      const entry = depthMaps.get(imagePath);
      if (!entry) {
        throw new Error("Нет depth map");
      }
      await bakeParallaxAsset({
        rel: imagePath,
        imageAbs,
        depthUint8: entry.depthUint8,
        width: entry.width,
        height: entry.height,
        paths,
        metaExtra: entry.metaExtra,
        frames,
        panX,
        panY,
      });
      const model = entry.metaExtra?.model ? ` (${entry.metaExtra.model})` : "";
      const dir = panX > 0 ? "вправо" : "влево";
      logs.push(
        `Parallax: clip запечён (${frames} кадров, сцена ${sceneIndex}, ${dir})${model} → ${imagePath}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.push(`Parallax: ошибка для ${imagePath}: ${reason}`);
    }
  }

  return logs;
};

export const ensureStoryDepthForPublicPath = async (relativePath, options = {}) => {
  const result = await generateStoryDepthAssets(relativePath, options);
  return result.skipped
    ? `Parallax: ассеты уже есть → ${relativePath}`
    : `Parallax: clip запечён → ${relativePath}`;
};
