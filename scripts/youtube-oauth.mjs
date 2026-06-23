import http from "node:http";
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {loadOpenRouterEnv} from "./openrouter-client.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, "docs", ".env");
const PORT = 8765;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/`;
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

const buildAuthUrl = (clientId) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const exchangeCode = async ({clientId, clientSecret, code}) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.error || `HTTP ${resp.status}`);
  }
  return data;
};

const updateEnvRefreshToken = async (refreshToken) => {
  const text = await readFile(ENV_PATH, "utf8");
  const lines = text.split("\n");
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith("YOUTUBE_REFRESH_TOKEN=")) {
      found = true;
      return `YOUTUBE_REFRESH_TOKEN=${refreshToken}`;
    }
    return line;
  });
  if (!found) {
    next.push(`YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
  }
  await writeFile(ENV_PATH, `${next.join("\n").replace(/\n?$/, "\n")}`, "utf8");
};

const successHtml = (refreshToken) => `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>YouTube OAuth</title></head>
<body style="font-family:sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem">
  <h1>Готово</h1>
  <p>Refresh token получен и записан в <code>docs/.env</code>.</p>
  <p>Можно закрыть эту вкладку и вернуться в Cursor.</p>
  <pre style="background:#f4f4f4;padding:1rem;overflow:auto">${refreshToken}</pre>
</body></html>`;

const errorHtml = (message) => `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>YouTube OAuth — ошибка</title></head>
<body style="font-family:sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem">
  <h1>Ошибка</h1>
  <p>${message}</p>
  <p>Проверьте Test users и scope <code>youtube.upload</code> в Google Cloud.</p>
</body></html>`;

await loadOpenRouterEnv();

const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error("Задайте YOUTUBE_CLIENT_ID и YOUTUBE_CLIENT_SECRET в docs/.env");
  process.exit(1);
}

const authUrl = buildAuthUrl(clientId);
console.log(`OAuth URL:\n${authUrl}\n`);
console.log(`Ожидаю redirect на ${REDIRECT_URI} …`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);

  if (url.pathname !== "/") {
    res.writeHead(404).end("Not found");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    const desc = url.searchParams.get("error_description") ?? error;
    res.writeHead(400, {"Content-Type": "text/html; charset=utf-8"});
    res.end(errorHtml(desc));
    console.error(`OAuth error: ${desc}`);
    server.close();
    process.exit(1);
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400, {"Content-Type": "text/html; charset=utf-8"});
    res.end(errorHtml("Нет параметра code в redirect URL"));
    return;
  }

  try {
    const tokens = await exchangeCode({clientId, clientSecret, code});
    if (!tokens.refresh_token) {
      throw new Error(
        "Google не вернул refresh_token. Отзовите доступ приложения в myaccount.google.com/permissions и повторите.",
      );
    }
    await updateEnvRefreshToken(tokens.refresh_token);
    res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
    res.end(successHtml(tokens.refresh_token));
    console.log("YOUTUBE_REFRESH_TOKEN записан в docs/.env");
    server.close();
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.writeHead(500, {"Content-Type": "text/html; charset=utf-8"});
    res.end(errorHtml(message));
    console.error(message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Сервер слушает ${REDIRECT_URI}`);
});

setTimeout(() => {
  console.error("Таймаут 10 минут — авторизация не завершена");
  server.close();
  process.exit(1);
}, 10 * 60 * 1000);
