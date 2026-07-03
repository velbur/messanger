import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {pipeline, RawImage, env} from "@xenova/transformers";
import {STORY_DEPTH_MODEL} from "./story-depth-spec.mjs";
import {isStoryVisualLayout} from "./image-assets.mjs";
import {mergeStoryConfig} from "../src/chat/story.ts";
import {existsSync} from "node:fs";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";
import {
  storyVideoHoldFramePathForVideo,
  storyVideoPathForImage,
} from "../src/chat/story-video-paths.ts";
import {hashSeed, parallaxMotionVectorsForScene} from "../src/chat/story-motion.ts";
import {FPS} from "../src/chat/fps.ts";
import {storyParallaxBakePlanByImage} from "../src/chat/timeline.ts";
import {
  assertParallaxBakeAvailable,
  bakeParallaxVideos,
  evenEncodeDim,
} from "./parallax-bake.mjs";
import {ensureStoryVideoHoldFrameFile} from "./story-video-hold-frame.mjs";
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
export const DEPTH_LAYER_VERSION = 47;

/** Доля ширины кадра — амплитуда движения камеры */
const PARALLAX_AMPLITUDE_FRAC = 0.1;
/** Ken Burns-зум поверх parallax */
const PARALLAX_ZOOM_FRAC = 0.046;
/** Кадров в bake, если нет таймлайна разговора (тест / одиночный кадр) */
const PARALLAX_DEFAULT_FRAMES = 90;
const PARALLAX_MOTION = "linear";
/** Профиль движения: round-trip = туда и обратно за одну сцену */
const PARALLAX_SWEEP = "round-trip";
/** После Veo: покачивание влево-вправо до конца фазы */
export const VIDEO_PARALLAX_HOLD_SWEEP = "oscillate";
/** Полных циклов влево→вправо→влево за фазу parallax (~4 за 15 с) */
export const VIDEO_PARALLAX_HOLD_OSCILLATIONS = 1;
/** Зум за фазу parallax; t=0 → 1.0 (стык с hold PNG) */
export const VIDEO_PARALLAX_HOLD_ZOOM_FRAC = 0.036;
/** Амплитуда hold-фазы после Veo — между «слабо» и «артефакты» */
export const VIDEO_PARALLAX_HOLD_AMPLITUDE_FRAC = 0.15;

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
  sweep = PARALLAX_SWEEP,
  zoomFrac = PARALLAX_ZOOM_FRAC,
  holdHandoff = false,
  amplitudeFrac = PARALLAX_AMPLITUDE_FRAC,
  oscillations,
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
        amplitudePx: Math.max(12, Math.round(width * amplitudeFrac)),
        panX: pan.panX,
        panY: pan.panY,
        motion: PARALLAX_MOTION,
        sweep,
        zoomFrac,
        holdHandoff,
        panYGain: holdHandoff && sweep === "oscillate" ? 0.22 : holdHandoff ? 0.42 : undefined,
        oscillations:
          holdHandoff && sweep === "oscillate"
            ? (oscillations ?? VIDEO_PARALLAX_HOLD_OSCILLATIONS)
            : undefined,
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
        sweep,
        frames,
        fps: FPS,
        width,
        height,
        zoomFrac,
        holdHandoff,
        amplitudeFrac,
        oscillations: oscillations ?? null,
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

