#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-chat-video-generator}"
INPUT="${ROOT}/public/conversation.json"
OUTPUT="${ROOT}/out/video.mp4"
STUDIO_PORT="${STUDIO_PORT:-3000}"
UI_PORT="${UI_PORT:-3333}"
WORKER_PORT="${WORKER_PORT:-3333}"
RENDER_CONCURRENCY="${RENDER_CONCURRENCY:-}"

# docker или podman: CONTAINER=podman ./run.sh worker
CONTAINER="${CONTAINER:-docker}"

usage() {
  cat <<'EOF'
Использование: ./run.sh <команда> [опции]

Команды:
  build              Собрать Docker-образ
  render             Срендерить видео (по умолчанию public/conversation.json -> out/video.mp4)
  ui                 Веб-интерфейс: JSON → рендер (http://localhost:3333)
  worker             Render-воркер для удалённого рендера (порт 3333, без UI-прокси)
  dev                Запустить Remotion Studio в контейнере (http://localhost:3000)
  shell              Интерактивная оболочка в контейнере

Опции (для render):
  --input PATH       JSON с перепиской (по умолчанию: public/conversation.json)
  --output PATH      Выходной MP4 (по умолчанию: out/video.mp4)
  --build            Пересобрать Docker-образ перед командой

Опции (для ui / worker):
  --port N           Порт веб-интерфейса (по умолчанию: 3333)
  --build            Пересобрать Docker-образ перед запуском

Переменные окружения:
  IMAGE              Имя Docker-образа (по умолчанию: chat-video-generator)
  CONTAINER          docker или podman (по умолчанию: docker)
  STUDIO_PORT        Порт Remotion Studio (по умолчанию: 3000)
  UI_PORT            Порт веб-интерфейса (по умолчанию: 3333)
  WORKER_PORT        Порт render-воркера (по умолчанию: 3333)
  RENDER_CONCURRENCY Число потоков рендера на воркере
  REMOTE_RENDER_URL  На Mac: URL воркера, напр. http://192.168.0.136:3333

Примеры:
  ./run.sh build
  ./run.sh render
  ./run.sh render --input ./my-chat.json --output ./out/result.mp4
  ./run.sh ui
  REMOTE_RENDER_URL=http://192.168.0.136:3333 ./run.sh ui
  CONTAINER=podman RENDER_CONCURRENCY=12 ./run.sh worker --build
  ./run.sh dev
EOF
}

resolve_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    echo "$p"
  else
    echo "${ROOT}/${p}"
  fi
}

DO_BUILD=0

parse_render_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build)
        DO_BUILD=1
        shift
        ;;
      --input)
        INPUT="$(resolve_path "$2")"
        shift 2
        ;;
      --output)
        OUTPUT="$(resolve_path "$2")"
        shift 2
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
}

ensure_image() {
  if ! "$CONTAINER" image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "Образ '$IMAGE' не найден. Собираю..."
    "$CONTAINER" build -t "$IMAGE" .
  fi
}

cmd_build() {
  echo "Сборка образа (включая Chrome Headless Shell — один раз)..."
  "$CONTAINER" build -t "$IMAGE" .
  echo "Готово: образ $IMAGE"
}

# Общие тома: актуальный Remotion-код с хоста (без пересборки образа после git pull)
APP_VOLUMES=(
  -v "${ROOT}/json:/app/json"
  -v "${ROOT}/out:/app/out"
  -v "${ROOT}/public:/app/public"
  -v "${ROOT}/prompts:/app/prompts"
  -v "${ROOT}/data:/app/data"
  -v "${ROOT}/src:/app/src:ro"
  -v "${ROOT}/scripts:/app/scripts:ro"
  -v "${ROOT}/.cache:/app/.cache"
)

cmd_render() {
  parse_render_args "$@"

  if [[ ! -f "$INPUT" ]]; then
    echo "Файл не найден: $INPUT" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$OUTPUT")"
  if [[ "$DO_BUILD" -eq 1 ]]; then
    cmd_build
  else
    ensure_image
  fi

  local input_dir input_file output_dir output_file
  input_dir="$(cd "$(dirname "$INPUT")" && pwd)"
  input_file="$(basename "$INPUT")"
  output_dir="$(cd "$(dirname "$OUTPUT")" && pwd)"
  output_file="$(basename "$OUTPUT")"

  # src/scripts монтируются с хоста — рендер без пересборки образа после правок Remotion
  "$CONTAINER" run --rm \
    -v "${input_dir}:/input:ro" \
    -v "${output_dir}:/output" \
    -v "${ROOT}/src:/app/src:ro" \
    -v "${ROOT}/scripts:/app/scripts:ro" \
    -v "${ROOT}/.cache:/app/.cache" \
    "$IMAGE" \
    node scripts/render.mjs \
      --input "/input/${input_file}" \
      --output "/output/${output_file}"

  echo "Видео: ${OUTPUT}"
}

