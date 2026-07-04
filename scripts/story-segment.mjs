/**
 * Семантическая сегментация кадра (ADE20K, SegFormer через @xenova/transformers)
 * → маски «оживляемых» зон для procedural motion в parallax:
 *   - vegetation (деревья/кусты/трава/цветы) → покачивание на ветру;
 *   - sky (небо/облака) → медленный дрейф;
 *   - water (вода/море/река) → шиммер.
 *
 * Работает и на Mac, и на воркере (тот же xenova, без torch). Классы берутся по
 * семантике, а не по цвету — устойчиво к стилизованной тёплой палитре иллюстраций,
 * где листва не «зелёная» в RGB-смысле.
 */
import path from "node:path";
import sharp from "sharp";
import {pipeline, RawImage, env} from "@xenova/transformers";

const ROOT = path.resolve(import.meta.dirname, "..");
env.cacheDir = path.join(ROOT, ".cache/huggingface");
env.allowLocalModels = false;

const SEG_MODEL =
  process.env.STORY_SEG_MODEL?.trim() || "Xenova/segformer-b0-finetuned-ade-512-512";

/** ADE20K-классы (label из pipeline) по категориям движения */
const VEG_LABELS = new Set([
  "tree",
  "plant",
  "grass",
  "flower",
  "palm, palm tree",
  "palm",
  "bush",
  "field",
  "hedge",
  "vine",
]);
const SKY_LABELS = new Set(["sky", "clouds", "cloud"]);
const WATER_LABELS = new Set([
  "water",
  "sea",
  "river",
  "lake",
  "waterfall, falls",
  "waterfall",
  "fountain",
  "swimming pool, swimming bath, natatorium",
  "pool",
]);

let segmenterPromise = null;
const getSegmenter = () => {
  if (!segmenterPromise) {
    segmenterPromise = pipeline("image-segmentation", SEG_MODEL);
  }
  return segmenterPromise;
};

/** Пробный запуск — модель грузится/импортируется */
export const isSegmentationAvailable = async () => {
  try {
    await getSegmenter();
    return true;
  } catch {
    return false;
  }
};

const categoryFor = (label) => {
  const key = String(label ?? "").toLowerCase();
  if (VEG_LABELS.has(key)) return "veg";
  if (SKY_LABELS.has(key)) return "sky";
  if (WATER_LABELS.has(key)) return "water";
  return null;
};

/** Слить mask сегмента (0/255) в аккумулятор по OR (max) */
const orInto = (acc, maskData) => {
  const n = Math.min(acc.length, maskData.length);
  for (let i = 0; i < n; i += 1) {
    if (maskData[i] > acc[i]) {
      acc[i] = maskData[i];
    }
  }
};

const resizeMask = async (data, srcW, srcH, dstW, dstH) => {
  if (srcW === dstW && srcH === dstH) {
    return new Uint8Array(data);
  }
  const out = await sharp(Buffer.from(data), {raw: {width: srcW, height: srcH, channels: 1}})
    .resize(dstW, dstH, {fit: "fill"})
    .greyscale()
    .raw()
    .toBuffer();
  return new Uint8Array(out);
};

/**
 * Маски «живых» зон для картинки в целевом разрешении.
 * @returns {{vegUint8: Uint8Array, skyUint8: Uint8Array, waterUint8: Uint8Array,
 *   width: number, height: number, coverage: {veg: number, sky: number, water: number}}}
 */
export const inferAliveMasks = async (imageAbs, targetWidth, targetHeight) => {
  const segmenter = await getSegmenter();
  const image = await RawImage.read(imageAbs);
  const segments = await segmenter(image);

  const pixelCount = targetWidth * targetHeight;
  const veg = new Uint8Array(pixelCount);
  const sky = new Uint8Array(pixelCount);
  const water = new Uint8Array(pixelCount);

  for (const seg of segments) {
    const cat = categoryFor(seg.label);
    if (!cat || !seg.mask?.data) {
      continue;
    }
    const {data, width, height} = seg.mask;
    const resized = await resizeMask(data, width, height, targetWidth, targetHeight);
    if (cat === "veg") orInto(veg, resized);
    else if (cat === "sky") orInto(sky, resized);
    else orInto(water, resized);
  }

  const frac = (arr) => {
    let on = 0;
    for (let i = 0; i < arr.length; i += 1) {
      if (arr[i] > 127) on += 1;
    }
    return arr.length ? on / arr.length : 0;
  };

  return {
    vegUint8: veg,
    skyUint8: sky,
    waterUint8: water,
    width: targetWidth,
    height: targetHeight,
    coverage: {veg: frac(veg), sky: frac(sky), water: frac(water)},
    model: SEG_MODEL,
  };
};
