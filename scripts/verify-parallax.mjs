#!/usr/bin/env node
/**
 * Автопроверка parallax без ручного просмотра mp4.
 * Сравнивает still t0/peak, depth-карту; опционально кадры из mp4.
 */
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {access, mkdir, readFile, writeFile, rm} from "node:fs/promises";
import sharp from "sharp";
import {storyLayerPaths} from "../src/chat/story-depth-paths.ts";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");

const THRESHOLDS = {
  minParallaxSeparationPx: 2.5,
  minNearVsFarRatio: 1.15,
  maxKenSeparationPx: 2,
  minParallaxOverKenSeparation: 1.4,
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

const loadDepth = async (absPath) => {
  const {data, info} = await sharp(absPath).greyscale().raw().toBuffer({resolveWithObject: true});
  return {depth: new Uint8Array(data), w: info.width, h: info.height};
};

/** Горизонтальный сдвиг между кадрами в маске (px) */
const estimateHorizontalShift = (a, b, w, h, maskFn) => {
  let bestShift = 0;
  let bestCost = Infinity;
  const margin = Math.round(w * 0.06);

  for (let shift = -Math.round(w * 0.06); shift <= Math.round(w * 0.06); shift += 1) {
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

const bandMask = (depth, band) => (i) => {
  const d = depth[i];
  if (band === "near") {
    return d >= 150;
  }
  if (band === "far") {
    return d <= 95;
  }
  return d > 95 && d < 150;
};

const evaluatePair = ({greyT0, greyPeak, depth}) => {
  const {w, h} = greyT0;
  const nearT0 = estimateHorizontalShift(greyT0.grey, greyPeak.grey, w, h, bandMask(depth.depth, "near"));
  const nearPeak = estimateHorizontalShift(greyPeak.grey, greyT0.grey, w, h, bandMask(depth.depth, "near"));
  const farT0 = estimateHorizontalShift(greyT0.grey, greyPeak.grey, w, h, bandMask(depth.depth, "far"));
  const farPeak = estimateHorizontalShift(greyPeak.grey, greyT0.grey, w, h, bandMask(depth.depth, "far"));

  const nearShift = (nearT0.shiftPx - nearPeak.shiftPx) / 2;
  const farShift = (farT0.shiftPx - farPeak.shiftPx) / 2;
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
  const mp4Abs = path.join(outAbs, mp4Rel);

  await access(depthAbs);
  await access(still("depthParallax", "t0"));
  await access(still("depthParallax", "peak"));

  const depth = await loadDepth(depthAbs);
  const depthParallaxT0 = await loadGrey(still("depthParallax", "t0"));
  const depthParallaxPeak = await loadGrey(still("depthParallax", "peak"));
  const kenT0 = await loadGrey(still("kenburns", "t0"));
  const kenPeak = await loadGrey(still("kenburns", "peak"));

  const parallaxMotion = evaluatePair({
    greyT0: depthParallaxT0,
    greyPeak: depthParallaxPeak,
    depth,
  });
  const kenMotion = evaluatePair({greyT0: kenT0, greyPeak: kenPeak, depth});

  const edge = edgeStripeMetrics(depthParallaxPeak.grey, depthParallaxPeak.w, depthParallaxPeak.h);

  let mp4Check = null;
  try {
    await access(mp4Abs);
    const tmpDir = path.join(outAbs, ".verify-tmp");
    await mkdir(tmpDir, {recursive: true});
    const midFrame = Math.round(loopFrames * 0.5);
    const mp4T0 = path.join(tmpDir, "mp4-t0.png");
    const mp4Mid = path.join(tmpDir, "mp4-mid.png");
    await extractMp4Frame(mp4Abs, 0, mp4T0);
    await extractMp4Frame(mp4Abs, midFrame, mp4Mid);
    const mp4GreyT0 = await loadGrey(mp4T0);
    const mp4GreyMid = await loadGrey(mp4Mid);
    const mp4Motion = evaluatePair({greyT0: mp4GreyT0, greyPeak: mp4GreyMid, depth});
    const mp4Edge = edgeStripeMetrics(mp4GreyMid.grey, mp4GreyMid.w, mp4GreyMid.h);
    mp4Check = {motion: mp4Motion, edge: mp4Edge, midFrame};
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

  const kenUniform =
    kenMotion.separationPx <= THRESHOLDS.maxKenSeparationPx;
  checks.push({
    id: "kenburns_uniform",
    pass: kenUniform,
    message: kenUniform
      ? `Ken Burns плоский: Δ=${kenMotion.separationPx}px`
      : `Ken Burns неожиданно неравномерен: Δ=${kenMotion.separationPx}px`,
  });

  const beatsKen =
    parallaxMotion.separationPx >=
    Math.max(THRESHOLDS.minParallaxSeparationPx, kenMotion.separationPx * THRESHOLDS.minParallaxOverKenSeparation);
  checks.push({
    id: "beats_kenburns",
    pass: beatsKen,
    message: beatsKen
      ? `Parallax сильнее Ken Burns (${parallaxMotion.separationPx} vs ${kenMotion.separationPx}px)`
      : `Parallax ≈ Ken Burns (${parallaxMotion.separationPx} vs ${kenMotion.separationPx}px)`,
  });

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
    const mp4EdgeOk =
      mp4Check.edge.edgeMean >= THRESHOLDS.maxEdgeDarkMean ||
      mp4Check.edge.gap < THRESHOLDS.minEdgeInnerGap;
    checks.push({
      id: "mp4_edge",
      pass: mp4EdgeOk,
      message: mp4EdgeOk
        ? `MP4 кадр ${mp4Check.midFrame}: край OK`
        : `MP4 кадр ${mp4Check.midFrame}: полоса справа (edge=${mp4Check.edge.edgeMean})`,
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
