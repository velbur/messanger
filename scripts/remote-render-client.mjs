import {createWriteStream} from "node:fs";
import {mkdir, readFile} from "node:fs/promises";
import path from "node:path";
import {pipeline} from "node:stream/promises";
import {Readable} from "node:stream";
import {uploadAssetToRemote} from "./remote-upload.mjs";
import {collectConversationImageRefs, PUBLIC_DIR} from "./image-assets.mjs";
import {collectPreviewCoverSyncRefs} from "./preview-cover-assets.mjs";

const fetchWithRetry = async (url, options = {}, {timeoutMs = 15000, retries = 2} = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {...options, signal: controller.signal});
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

/** URL воркера: CLI → REMOTE_RENDER_URL из env */
export const resolveRemoteRenderUrl = (cliUrl) => {
  const raw = (cliUrl || process.env.REMOTE_RENDER_URL || "").trim().replace(/\/+$/, "");
  return raw || null;
};

/** Залить локальные ассеты переписки на воркер */
export const syncConversationAssetsToRemote = async (
  conversation,
  remoteUrl,
  logs,
  {fileName, episodeConversations} = {},
) => {
  const refs = new Set(collectConversationImageRefs(conversation));
  for (const ref of collectPreviewCoverSyncRefs(conversation, {imageNamespace: fileName, episodeConversations})) {
    refs.add(ref);
  }

  for (const ref of refs) {
    const abs = path.join(PUBLIC_DIR, ref);
    let buffer;
    try {
      buffer = await readFile(abs);
    } catch {
      logs.push(`Файл не найден локально, пропущен: ${ref}`);
      continue;
    }
    await uploadAssetToRemote(remoteUrl, ref, buffer);
    logs.push(`Отправлено на воркер: ${ref}`);
  }
};

const POLL_INTERVAL_MS = 2000;

/** Ждём завершения задачи на воркере */
export const pollRemoteJobUntilDone = async (remoteUrl, jobId, {onProgress} = {}) => {
  while (true) {
    const resp = await fetchWithRetry(`${remoteUrl}/api/jobs/${jobId}`, {}, {timeoutMs: 30000, retries: 3});
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error ?? `Воркер вернул ошибку (${resp.status})`);
    }
    onProgress?.(data);
    if (data.status === "done") {
      return data;
    }
    if (data.status === "error") {
      throw new Error(data.error ?? "Рендер на воркере завершился с ошибкой");
    }
    if (data.status === "cancelled") {
      throw new Error("Рендер на воркере отменён");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

/** Скачать MP4 с воркера в локальный путь */
export const downloadRemoteOutput = async (remoteUrl, outputFile, localPath) => {
  await mkdir(path.dirname(localPath), {recursive: true});
  const url = `${remoteUrl}/out/${encodeURIComponent(outputFile)}`;
  const resp = await fetchWithRetry(url, {}, {timeoutMs: 600000, retries: 3});
  if (!resp.ok || !resp.body) {
    throw new Error(
      resp.status === 404
        ? `На воркере нет out/${outputFile}`
        : `Не удалось скачать out/${outputFile} (${resp.status})`,
    );
  }
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(localPath));
};

/**
 * Рендер на удалённом воркере: sync ассетов → POST /api/render → poll → скачать MP4.
 * Depth-слои и сам рендер выполняются на воркере.
 */
export const renderChatVideoOnRemote = async ({
  remoteUrl,
  conversation,
  fileName,
  outputPath,
  onLog = (message) => console.log(message),
}) => {
  if (!remoteUrl) {
    throw new Error("REMOTE_RENDER_URL не задан (env или --remote URL)");
  }

  const logs = [];
  onLog(`Воркер: ${remoteUrl}`);
  await syncConversationAssetsToRemote(conversation, remoteUrl, logs, {fileName});
  for (const line of logs) {
    onLog(line);
  }

  onLog("Запуск рендера на воркере…");
  const forwardResp = await fetchWithRetry(
    `${remoteUrl}/api/render`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        json: JSON.stringify(conversation),
        name: fileName,
        displayTitle: fileName,
        music: "none",
        target: "local",
        autoGenerateVoiceover: false,
        autoGenerateImages: false,
      }),
    },
    {timeoutMs: 120000, retries: 2},
  );
  const forwardData = await forwardResp.json().catch(() => ({}));
  if (!forwardResp.ok) {
    throw new Error(forwardData.error ?? `Воркер вернул ошибку (${forwardResp.status})`);
  }

  const jobId = forwardData.jobId;
  const outputFile = forwardData.outputFile ?? `${fileName}.mp4`;
  onLog(`Задача на воркере: ${jobId} → out/${outputFile}`);

  let lastPhase = "";
  await pollRemoteJobUntilDone(remoteUrl, jobId, {
    onProgress: (data) => {
      const phase = data.phase?.trim();
      if (phase && phase !== lastPhase) {
        lastPhase = phase;
        onLog(phase);
      }
      if (typeof data.progress === "number" && data.progress > 0) {
        onLog(`Прогресс: ${Math.round(data.progress * 100)}%`);
      }
      for (const line of data.logs?.slice(-3) ?? []) {
        if (line && !logs.includes(line)) {
          onLog(line);
        }
      }
    },
  });

  onLog(`Скачивание out/${outputFile}…`);
  await downloadRemoteOutput(remoteUrl, outputFile, outputPath);
  onLog(`Готово: ${outputPath}`);
};
