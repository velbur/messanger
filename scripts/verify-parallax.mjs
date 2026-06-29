#!/usr/bin/env node
/**
 * Автопроверка parallax без ручного просмотра mp4.
 *
 * Запечённый loop ходит по sin(2π·t): нейтраль на кадрах 0/mid/last, экстремумы
 * смещения — на ¼ (left) и ¾ (right). Поэтому:
 *   - сила parallax = сдвиг fg vs bg между left и right (полный размах);
 *   - бесшовность = MAE(neutral, last) ≈ 0;
 *   - отличие от Ken Burns = у KB передний и задний план двигаются одинаково.
 */
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {access, mkdir, writeFile, rm} from "node:fs/promises";
import sharp from "sharp";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");

const THRESHOLDS = {
  /** Заметный parallax: размах разницы fg vs bg между экстремумами, px */
  minParallaxSeparationPx: 8,
  minNearVsFarRatio: 1.3,
  /** Ken Burns: равномерный зум геометрически даёт небольшой fg/bg-сдвиг по радиусу;
   *  главный дискриминатор — beats_kenburns (parallax кратно сильнее) */
  maxKenSeparationPx: 16,
  /** parallax должен быть ощутимо сильнее Ken Burns */
  minParallaxOverKenSeparation: 2.0,
  /** Бесшовность: средняя ошибка между кадром 0 и последним */
  maxSeamMae: 8,
  /** Край справа не должен быть чёрной полосой */
  maxEdgeDarkMean: 22,
  minEdgeInnerGap: 28,
};

const parseArg = (argv, name) => {
  const index = argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
};

const toGrey = (rgba, pixelCount) => {
  const grey = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const p = i * 4;
    grey[i] = Math.round(rgba[p] * 0.299 + rgba[p + 1] * 0.587 + rgba[p + 2] * 0.114);
  }
  return grey;
};

const loadGrey = async (absPath) => {
  const {data, info} = await sharp(absPath).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const pixels = info.width * info.height;
  return {grey: toGrey(data, pixels), w: info.width, h: info.height};
};

/** depth-карта ресайзится под размер кадра, чтобы маски совпадали по пикселям */
const loadDepthMatched = async (absPath, w, h) => {
  const {data} = await sharp(absPath)
    .greyscale()
    .resize(w, h, {fit: "fill"})
    .raw()
    .toBuffer({resolveWithObject: true});
  return {depth: new Uint8Array(data), w, h};
};

/** Горизонтальный сдвиг между кадрами внутри маски (px) */
const estimateHorizontalShift = (a, b, w, h, maskFn) => {
  let bestShift = 0;
  let bestCost = Infinity;
  const margin = Math.round(w * 0.06);
  const maxShift = Math.round(w * 0.1);

  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    let cost = 0;
    let count = 0;
    for (let y = margin; y < h - margin; y += 4) {
      for (let x = margin; x < w - margin; x += 4) {
        const i = y * w + x;
        if (!maskFn(i)) {
          continue;
        }
        const x2 = x + shift;
        if (x2 < margin || x2 >= w - margin) {
          continue;
        }
        const j = y * w + x2;
        cost += Math.abs(a[i] - b[j]);
        count += 1;
      }
    }
    if (count > 80) {
      const avg = cost / count;
      if (avg < bestCost) {
        bestCost = avg;
        bestShift = shift;
      }
    }
  }

  return {shiftPx: bestShift, confidence: bestCost < Infinity ? 1 / bestCost : 0};
};

const edgeStripeMetrics = (grey, w, h) => {
  const stripW = Math.max(3, Math.round(w * 0.012));
  const innerStart = w - stripW * 5;
  let edgeSum = 0;
  let innerSum = 0;
  let blackEdge = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = w - stripW; x < w; x += 1) {
      const v = grey[y * w + x];
      edgeSum += v;
      if (v < 18) {
        blackEdge += 1;
      }
    }
    for (let x = innerStart; x < innerStart + stripW; x += 1) {
      innerSum += grey[y * w + x];
    }
  }

  const edgeMean = edgeSum / (stripW * h);
  const innerMean = innerSum / (stripW * h);
  const blackEdgeRatio = blackEdge / (stripW * h);

  return {
    edgeMean: Math.round(edgeMean),
    innerMean: Math.round(innerMean),
    gap: Math.round(innerMean - edgeMean),
    blackEdgeRatio: Number(blackEdgeRatio.toFixed(3)),
  };
};

/** Среднее абсолютное отличие двух кадров (0..255) — для проверки бесшовности */
const meanAbsDiff = (a, b) => {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / n;
};