export const isStoryDepthAvailable = async (
  imagePublicPath,
  {requiredFrames, requiredPanX, requiredSweep, requiredHoldHandoff} = {},
) => {
  const paths = storyLayerPaths(imagePublicPath);
  try {
    const meta = await readDepthMeta(paths);
    if (!meta || Number(meta.version) < DEPTH_LAYER_VERSION || meta.mode !== "video") {
      return false;
    }
    if (meta.provider === "kenburns-fallback") {
      return false;
    }
    if (meta.motion !== PARALLAX_MOTION) {
      return false;
    }
    if (meta.sweep !== (requiredSweep ?? PARALLAX_SWEEP)) {
      return false;
    }
    if (requiredHoldHandoff === true && meta.holdHandoff !== true) {
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
  {
    force = false,
    frames = PARALLAX_DEFAULT_FRAMES,
    sweep = PARALLAX_SWEEP,
    holdHandoff = false,
    zoomFrac = PARALLAX_ZOOM_FRAC,
    amplitudeFrac = PARALLAX_AMPLITUDE_FRAC,
    oscillations,
  } = {},
) => {
  const rel = String(imagePublicPath).replace(/^\/+/, "").trim();
  if (!rel) {
    throw new Error("Пустой путь к story-изображению");
  }

  const paths = storyLayerPaths(rel);
  if (
    !force &&
    (await isStoryDepthAvailable(rel, {
      requiredFrames: frames,
      requiredSweep: sweep,
      requiredHoldHandoff: holdHandoff ? true : undefined,
    }))
  ) {
    return {skipped: true, paths, relative: rel};
  }

  const {absolute: imageAbs} = safePublicAbs(rel);
  await fs.access(imageAbs);

  await assertParallaxBakeAvailable();

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
    sweep,
    zoomFrac,
    holdHandoff,
    amplitudeFrac,
    oscillations:
      holdHandoff && sweep === "oscillate" ? VIDEO_PARALLAX_HOLD_OSCILLATIONS : undefined,
  });

  return {skipped: false, paths, relative: rel, width, height, provider, metaExtra};
};

/**
 * Parallax для video-parallax: depth+bake с последнего кадра Veo (.video-hold.png),
 * а не с исходного story-PNG (иначе скачок позы при crossfade).
 */
export const ensureVideoParallaxHoldDepth = async (
  imagePublicPath,
  {force = false, frames = PARALLAX_DEFAULT_FRAMES, videoRef, sweep = VIDEO_PARALLAX_HOLD_SWEEP} = {},
) => {
  const imageRel = String(imagePublicPath).replace(/^\/+/, "").trim();
  if (!imageRel) {
    throw new Error("Пустой путь к story-изображению");
  }
  const video = String(videoRef ?? storyVideoPathForImage(imageRel))
    .replace(/^\/+/, "")
    .trim();
  await ensureStoryVideoHoldFrameFile(video);
  const holdRel = storyVideoHoldFramePathForVideo(video);
  return generateStoryDepthAssets(holdRel, {
    force,
    frames,
    sweep,
    holdHandoff: true,
    zoomFrac: VIDEO_PARALLAX_HOLD_ZOOM_FRAC,
    amplitudeFrac: VIDEO_PARALLAX_HOLD_AMPLITUDE_FRAC,
    oscillations: VIDEO_PARALLAX_HOLD_OSCILLATIONS,
  });
};

const storyImagesWithVideoHybrid = (conversation) => {
  const set = new Set();
  if (mergeStoryConfig(conversation).opening.animation !== "video-parallax") {
    return set;
  }

  const addIfVideo = (image, holder) => {
    const imagePath = String(image ?? "").trim().replace(/^\/+/, "");
    if (!imagePath) {
      return;
    }
    const videoRef = String(holder?.storyVideo ?? "").trim();
    if (videoRef) {
      try {
        const {absolute} = safePublicAbs(videoRef);
        if (existsSync(absolute)) {
          set.add(imagePath);
          return;
        }
      } catch {
        /* try default path */
      }
    }
    try {
      const candidate = storyVideoPathForImage(imagePath);
      const {absolute} = safePublicAbs(candidate);
      if (existsSync(absolute)) {
        set.add(imagePath);
      }
    } catch {
      /* skip */
    }
  };

  addIfVideo(conversation?.story?.opening?.image, conversation?.story?.opening);
  for (const message of conversation?.messages ?? []) {
    addIfVideo(message?.storyImage, message);
  }

  return set;
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
  const skipPngParallax = storyImagesWithVideoHybrid(conversation);
  const targets = [...bakePlanByImage.keys()].filter((imagePath) => !skipPngParallax.has(imagePath));

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

  await assertParallaxBakeAvailable();

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
    const {absolute: imageAbs} = safePublicAbs(imagePath);
    const paths = storyLayerPaths(imagePath);
    const entry = depthMaps.get(imagePath);
    if (!entry) {
      throw new Error(`Parallax: нет depth map для ${imagePath}`);
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
  }

  return logs;
};

export const ensureStoryDepthForPublicPath = async (relativePath, options = {}) => {
  const result = await generateStoryDepthAssets(relativePath, options);
  return result.skipped
    ? `Parallax: ассеты уже есть → ${relativePath}`
    : `Parallax: clip запечён → ${relativePath}`;
};
