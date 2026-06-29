#!/usr/bin/env bash
# Полный цикл подготовки и запуска render-воркера:
# git pull → зависимости → очистка кэшей → worker-native (Mac) или worker (Docker/Podman).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

WORKER_PORT="${WORKER_PORT:-3333}"
CONTAINER="${CONTAINER:-}"
RENDER_CONCURRENCY="${RENDER_CONCURRENCY:-12}"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
WORKER_GPU="${WORKER_GPU:-}"
STORY_DEPTH_PROVIDER="${STORY_DEPTH_PROVIDER:-}"

DO_PULL=1
DO_CLEAR=1
DO_BUILD=0
MODE=auto

usage() {
  cat <<'EOF'
Использование: ./worker-start.sh [опции]

Подготовка и запуск render-воркера (порт 3333 по умолчанию):
  1. git pull
  2. зависимости (npm ci / Python venv или Docker-образ)
  3. npm run bundle:clear && npm run depth:clear
  4. запуск воркера

Опции:
  --port N           Порт (по умолчанию: 3333)
  --native           Mac M-series: worker-native (Depth V2 через MPS)
  --docker           Linux: worker в Docker/Podman
  --build            Пересобрать Docker-образ перед запуском
  --no-pull          Не делать git pull
  --no-clear         Не очищать кэши
  -h, --help         Справка

По умолчанию: macOS → --native, Linux → --docker (CONTAINER=podman если docker недоступен).

Переменные окружения:
  WORKER_PORT          Порт воркера
  CONTAINER            docker | podman
  RENDER_CONCURRENCY   Потоки рендера (по умолчанию: 12)
  NODE_OPTIONS         Память Node (по умолчанию: --max-old-space-size=8192)
  WORKER_GPU           1 — CUDA depth на Linux + NVIDIA
  STORY_DEPTH_PROVIDER auto | depth-v2 | xenova

Примеры:
  ./worker-start.sh
  ./worker-start.sh --native --port 3333
  WORKER_GPU=1 CONTAINER=podman ./worker-start.sh --docker --build
  ./worker-start.sh --no-pull --no-clear
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      WORKER_PORT="$2"
      shift 2
      ;;
    --native)
      MODE=native
      shift
      ;;
    --docker)
      MODE=docker
      shift
      ;;
    --build)
      DO_BUILD=1
      shift
      ;;
    --no-pull)
      DO_PULL=0
      shift
      ;;
    --no-clear)
      DO_CLEAR=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Неизвестный аргумент: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$MODE" == auto ]]; then
  if [[ "$(uname -s)" == Darwin ]]; then
    MODE=native
  else
    MODE=docker
  fi
fi

if [[ "$MODE" == docker && -z "$WORKER_GPU" ]]; then
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    WORKER_GPU=1
  else
    WORKER_GPU=0
  fi
fi

git_pull() {
  [[ "$DO_PULL" -eq 1 ]] || return 0
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Не git-репозиторий — пропускаю git pull"
    return 0
  fi
  echo "==> git pull"
  if ! git pull --ff-only 2>/dev/null; then
    git pull
  fi
}

clear_caches() {
  [[ "$DO_CLEAR" -eq 1 ]] || return 0
  echo "==> Очистка кэшей: npm run bundle:clear && npm run depth:clear"

  if [[ -f "${ROOT}/node_modules/tsx/package.json" ]] && command -v npm >/dev/null 2>&1; then
    npm run bundle:clear
    npm run depth:clear
    return 0
  fi

  echo "    node_modules нет — ручная очистка (после setup-native будет npm run depth:clear)"
  rm -rf "${ROOT}/.cache/remotion-bundle" "${ROOT}/.cache/parallax-raw"
  local removed=0
  if [[ -d "${ROOT}/public/images" ]]; then
    while IFS= read -r -d '' f; do
      rm -f "$f"
      removed=$((removed + 1))
    done < <(
      find "${ROOT}/public/images" -type f \( \
        -name '*.depth.png' -o \
        -name '*.depth-meta.json' -o \
        -name '*.parallax.mp4' -o \
        -name '*.layer-far.png' -o \
        -name '*.layer-mid.png' -o \
        -name '*.layer-near.png' \
      \) -print0 2>/dev/null
    )
  fi
  echo "    удалено ${removed} depth/parallax-файлов в public/images/"
}

start_native() {
  echo "==> Режим: worker-native (Apple Silicon / без Docker)"
  "${ROOT}/run.sh" setup-native
  clear_caches
  echo "==> Запуск воркера на порту ${WORKER_PORT}"
  export PORT="${WORKER_PORT}"
  export STORY_DEPTH_PROVIDER="${STORY_DEPTH_PROVIDER:-auto}"
  exec "${ROOT}/run.sh" worker-native --port "${WORKER_PORT}"
}

start_docker() {
  echo "==> Режим: worker (Docker/Podman)"
  clear_caches

  local -a worker_args=(--port "${WORKER_PORT}")
  if [[ "$DO_BUILD" -eq 1 ]]; then
    worker_args+=(--build)
  fi

  export CONTAINER
  export RENDER_CONCURRENCY
  export NODE_OPTIONS
  export WORKER_GPU
  if [[ -n "$STORY_DEPTH_PROVIDER" ]]; then
    export STORY_DEPTH_PROVIDER
  fi

  echo "==> Запуск воркера на порту ${WORKER_PORT} (CONTAINER=${CONTAINER:-auto}, GPU=${WORKER_GPU})"
  exec "${ROOT}/run.sh" worker "${worker_args[@]}"
}

echo "worker-start: ${MODE} @ :${WORKER_PORT}"
git_pull

case "$MODE" in
  native)
    start_native
    ;;
  docker)
    start_docker
    ;;
  *)
    echo "Неизвестный режим: $MODE" >&2
    exit 1
    ;;
esac
