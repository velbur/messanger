import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const BAKE_SCRIPT = path.join(ROOT, "scripts/python/parallax_bake.py");

const resolvePythonBinary = () => {
  const fromEnv = process.env.STORY_DEPTH_PYTHON?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const venvPython = path.join(ROOT, ".venv/bin/python3");
  if (existsSync(venvPython)) {
    return venvPython;
  }
  return "python3";
};

const runPythonJson = (scriptAbs, stdinPayload, {timeoutMs = 1_200_000} = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(resolvePythonBinary(), [scriptAbs], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env: {...process.env},
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Python timeout (${path.basename(scriptAbs)})`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const line = stdout.trim().split("\n").filter(Boolean).pop() ?? "";
      try {
        const parsed = line ? JSON.parse(line) : {};
        if (code !== 0 || parsed.ok === false) {
          reject(new Error(parsed.error ?? stderr.trim() ?? `Python exit ${code}`));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(
          new Error(
            stderr.trim() ||
              (error instanceof Error ? error.message : String(error)) ||
              `Invalid JSON from ${path.basename(scriptAbs)}`,
          ),
        );
      }
    });

    child.stdin.write(stdinPayload);
    child.stdin.end();
  });

/** opencv доступен в Python-окружении (нужен для запекания) */
export const isParallaxBakeAvailable = async () => {
  try {
    await runPythonJson(BAKE_SCRIPT, JSON.stringify({jobs: []}), {timeoutMs: 60_000});
    return true;
  } catch {
    return false;
  }
};

const parallaxBakeUnavailableMessage = () =>
  [
    "Parallax bake недоступен: нужны Python 3, opencv и scripts/python/parallax_bake.py.",
    "Mac: ./run.sh setup-native && ./run.sh worker-native",
    "Linux + NVIDIA: WORKER_GPU=1 ./run.sh worker --build",
    "Проверка: npm run depth:probe",
  ].join(" ");

/** Без fallback — либо depth-parallax, либо явная ошибка. */
export const assertParallaxBakeAvailable = async () => {
  if (!(await isParallaxBakeAvailable())) {
    throw new Error(parallaxBakeUnavailableMessage());
  }
};

/**
 * @param {Array<{
 *   image: string,
 *   depthRaw?: string,
 *   outVideo: string,
 *   outDepth?: string,
 *   frames?: number,
 *   fps?: number,
 *   amplitudePx?: number,
 *   panX?: number,
 *   panY?: number,
 * }>} jobs
 */
export const bakeParallaxVideos = async (jobs) => {
  if (jobs.length === 0) {
    return [];
  }
  const payload = JSON.stringify({
    jobs: jobs.map((job) => ({
      image: job.image,
      depth_raw: job.depthRaw,
      out_video: job.outVideo,
      out_depth: job.outDepth,
      frames: job.frames,
      fps: job.fps,
      amplitude_px: job.amplitudePx,
      pan_x: job.panX,
      pan_y: job.panY,
      dof_strength: job.dofStrength,
      haze_strength: job.hazeStrength,
      dust_count: job.dustCount,
      dust_strength: job.dustStrength,
      effect_seed: job.effectSeed,
      motion: job.motion ?? "linear",
      sweep: job.sweep ?? "round-trip",
      zoom_frac: job.zoomFrac,
      hold_handoff: job.holdHandoff === true,
      pan_y_gain: job.panYGain,
      oscillations: job.oscillations,
      supersample: job.supersample,
    })),
  });
  const data = await runPythonJson(BAKE_SCRIPT, payload);
  return data.results ?? [];
};

/** Плавный размах 0→1→0 за сцену (туда и обратно) */
const sceneSweep = (i, frames) => {
  const t = i / Math.max(frames - 1, 1);
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  return tri * tri * (3 - 2 * tri);
};

/** Бесшовный пинг-понг 0→1→0 (legacy loop) */
const pingPong = (i, frames) => {
  const t = i / frames;
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  return tri * tri * (3 - 2 * tri);
};

/** libx264 + yuv420p требуют чётные ширину и высоту */
export const evenEncodeDim = (n) => Math.max(2, n - (n % 2));

/**
 * Ken Burns clip через sharp + ffmpeg (linear — одно движение за сцену).
 *
 * @param {{
 *   image: string, width: number, height: number, outVideo: string,
 *   frames?: number, fps?: number, panX?: number, panY?: number,
 *   motion?: "linear" | "loop",
 * }} job
 */
export const bakeKenBurnsLoopFallback = async (job) => {
  const {image, outVideo} = job;
  const W = evenEncodeDim(job.width);
  const H = evenEncodeDim(job.height);
  const frames = job.frames ?? 90;
  const fps = job.fps ?? 30;
  const panX = job.panX ?? 1;
  const panY = job.panY ?? -1;
  const motion = job.motion ?? "linear";
  const holdHandoff = job.holdHandoff === true;
  const progressAt = motion === "loop" ? pingPong : sceneSweep;
  const zoomBase = holdHandoff ? 1 : 1.05;
  const zoomRange = holdHandoff ? 0.1 : 0.08;

  await mkdir(path.dirname(outVideo), {recursive: true});
  const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
  const proc = spawn(
    ffmpeg,
    [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(fps),
      "-i", "-",
      "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
      "-preset", "medium", "-movflags", "+faststart",
      outVideo,
    ],
    {stdio: ["pipe", "ignore", "inherit"]},
  );

  const base = sharp(image).removeAlpha().extract({left: 0, top: 0, width: W, height: H});
  for (let i = 0; i < frames; i += 1) {
    const p = progressAt(i, frames);
    const zoom = zoomBase + zoomRange * p;
    const sw = Math.max(W + 2, Math.round(W * zoom));
    const sh = Math.max(H + 2, Math.round(H * zoom));
    const maxLeft = sw - W;
    const maxTop = sh - H;
    const left = Math.min(maxLeft, Math.max(0, Math.round(maxLeft * (0.5 + 0.5 * panX * p))));
    const top = Math.min(maxTop, Math.max(0, Math.round(maxTop * (0.5 + 0.5 * panY * p))));

    const frame = await base
      .clone()
      .resize(sw, sh, {fit: "fill"})
      .extract({left, top, width: W, height: H})
      .raw()
      .toBuffer();

    if (!proc.stdin.write(frame)) {
      await new Promise((resolve) => proc.stdin.once("drain", resolve));
    }
  }

  proc.stdin.end();
  await new Promise((resolve, reject) => {
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
    proc.on("error", reject);
  });
  return {image, outVideo, frames, fps, mode: "kenburns-fallback"};
};
