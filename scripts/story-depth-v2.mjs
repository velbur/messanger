import {existsSync} from "node:fs";
import {spawn} from "node:child_process";
import {readFile} from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROBE_SCRIPT = path.join(ROOT, "scripts/python/depth_v2_probe.py");
const BATCH_SCRIPT = path.join(ROOT, "scripts/python/depth_v2_batch.py");
const RAW_CACHE_DIR = path.join(ROOT, ".cache/depth-v2/raw");

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

const runPythonJson = (scriptAbs, stdinPayload = null, {timeoutMs = 600000} = {}) =>
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

    if (stdinPayload != null) {
      child.stdin.write(stdinPayload);
    }
    child.stdin.end();
  });

let probePromise = null;

/** Depth V2 (transformers + torch) установлен и импортируется */
export const probeDepthV2 = async () => {
  if (!probePromise) {
    probePromise = runPythonJson(PROBE_SCRIPT, null, {timeoutMs: 120000}).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
  return probePromise;
};

export const isDepthV2Available = async () => {
  const status = await probeDepthV2();
  return Boolean(status.ok);
};

/** @param {string[]} imageAbsPaths */
export const inferDepthV2Batch = async (imageAbsPaths) => {
  if (imageAbsPaths.length === 0) {
    return [];
  }
  const payload = JSON.stringify({
    images: imageAbsPaths,
    model: process.env.STORY_DEPTH_V2_MODEL?.trim() || undefined,
    cache_dir: RAW_CACHE_DIR,
  });
  const data = await runPythonJson(BATCH_SCRIPT, payload);
  return data.results ?? [];
};

export const readDepthRawFile = async (rawPath) => {
  const buf = await readFile(rawPath);
  if (buf.length < 8) {
    throw new Error(`Повреждён depth raw: ${rawPath}`);
  }
  const width = buf.readUInt32BE(0);
  const height = buf.readUInt32BE(4);
  const expected = 8 + width * height;
  if (buf.length < expected) {
    throw new Error(`Depth raw size mismatch: ${rawPath}`);
  }
  return {
    width,
    height,
    depthUint8: new Uint8Array(buf.buffer, buf.byteOffset + 8, width * height),
  };
};

export const describeDepthV2Status = async () => {
  const status = await probeDepthV2();
  if (!status.ok) {
    return `Depth V2: недоступен (${status.error ?? "unknown"}) — ./run.sh setup-native`;
  }
  if (status.cuda) {
    return `Depth V2: CUDA ${status.device ?? "gpu"}`;
  }
  if (status.mps) {
    return `Depth V2: Apple GPU (MPS)`;
  }
  return "Depth V2: CPU (медленно; на Mac: ./run.sh worker-native, на Linux+NVIDIA: WORKER_GPU=1 ./run.sh worker)";
};