/** Сдвиг переднего и заднего плана между двумя кадрами */
const evaluatePair = ({greyA, greyB, depth}) => {
  const {w, h} = greyA;
  const fgMask = (i) => depth.depth[i] >= 150;
  const bgMask = (i) => depth.depth[i] <= 90;

  const fg = estimateHorizontalShift(greyA.grey, greyB.grey, w, h, fgMask);
  const bg = estimateHorizontalShift(greyA.grey, greyB.grey, w, h, bgMask);

  const nearShift = fg.shiftPx;
  const farShift = bg.shiftPx;
  const separation = Math.abs(nearShift - farShift);
  const ratio = Math.abs(nearShift) / Math.max(Math.abs(farShift), 0.5);

  return {
    nearShiftPx: Number(nearShift.toFixed(2)),
    farShiftPx: Number(farShift.toFixed(2)),
    separationPx: Number(separation.toFixed(2)),
    nearVsFarRatio: Number(ratio.toFixed(2)),
  };
};

const extractMp4Frame = async (mp4Abs, frameIndex, outAbs) => {
  await mkdir(path.dirname(outAbs), {recursive: true});
  await execFileAsync(
    "ffmpeg",
    ["-y", "-i", mp4Abs, `-vf`, `select=eq(n\\,${frameIndex})`, "-vframes", "1", outAbs],
    {stdio: "pipe"},
  );
};

const tryLoadGrey = async (absPath) => {
  try {
    await access(absPath);
    return await loadGrey(absPath);
  } catch {
    return null;
  }
};

/**
 * @param {{
 *   outDir: string,
 *   imageRel: string,
 *   mp4Rel?: string,
 *   loopFrames?: number,
 * }} opts
 */
