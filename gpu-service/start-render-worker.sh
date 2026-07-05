#!/usr/bin/env bash
# Remotion render-воркер на GPU-сервере (порт 3333).
# Только тяжёлая сборка: depth, hold-parallax, Remotion MP4.
# Gemini, Veo, озвучка — на Mac (docs/.env + UI).
#
# На Mac в docs/.env:
#   LOCAL_GPU_RENDER_URL=http://<gpu-host>:3333
#   LOCAL_GPU_RENDER_DEFAULT=1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Прокси провайдера ломает npm/sharp (SELF_SIGNED_CERT_IN_CHAIN)
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

PORT="${RENDER_WORKER_PORT:-3333}"
LOG="${ROOT}/gpu-service/render-worker.log"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Установите Node 20+ (nvm или apt)." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg не найден. Установите: apt install ffmpeg" >&2
  exit 1
fi

if [[ ! -d "${ROOT}/node_modules/tsx" ]]; then
  echo "==> npm ci (первый запуск)…"
  npm ci
fi

if [[ -f "${ROOT}/docs/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/docs/.env"
  set +a
fi

export RENDER_WORKER=1
export PORT
export WORKER_GPU="${WORKER_GPU:-1}"
export STORY_DEPTH_PROVIDER="${STORY_DEPTH_PROVIDER:-auto}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
# Не требуем OPENROUTER / :8008 — воркер не генерирует картинки и Veo
unset LOCAL_GPU_VIDEO_URL 2>/dev/null || true

pkill -f "scripts/server.mjs" 2>/dev/null || true
sleep 1

nohup node --import tsx scripts/server.mjs > "$LOG" 2>&1 &
echo "Render-воркер pid=$! → http://0.0.0.0:${PORT} (RENDER_WORKER=1)"
echo "Лог: ${LOG}"
echo "Проверка: curl -s http://127.0.0.1:${PORT}/api/render-targets | head -c 200"
echo "Откройте порт ${PORT} в firewall провайдера."