cmd_dev() {
  ensure_image

  "$CONTAINER" run --rm -it \
    -p "${STUDIO_PORT}:3000" \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/out:/app/out" \
    "$IMAGE" \
    npx remotion studio src/index.ts --host=0.0.0.0 --port=3000
}

cmd_shell() {
  ensure_image
  "$CONTAINER" run --rm -it \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/out:/app/out" \
    "$IMAGE" \
    bash
}

parse_server_args() {
  local port_var="$1"
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build)
        DO_BUILD=1
        shift
        ;;
      --port)
        printf -v "$port_var" '%s' "$2"
        shift 2
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
}

run_server_container() {
  local container_name="$1"
  local host_port="$2"
  local extra_env=("${@:3}")

  mkdir -p "${ROOT}/json" "${ROOT}/out" "${ROOT}/.cache"

  local -a env_args=(
    -e "PORT=3333"
    -e "NODE_OPTIONS=${NODE_OPTIONS:---max-old-space-size=4096}"
  )
  if [[ -n "${RENDER_CONCURRENCY}" ]]; then
    env_args+=(-e "RENDER_CONCURRENCY=${RENDER_CONCURRENCY}")
  fi
  for item in "${extra_env[@]}"; do
    env_args+=(-e "$item")
  done

  local -a volume_args=("${APP_VOLUMES[@]}")
  if [[ -f "${ROOT}/docs/.env" ]]; then
    volume_args+=(-v "${ROOT}/docs/.env:/app/docs/.env:ro")
  fi

  "$CONTAINER" rm -f "$container_name" >/dev/null 2>&1 || true

  stop_server() {
    echo ""
    echo "Остановка контейнера…"
    "$CONTAINER" stop -t 3 "$container_name" >/dev/null 2>&1 || true
    exit 130
  }
  trap stop_server INT TERM

  "$CONTAINER" run --rm -it --init --name "$container_name" \
    -p "${host_port}:3333" \
    "${env_args[@]}" \
    "${volume_args[@]}" \
    "$IMAGE" \
    node --import tsx scripts/server.mjs

  trap - INT TERM
}

cmd_ui() {
  parse_server_args UI_PORT "$@"

  if [[ "$DO_BUILD" -eq 1 ]]; then
    cmd_build
  else
    ensure_image
  fi

  echo "Веб-интерфейс: http://localhost:${UI_PORT}"
  echo "JSON сохраняется в json/, видео — в out/"
  if [[ -n "${REMOTE_RENDER_URL:-}" ]]; then
    echo "Удалённый рендер: ${REMOTE_RENDER_URL}"
  fi
  echo "Остановка: Ctrl+C (при активном рендере может занять до нескольких секунд)"

  run_server_container "chat-video-ui" "${UI_PORT}" \
    "NATIVE_PROJECT_ROOT=${ROOT}" \
    "REMOTE_RENDER_URL=${REMOTE_RENDER_URL:-}"
}

cmd_worker() {
  parse_server_args WORKER_PORT "$@"

  if [[ "$DO_BUILD" -eq 1 ]]; then
    cmd_build
  else
    ensure_image
  fi

  echo "Render-воркер: http://0.0.0.0:${WORKER_PORT}"
  echo "На Mac: REMOTE_RENDER_URL=http://<IP-этой-машины>:${WORKER_PORT} ./run.sh ui"
  echo "Важно: после git pull перезапустите воркер (src/ монтируется с хоста)."
  echo "Остановка: Ctrl+C"

  run_server_container "chat-video-worker" "${WORKER_PORT}"
}

main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    build)
      cmd_build
      ;;
    render|"")
      cmd_render "$@"
      ;;
    ui)
      cmd_ui "$@"
      ;;
    worker)
      cmd_worker "$@"
      ;;
    dev)
      cmd_dev
      ;;
    shell)
      cmd_shell
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      echo "Неизвестная команда: $cmd" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
