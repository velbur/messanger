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

if ! [[ -f "$ROOT/models/wan-i2v-14b-720p/vae/config.json" ]]; then
  echo "Веса Wan не найдены. Сначала: ./download_models.sh" >&2
  exit 1
fi

source "$ROOT/.venv/bin/activate"
pkill -f "uvicorn app:app" 2>/dev/null || true
nohup uvicorn app:app --host 0.0.0.0 --port 8008 > uvicorn.log 2>&1 &
echo "uvicorn pid=$! → http://0.0.0.0:8008"
echo "Проверка: curl -s http://127.0.0.1:8008/health"
