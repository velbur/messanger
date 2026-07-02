import {resolveUploadMaxBytes} from "./image-assets.mjs";

const formatRemoteUploadError = (targetRef, status, detail) => {
  if (status === 413) {
    return `Не удалось отправить ${targetRef} на воркер: файл слишком большой (413). На воркере: git pull && ./run.sh worker`;
  }
  return `Не удалось отправить ${targetRef} на воркер: ${detail}`;
};

const formatUploadFetchError = (targetRef, error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/aborted/i.test(message)) {
    return `Таймаут при отправке ${targetRef} на воркер — проверьте сеть и что воркер запущен, затем повторите сборку`;
  }
  return formatRemoteUploadError(targetRef, 0, message);
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
