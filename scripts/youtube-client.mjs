import {createReadStream} from "node:fs";
import {access, stat} from "node:fs/promises";
import path from "node:path";
import {loadOpenRouterEnv} from "./openrouter-client.mjs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_INIT_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

let envLoaded = false;

const ensureEnv = async () => {
  if (!envLoaded) {
    await loadOpenRouterEnv();
    envLoaded = true;
  }
};

export const isYoutubeConfigured = () =>
  Boolean(
    process.env.YOUTUBE_CLIENT_ID?.trim() &&
      process.env.YOUTUBE_CLIENT_SECRET?.trim() &&
      process.env.YOUTUBE_REFRESH_TOKEN?.trim(),
  );

const getCredentials = () => {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "YouTube не настроен — задайте YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET и YOUTUBE_REFRESH_TOKEN в docs/.env",
    );
  }
  return {clientId, clientSecret, refreshToken};
};

export const getYoutubeAccessToken = async () => {
  await ensureEnv();
  const {clientId, clientSecret, refreshToken} = getCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.error || `HTTP ${resp.status}`);
  }
  if (!data.access_token) {
    throw new Error("Google не вернул access_token");
  }
  return data.access_token;
};

const readResponseError = async (resp) => {
  try {
    const data = await resp.json();
    const message = data?.error?.message || data?.error_description || data?.error;
    if (message) {
      return String(message);
    }
    return JSON.stringify(data);
  } catch {
    return `HTTP ${resp.status}`;
  }
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * @param {{
 *   filePath: string,
 *   title: string,
 *   privacyStatus?: "public" | "unlisted" | "private",
 *   onProgress?: (progress: number) => void,
 * }} opts
 */
export const uploadVideoToYoutube = async ({
  filePath,
  title,
  privacyStatus = "unlisted",
  onProgress,
}) => {
  await ensureEnv();
  const absPath = path.resolve(filePath);
  await access(absPath);
  const fileStat = await stat(absPath);
  const accessToken = await getYoutubeAccessToken();

  const snippet = {
    title: title.slice(0, 100),
  };

  const initResp = await fetch(UPLOAD_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(fileStat.size),
    },
    body: JSON.stringify({
      snippet,
      status: {privacyStatus},
    }),
  });

  if (!initResp.ok) {
    throw new Error(await readResponseError(initResp));
  }

  const uploadUrl = initResp.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube не вернул URL для загрузки");
  }

  onProgress?.(0.1);

  const body = await streamToBuffer(createReadStream(absPath));
  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileStat.size),
    },
    body,
  });

  if (!uploadResp.ok) {
    throw new Error(await readResponseError(uploadResp));
  }

  const result = await uploadResp.json();
  const videoId = result?.id;
  if (!videoId) {
    throw new Error("YouTube не вернул id видео");
  }

  onProgress?.(1);

  return {
    videoId,
    url: `https://www.youtube.com/shorts/${videoId}`,
    studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
    privacyStatus,
    title: snippet.title,
  };
};
