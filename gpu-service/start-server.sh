#!/usr/bin/env bash
# Быстрый старт после stop/start, когда диск сохраняется (веса уже в ./models).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

# Story-кадры на Gemini/Veo — на Mac; GPU-сервер только render-воркер (:3333)
export GPU_STARTUP_MODEL="${GPU_STARTUP_MODEL:-none}"

if [[ "${GPU_STARTUP_MODEL}" != "none" && ! -f "$ROOT/models/wan-i2v-14b-720p/vae/config.json" ]]; then
  echo "Веса Wan не найдены. Сначала: ./download_models.sh" >&2
  echo "Или GPU_STARTUP_MODEL=none — только render-воркер на :3333, без :8008." >&2
  exit 1
fi

if [[ "${GPU_STARTUP_MODEL}" == "none" ]]; then
  echo "gpu-service :8008 не стартует (GPU_STARTUP_MODEL=none)."
  echo "Тяжёлый рендер: ./start-render-worker.sh → http://0.0.0.0:3333"
  exit 0
fi

source "$ROOT/.venv/bin/activate"
pkill -f "uvicorn app:app" 2>/dev/null || true
nohup uvicorn app:app --host 0.0.0.0 --port 8008 > uvicorn.log 2>&1 &
echo "uvicorn pid=$! → http://0.0.0.0:8008"
echo "Проверка: curl -s http://127.0.0.1:8008/health"