export const verifyParallaxOutput = async ({
  outDir,
  imageRel,
  mp4Rel = "depthParallax-loop.mp4",
  loopFrames = 90,
}) => {
  const outAbs = path.resolve(outDir);
  const paths = storyLayerPaths(imageRel);
  const depthAbs = path.join(ROOT, "public", paths.depth);

  const still = (mode, label) => path.join(outAbs, `still-${mode}-${label}.png`);

  await access(depthAbs);
  await access(still("depthParallax", "left"));
  await access(still("depthParallax", "right"));

  const left = await loadGrey(still("depthParallax", "left"));
  const right = await loadGrey(still("depthParallax", "right"));
  const neutral = await tryLoadGrey(still("depthParallax", "neutral"));
  const last = await tryLoadGrey(still("depthParallax", "last"));
  const kenNeutral = await tryLoadGrey(still("kenburns", "neutral"));
  const kenPeak = await tryLoadGrey(still("kenburns", "peak"));

  const depth = await loadDepthMatched(depthAbs, left.w, left.h);

  const parallaxMotion = evaluatePair({greyA: left, greyB: right, depth});
  const kenMotion =
    kenNeutral && kenPeak
      ? evaluatePair({greyA: kenNeutral, greyB: kenPeak, depth})
      : {nearShiftPx: 0, farShiftPx: 0, separationPx: 0, nearVsFarRatio: 0};

  const seamMae = neutral && last ? Number(meanAbsDiff(neutral.grey, last.grey).toFixed(3)) : null;
  const edge = edgeStripeMetrics(right.grey, right.w, right.h);

  let mp4Check = null;
  try {
    const mp4Abs = path.join(outAbs, mp4Rel);
    await access(mp4Abs);
    const tmpDir = path.join(outAbs, ".verify-tmp");
    await mkdir(tmpDir, {recursive: true});
    const qFrame = Math.round(loopFrames * 0.25);
    const tqFrame = Math.round(loopFrames * 0.75);
    const mp4L = path.join(tmpDir, "mp4-left.png");
    const mp4R = path.join(tmpDir, "mp4-right.png");
    await extractMp4Frame(mp4Abs, qFrame, mp4L);
    await extractMp4Frame(mp4Abs, tqFrame, mp4R);
    const mp4GreyL = await loadGrey(mp4L);
    const mp4GreyR = await loadGrey(mp4R);
    const mp4Depth = await loadDepthMatched(depthAbs, mp4GreyL.w, mp4GreyL.h);
    const mp4Motion = evaluatePair({greyA: mp4GreyL, greyB: mp4GreyR, depth: mp4Depth});
    const mp4Edge = edgeStripeMetrics(mp4GreyR.grey, mp4GreyR.w, mp4GreyR.h);
    mp4Check = {motion: mp4Motion, edge: mp4Edge, qFrame, tqFrame};
    await rm(tmpDir, {recursive: true, force: true});
  } catch {
    mp4Check = {skipped: true, reason: "mp4 или ffmpeg недоступен"};
  }

  const checks = [];

  const oppositeMotion = parallaxMotion.nearShiftPx * parallaxMotion.farShiftPx < 0;
  const parallaxOk =
    parallaxMotion.separationPx >= THRESHOLDS.minParallaxSeparationPx &&
    (oppositeMotion || parallaxMotion.nearVsFarRatio >= THRESHOLDS.minNearVsFarRatio);
  checks.push({
    id: "parallax_separation",
    pass: parallaxOk,
    message: parallaxOk
      ? `Слои двигаются по-разному: Δ=${parallaxMotion.separationPx}px (near=${parallaxMotion.nearShiftPx}, far=${parallaxMotion.farShiftPx})`
      : `Слабый parallax: Δ=${parallaxMotion.separationPx}px, near=${parallaxMotion.nearShiftPx}, far=${parallaxMotion.farShiftPx}`,
  });

  if (kenNeutral && kenPeak) {
    const kenUniform = kenMotion.separationPx <= THRESHOLDS.maxKenSeparationPx;
    checks.push({
      id: "kenburns_uniform",
      pass: kenUniform,
      message: kenUniform
        ? `Ken Burns плоский: Δ=${kenMotion.separationPx}px`
        : `Ken Burns неожиданно неравномерен: Δ=${kenMotion.separationPx}px`,
    });

    const beatsKen =
      parallaxMotion.separationPx >=
      Math.max(
        THRESHOLDS.minParallaxSeparationPx,
        kenMotion.separationPx * THRESHOLDS.minParallaxOverKenSeparation,
      );
    checks.push({
      id: "beats_kenburns",
      pass: beatsKen,
      message: beatsKen
        ? `Parallax сильнее Ken Burns (${parallaxMotion.separationPx} vs ${kenMotion.separationPx}px)`
        : `Parallax ≈ Ken Burns (${parallaxMotion.separationPx} vs ${kenMotion.separationPx}px)`,
    });
  }

  if (seamMae != null) {
    const seamOk = seamMae <= THRESHOLDS.maxSeamMae;
    checks.push({
      id: "seamless_loop",
      pass: seamOk,
      message: seamOk
        ? `Loop бесшовный: MAE(0,last)=${seamMae}`
        : `Заметный стык loop: MAE(0,last)=${seamMae}`,
    });
  }

  const edgeOk =
    edge.edgeMean >= THRESHOLDS.maxEdgeDarkMean ||
    edge.gap < THRESHOLDS.minEdgeInnerGap ||
    edge.blackEdgeRatio < 0.35;
  checks.push({
    id: "edge_stripe",
    pass: edgeOk,
    message: edgeOk
      ? `Край OK (edge=${edge.edgeMean}, gap=${edge.gap})`
      : `Полоса справа: edge=${edge.edgeMean}, gap=${edge.gap}, black=${edge.blackEdgeRatio}`,
  });

  if (mp4Check && !mp4Check.skipped) {
    const mp4MotionOk = mp4Check.motion.separationPx >= THRESHOLDS.minParallaxSeparationPx;
    checks.push({
      id: "mp4_motion",
      pass: mp4MotionOk,
      message: mp4MotionOk
        ? `MP4: parallax виден (Δ=${mp4Check.motion.separationPx}px)`
        : `MP4: parallax слабый (Δ=${mp4Check.motion.separationPx}px)`,
    });
    const mp4EdgeOk =
      mp4Check.edge.edgeMean >= THRESHOLDS.maxEdgeDarkMean ||
      mp4Check.edge.gap < THRESHOLDS.minEdgeInnerGap;
    checks.push({
      id: "mp4_edge",
      pass: mp4EdgeOk,
      message: mp4EdgeOk
        ? `MP4 кадр ${mp4Check.tqFrame}: край OK`
        : `MP4 кадр ${mp4Check.tqFrame}: полоса справа (edge=${mp4Check.edge.edgeMean})`,
    });
  }

  const pass = checks.every((c) => c.pass);
  const verdict = pass ? "PASS" : "FAIL";

  return {
    pass,
    verdict,
    thresholds: THRESHOLDS,
    parallax: parallaxMotion,
    kenburns: kenMotion,
    seamMae,
    edge,
    mp4: mp4Check,
    checks,
    summary: [
      `═══ Parallax verify: ${verdict} ═══`,
      ...checks.map((c) => `  ${c.pass ? "✓" : "✗"} ${c.message}`),
      `  near: ${parallaxMotion.nearShiftPx}px  far: ${parallaxMotion.farShiftPx}px`,
    ].join("\n"),
  };
};

const runCli = async () => {
  const argv = process.argv.slice(2);
  const outDir = parseArg(argv, "--out-dir") ?? "out/parallax-test";
  const imageRel = parseArg(argv, "--image-rel") ?? "images/parallax-test/story-opening.png";
  const loopFrames = Number.parseInt(parseArg(argv, "--loop-frames") ?? "90", 10);
  const jsonOut = parseArg(argv, "--json");

  const report = await verifyParallaxOutput({outDir, imageRel, loopFrames});

  console.log(report.summary);

  if (jsonOut) {
    const jsonAbs = path.resolve(jsonOut);
    await writeFile(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`JSON → ${path.relative(ROOT, jsonAbs)}`);
  }

  if (!report.pass && !argv.includes("--no-fail")) {
    process.exit(1);
  }
};

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
