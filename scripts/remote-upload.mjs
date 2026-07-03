import {resolveUploadMaxBytes} from "./image-assets.mjs";

const explainFetchError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error.cause : null;
  const code =
    cause && typeof cause === "object" && cause !== null && "code" in cause
      ? String(cause.code)
      : "";

  if (code === "ECONNREFUSED") {
    return "воркер не отвечает (connection refused) — проверьте REMOTE_RENDER_URL и что worker-native запущен";
  }
  if (code === "ENOTFOUND") {
    return "хост воркера не найден — проверьте IP/имя в REMOTE_RENDER_URL";
  }
  if (code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return "воркер недоступен по сети — та же Wi‑Fi/LAN, без блокировки firewall";
  }
  if (/aborted/i.test(message)) {
    return "таймаут";
  }
  return message;
};

const formatRemoteUploadError = (targetRef, status, detail) => {
  if (status === 413) {
    return `Не удалось отправить ${targetRef} на воркер: файл слишком большой (413). На воркере: git pull && ./run.sh worker`;
  }
  return `Не удалось отправить ${targetRef} на воркер: ${detail}`;
};

const formatUploadFetchError = (targetRef, error) => {
  const detail = explainFetchError(error);
  if (/таймаут/i.test(detail)) {
    return `Таймаут при отправке ${targetRef} на воркер — проверьте сеть и что воркер запущен, затем повторите сборку`;
  }
  return formatRemoteUploadError(targetRef, 0, detail);
};

const fetchUploadWithRetry = async (url, options, {timeoutMs = 120_000, retries = 3} = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {...options, signal: controller.signal});
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

/** Проверить, что воркер отвечает, до заливки ассетов */
export const pingRemoteWorker = async (remoteBaseUrl, {timeoutMs = 10_000} = {}) => {
  try {
    const resp = await fetchUploadWithRetry(
      `${remoteBaseUrl}/api/render-targets`,
      {},
      {timeoutMs, retries: 1},
    );
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return true;
  } catch (error) {
    const detail = explainFetchError(error);
    throw new Error(`Воркер недоступен (${remoteBaseUrl}): ${detail}`);
  }
};

/** Залить бинарный ассет на удалённый воркер без base64-раздувания */
export const uploadAssetToRemote = async (remoteBaseUrl, targetRef, buffer) => {
  assertRemoteUploadSize(targetRef, buffer);
  let resp;
  try {
    resp = await fetchUploadWithRetry(`${remoteBaseUrl}/api/assets/upload-binary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Asset-Ref": targetRef,
      },
      body: buffer,
    });
  } catch (error) {
    throw new Error(formatUploadFetchError(targetRef, error));
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(formatRemoteUploadError(targetRef, resp.status, data.error ?? resp.status));
  }
  return data;
};

export const assertRemoteUploadSize = (targetRef, buffer) => {
  const maxBytes = resolveUploadMaxBytes(targetRef);
  if (buffer.length > maxBytes) {
    throw new Error(
      `${targetRef}: файл слишком большой (${Math.round(buffer.length / (1024 * 1024))} МБ, макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`,
    );
  }
};
