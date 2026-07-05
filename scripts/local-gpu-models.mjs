import {ensureLocalGpuVideoEnv, getLocalGpuVideoUrl} from "./local-gpu-video.mjs";

const MODEL_SWITCH_TIMEOUT_MS = 15 * 60 * 1000;

const parseErrorBody = async (response) => {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    return data?.detail || data?.error || data?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = MODEL_SWITCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
};

export const isLocalGpuModelsConfigured = () => Boolean(getLocalGpuVideoUrl());

/** @returns {Promise<{configured: boolean, active_model?: string, ok?: boolean, error?: string}>} */
export const fetchLocalGpuModelStatus = async () => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuVideoUrl();
  if (!baseUrl) {
    return {configured: false, error: "LOCAL_GPU_VIDEO_URL не задан"};
  }
  try {
    const response = await fetch(`${baseUrl}/models/status`, {signal: AbortSignal.timeout(20_000)});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {configured: true, ok: false, error: data?.detail ?? data?.error ?? `HTTP ${response.status}`};
    }
    return {configured: true, ok: true, ...data};
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const modelMatchesTarget = (activeModel, target) => {
  if (activeModel === target) {
    return true;
  }
  if (target === "flux" && (activeModel === "flux" || activeModel === "flux-img2img")) {
    return true;
  }
  return false;
};

/**
 * Переключить модель на GPU-сервисе: flux (T2I) | wan (I2V) | none.
 * @param {"flux"|"wan"|"none"} target
 * @param {{force?: boolean, onStatus?: (msg: string) => void}} [opts]
 */
export const ensureLocalGpuModel = async (target, {force = false, onStatus} = {}) => {
  await ensureLocalGpuVideoEnv();
  const baseUrl = getLocalGpuVideoUrl();
  if (!baseUrl) {
    throw new Error("LOCAL_GPU_VIDEO_URL не задан");
  }

  const status = await fetchLocalGpuModelStatus();
  if (!status.ok) {
    throw new Error(status.error ?? "GPU-сервис недоступен");
  }

  if (!force && modelMatchesTarget(status.active_model ?? "none", target)) {
    return {switched: false, active_model: status.active_model, load_sec: 0};
  }

  const from = status.active_model ?? "none";
  onStatus?.(`GPU: переключение ${from} → ${target} (выгрузка/загрузка модели)…`);

  const form = new FormData();
  form.append("target", target);

  const response = await fetchWithTimeout(`${baseUrl}/models/switch`, {method: "POST", body: form});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail ?? data?.error ?? `GPU switch ${response.status}`);
  }

  const loadSec = data.load_sec ?? 0;
  onStatus?.(`GPU: модель ${data.active_model}${loadSec ? ` (${loadSec} с)` : ""}`);

  return {switched: true, ...data};
};

export const unloadLocalGpuModels = async (opts) => ensureLocalGpuModel("none", opts);
