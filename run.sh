#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-chat-video-generator}"
INPUT="${ROOT}/public/conversation.json"
OUTPUT="${ROOT}/out/video.mp4"
STUDIO_PORT="${STUDIO_PORT:-3000}"
UI_PORT="${UI_PORT:-3333}"

usage() {
  cat <<'EOF'
Использование: ./run.sh <команда> [опции]

Команды:
  build              Собрать Docker-образ
  render             Срендерить видео (по умолчанию public/conversation.json -> out/video.mp4)
  ui                 Веб-интерфейс: JSON → рендер (http://localhost:3333)
  dev                Запустить Remotion Studio в контейнере (http://localhost:3000)
  shell              Интерактивная оболочка в контейнере

Опции (для render):
  --input PATH       JSON с перепиской (по умолчанию: public/conversation.json)
  --output PATH      Выходной MP4 (по умолчанию: out/video.mp4)
  --build            Пересобрать Docker-образ перед командой

Опции (для ui):
  --port N           Порт веб-интерфейса (по умолчанию: 3333)
  --build            Пересобрать Docker-образ перед запуском

Переменные окружения:
  IMAGE              Имя Docker-образа (по умолчанию: chat-video-generator)
  STUDIO_PORT        Порт Remotion Studio (по умолчанию: 3000)
  UI_PORT            Порт веб-интерфейса (по умолчанию: 3333)

Примеры:
  ./run.sh build
  ./run.sh render
  ./run.sh render --input ./my-chat.json --output ./out/result.mp4
  ./run.sh ui
  ./run.sh ui --build --port 3333
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
  if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "Образ '$IMAGE' не найден. Собираю..."
    docker build -t "$IMAGE" .
  fi
}

cmd_build() {
  echo "Сборка образа (включая Chrome Headless Shell — один раз)..."
  docker build -t "$IMAGE" .
  echo "Готово: образ $IMAGE"
}

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

  # Пересоберите образ после изменений UI/шрифтов: ./run.sh build
  docker run --rm \
    -v "${input_dir}:/input:ro" \
    -v "${output_dir}:/output" \
    "$IMAGE" \
    node scripts/render.mjs \
      --input "/input/${input_file}" \
      --output "/output/${output_file}"

  echo "Видео: ${OUTPUT}"
}

cmd_dev() {
  ensure_image

  docker run --rm -it \
    -p "${STUDIO_PORT}:3000" \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/out:/app/out" \
    "$IMAGE" \
    npx remotion studio src/index.ts --host=0.0.0.0 --port=3000
}

cmd_shell() {
  ensure_image
  docker run --rm -it \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/out:/app/out" \
    "$IMAGE" \
    bash
}

parse_ui_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build)
        DO_BUILD=1
        shift
        ;;
      --port)
        UI_PORT="$2"
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

cmd_ui() {
  parse_ui_args "$@"

  mkdir -p "${ROOT}/json" "${ROOT}/out"

  if [[ "$DO_BUILD" -eq 1 ]]; then
    cmd_build
  else
    ensure_image
  fi

  echo "Веб-интерфейс: http://localhost:${UI_PORT}"
  echo "JSON сохраняется в json/, видео — в out/"
  echo "Остановка: Ctrl+C (при активном рендере может занять до нескольких секунд)"

  local container_name="chat-video-ui"
  docker rm -f "$container_name" >/dev/null 2>&1 || true

  stop_ui() {
    echo ""
    echo "Остановка контейнера…"
    docker stop -t 3 "$container_name" >/dev/null 2>&1 || true
    exit 130
  }
  trap stop_ui INT TERM

  docker run --rm -it --init --name "$container_name" \
    -p "${UI_PORT}:3333" \
    -e "PORT=3333" \
    -e "NATIVE_PROJECT_ROOT=${ROOT}" \
    -e "NODE_OPTIONS=${NODE_OPTIONS:---max-old-space-size=4096}" \
    -e "REMOTE_RENDER_URL=${REMOTE_RENDER_URL:-}" \
    -v "${ROOT}/json:/app/json" \
    -v "${ROOT}/out:/app/out" \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/prompts:/app/prompts" \
    -v "${ROOT}/data:/app/data" \
    -v "${ROOT}/audio:/app/audio:ro" \
    "$IMAGE" \
    node --import tsx scripts/server.mjs

  trap - INT TERM
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
