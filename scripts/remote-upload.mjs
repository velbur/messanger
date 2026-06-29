import {resolveUploadMaxBytes} from "./image-assets.mjs";

const formatRemoteUploadError = (targetRef, status, detail) => {
  if (status === 413) {
    return `Не удалось отправить ${targetRef} на воркер: файл слишком большой (413). На воркере: git pull && ./run.sh worker`;
  }
  return `Не удалось отправить ${targetRef} на воркер: ${detail}`;
};

/** Залить бинарный ассет на удалённый воркер без base64-раздувания */
export const uploadAssetToRemote = async (remoteBaseUrl, targetRef, buffer) => {
  const resp = await fetch(`${remoteBaseUrl}/api/assets/upload-binary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Asset-Ref": targetRef,
    },
    body: buffer,
  });
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
