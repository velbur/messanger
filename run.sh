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

# docker или podman; если CONTAINER не задан — первый runtime, который реально отвечает
CONTAINER="${CONTAINER:-}"

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
  CONTAINER          docker или podman (если не задан — первый доступный runtime)
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

container_runtime_ready() {
  local runtime="$1"
  command -v "$runtime" >/dev/null 2>&1 || return 1
  if command -v timeout >/dev/null 2>&1; then
    timeout 8 "$runtime" info >/dev/null 2>&1
    return
  fi
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout 8 "$runtime" info >/dev/null 2>&1
    return
  fi
  # macOS без GNU timeout
  "$runtime" info >/dev/null 2>&1 &
  local pid=$! attempt
  for attempt in $(seq 1 80); do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid"
      return $?
    fi
    sleep 0.1
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  return 1
}

podman_machine_state() {
  podman machine inspect --format '{{.State}}' 2>/dev/null | head -1 || true
}

podman_machine_memory_mib() {
  local mem listed
  mem="$(podman machine inspect --format '{{.Resources.Memory}}' 2>/dev/null | head -1 || true)"
  if [[ "$mem" =~ ^[0-9]+$ && "$mem" -gt 0 ]]; then
    echo "$mem"
    return 0
  fi
  listed="$(podman machine list --format '{{.Memory}}' 2>/dev/null | head -1 | tr -d ' ' || true)"
  if [[ "$listed" =~ ^([0-9.]+)GiB$ ]] && command -v awk >/dev/null 2>&1; then
    awk "BEGIN { printf \"%d\", ${BASH_REMATCH[1]} * 1024 }"
    return 0
  fi
  if [[ "$listed" =~ ^([0-9.]+)GB$ ]] && command -v awk >/dev/null 2>&1; then
    awk "BEGIN { printf \"%d\", ${BASH_REMATCH[1]} * 1000 }"
    return 0
  fi
  return 1
}

podman_connection_ready() {
  container_runtime_ready podman && podman ps >/dev/null 2>&1
}

wait_for_podman_ready() {
  local attempt last_msg="" state
  for attempt in $(seq 1 90); do
    state="$(podman_machine_state)"
    if [[ "$state" == "running" ]] && podman_connection_ready; then
      sleep 1
      podman_connection_ready && return 0
    fi
    local msg="Жду Podman VM (${state:-starting}, ${attempt}/90)…"
    if [[ "$msg" != "$last_msg" ]] || (( attempt % 15 == 0 )); then
      echo "$msg" >&2
      last_msg="$msg"
    fi
    sleep 2
  done
  echo "Podman VM не готова: state=$(podman_machine_state), podman info/ps не отвечают." >&2
  return 1
}

ensure_podman_connection() {
  [[ "${CONTAINER:-}" == podman ]] || return 0
  podman_connection_ready && return 0
  echo "Подключение к Podman нестабильно — жду VM…" >&2
  wait_for_podman_ready
}

try_start_podman() {
  command -v podman >/dev/null 2>&1 || return 1
  if podman_connection_ready; then
    return 0
  fi

  if podman machine list >/dev/null 2>&1; then
    local running=""
    running="$(podman machine list --format '{{.Running}}' 2>/dev/null | head -1 || true)"
    if [[ "$running" != "true" ]]; then
      echo "Podman VM не запущена — podman machine start…" >&2
      if ! podman machine start; then
        echo "Не удалось запустить podman machine." >&2
        return 1
      fi
    fi
    wait_for_podman_ready
    return $?
  fi

  if [[ "$(uname -s)" != Darwin ]] && command -v systemctl >/dev/null 2>&1; then
    systemctl --user start podman.socket >/dev/null 2>&1 \
      || systemctl start podman.socket >/dev/null 2>&1 \
      || true
    sleep 1
    podman_connection_ready && return 0
  fi

  return 1
}

resolve_container() {
  if [[ -n "$CONTAINER" ]]; then
    if ! command -v "$CONTAINER" >/dev/null 2>&1; then
      echo "Команда контейнера не найдена: $CONTAINER" >&2
      exit 1
    fi
    if [[ "$CONTAINER" == podman ]]; then
      try_start_podman || true
    fi
    if ! container_runtime_ready "$CONTAINER"; then
      echo "Ошибка: $CONTAINER установлен, но недоступен (демон не запущен?)." >&2
      if [[ "$CONTAINER" == docker ]] && command -v podman >/dev/null 2>&1; then
        echo "Попробуйте CONTAINER=podman ./run.sh … или запустите Docker." >&2
      elif [[ "$CONTAINER" == podman ]]; then
        echo "На macOS: podman machine start" >&2
      fi
      exit 1
    fi
    return
  fi

  if container_runtime_ready docker; then
    CONTAINER=docker
    return
  fi

  if try_start_podman; then
    if command -v docker >/dev/null 2>&1; then
      echo "docker не отвечает — используется podman." >&2
    fi
    CONTAINER=podman
    return
  fi

  if command -v docker >/dev/null 2>&1 || command -v podman >/dev/null 2>&1; then
    echo "Контейнерный runtime установлен, но недоступен." >&2
    if command -v docker >/dev/null 2>&1; then
      echo "  docker: запустите Docker Desktop или systemctl start docker" >&2
    fi
    if command -v podman >/dev/null 2>&1; then
      echo "  podman: podman machine start (macOS) или проверьте сокет" >&2
    fi
    exit 1
  fi

  echo "Не найден docker или podman. Установите один из них или задайте CONTAINER=podman ./run.sh …" >&2
  exit 1
}

ensure_project_dirs() {
  mkdir -p \
    "${ROOT}/json" \
    "${ROOT}/out" \
    "${ROOT}/public/images" \
    "${ROOT}/public/audio" \
    "${ROOT}/public/sounds" \
    "${ROOT}/public/music" \
    "${ROOT}/data" \
    "${ROOT}/prompts" \
    "${ROOT}/series" \
    "${ROOT}/.cache"

  if [[ ! -f "${ROOT}/public/conversation.json" ]] && [[ -f "${ROOT}/src/default-conversation.json" ]]; then
    cp "${ROOT}/src/default-conversation.json" "${ROOT}/public/conversation.json"
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
  ensure_podman_connection
  if ! "$CONTAINER" image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "Образ '$IMAGE' не найден. Собираю..."
    cmd_build
    return
  fi

  local current_hash image_hash
  current_hash="$(lock_file_hash)"
  image_hash="$("$CONTAINER" image inspect "$IMAGE" --format '{{ index .Config.Labels "lock_hash" }}' 2>/dev/null || true)"

  if [[ -z "$image_hash" || "$current_hash" != "$image_hash" ]]; then
    echo "package-lock.json изменился — пересборка образа (npm ci)…"
    cmd_build
    return
  fi

  if ! "$CONTAINER" run --rm "$IMAGE" node -e "import('sharp')" >/dev/null 2>&1; then
    echo "В образе нет актуальных зависимостей (sharp) — пересборка…"
    cmd_build
  fi
}

lock_file_hash() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${ROOT}/package-lock.json" | awk '{print $1}'
  else
    sha256sum "${ROOT}/package-lock.json" | awk '{print $1}'
  fi
}

warn_clock_skew() {
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi
  local remote_line remote_epoch local_epoch diff abs
  remote_line="$(
    curl -sI --max-time 8 https://registry.npmjs.org/ \
      | awk -F': ' 'tolower($1) == "date" { sub(/\r$/, "", $2); print $2; exit }'
  )"
  [[ -z "$remote_line" ]] && return 0

  if [[ "$(uname -s)" == Darwin ]]; then
    remote_epoch="$(TZ=UTC date -j -f "%a, %d %b %Y %H:%M:%S" "${remote_line% GMT}" +%s 2>/dev/null || true)"
  else
    remote_epoch="$(date -u -d "$remote_line" +%s 2>/dev/null || true)"
  fi
  [[ -z "$remote_epoch" ]] && return 0

  local_epoch="$(date +%s)"
  diff=$((local_epoch - remote_epoch))
  abs=${diff#-}
  if (( abs > 300 )); then
    local hours=$((abs / 3600))
    echo "ВНИМАНИЕ: часы Mac отстают/спешат ~${hours}ч — apt «not valid yet» и npm «Exit handler never called!»." >&2
    echo "  date -u && sudo sntp -sS time.apple.com && podman machine stop && podman machine start" >&2
  fi
}

cmd_build() {
  local lock_hash build_args=() attempt rc=1
  lock_hash="$(lock_file_hash)"
  warn_clock_skew
  ensure_podman_connection
  echo "Сборка образа (включая Chrome Headless Shell — один раз)..."
  if [[ "$CONTAINER" == podman ]]; then
    local vm_mem_mib=""
    vm_mem_mib="$(podman_machine_memory_mib || true)"
    if [[ -n "$vm_mem_mib" && "$vm_mem_mib" -lt 6000 ]]; then
      local vm_gib="?"
      if command -v awk >/dev/null 2>&1; then
        vm_gib="$(awk "BEGIN { printf \"%.1f\", ${vm_mem_mib}/1024 }")"
      fi
      echo "ВНИМАНИЕ: Podman VM ~${vm_gib} GiB RAM — npm ci может падать с OOM." >&2
      echo "  podman machine set --memory 8192 && podman machine stop && podman machine start" >&2
    fi
    echo "Podman: при npm «Exit handler never called!» — сначала синхронизируйте часы (см. выше), затем podman system prune -f"
  fi
  build_args=(
    --build-arg "LOCK_HASH=${lock_hash}"
    -t "$IMAGE"
  )
  if [[ "${BUILD_NO_CACHE:-0}" == 1 ]]; then
    build_args+=(--no-cache)
  fi
  for attempt in 1 2 3; do
    ensure_podman_connection || break
    if "$CONTAINER" build "${build_args[@]}" .; then
      rc=0
      break
    fi
    [[ "$CONTAINER" != podman || "$attempt" -eq 3 ]] && break
    echo "podman build: обрыв соединения, повтор ${attempt}/3…" >&2
    sleep 5
  done
  if (( rc != 0 )); then
    exit 1
  fi
  echo "Готово: образ $IMAGE"
}

# Общие тома: актуальный Remotion-код с хоста (без пересборки образа после git pull)
APP_VOLUMES=(
  -v "${ROOT}/json:/app/json"
  -v "${ROOT}/out:/app/out"
  -v "${ROOT}/public:/app/public"
  -v "${ROOT}/prompts:/app/prompts"
  -v "${ROOT}/series:/app/series:ro"
  -v "${ROOT}/data:/app/data"
  -v "${ROOT}/ui:/app/ui:ro"
  -v "${ROOT}/src:/app/src:ro"
  -v "${ROOT}/scripts:/app/scripts:ro"
  -v "${ROOT}/.cache:/app/.cache"
)

cmd_render() {
  parse_render_args "$@"
  ensure_project_dirs

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

  # src/scripts/public монтируются с хоста — рендер без пересборки образа после правок Remotion
  "$CONTAINER" run --rm \
    -v "${input_dir}:/input:ro" \
    -v "${output_dir}:/output" \
    -v "${ROOT}/public:/app/public:ro" \
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
  ensure_project_dirs
  ensure_image

  "$CONTAINER" run --rm -it \
    -p "${STUDIO_PORT}:3000" \
    -v "${ROOT}/public:/app/public" \
    -v "${ROOT}/out:/app/out" \
    "$IMAGE" \
    npx remotion studio src/index.ts --host=0.0.0.0 --port=3000
}

cmd_shell() {
  ensure_project_dirs
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
  shift 2

  ensure_project_dirs

  local -a env_args=(
    -e "PORT=3333"
    -e "NODE_OPTIONS=${NODE_OPTIONS:---max-old-space-size=4096}"
  )
  if [[ -n "${RENDER_CONCURRENCY}" ]]; then
    env_args+=(-e "RENDER_CONCURRENCY=${RENDER_CONCURRENCY}")
  fi
  if [[ $# -gt 0 ]]; then
    for item in "$@"; do
      env_args+=(-e "$item")
    done
  fi

  local -a volume_args=("${APP_VOLUMES[@]}")
  if [[ -f "${ROOT}/docs/.env" ]]; then
    volume_args+=(-v "${ROOT}/docs/.env:/app/docs/.env:ro")
    local openrouter_key
    openrouter_key="$(
      grep -E '^OPENROUTER_API_KEY=' "${ROOT}/docs/.env" 2>/dev/null \
        | head -1 \
        | cut -d= -f2- \
        | sed -e 's/^["'\'' ]*//' -e 's/["'\'' ]*$//' -e 's/\r$//'
    )"
    if [[ -n "$openrouter_key" ]]; then
      env_args+=(-e "OPENROUTER_API_KEY=${openrouter_key}")
    fi
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
  echo "Важно: после git pull перезапустите воркер (монтируются src/, scripts/, public/, .cache/)."
  echo "Озвучка: только на Mac (OpenRouter); WAV синхронизируются на воркер при рендере."
  echo "При изменении package-lock.json образ пересоберётся автоматически."
  echo "Если рендер падает на conversation.json — на этой машине: git pull && перезапуск воркера."
  echo "Остановка: Ctrl+C"

  run_server_container "chat-video-worker" "${WORKER_PORT}" \
    "NATIVE_PROJECT_ROOT=${ROOT}" \
    "REMOTE_RENDER_URL=${REMOTE_RENDER_URL:-}"
}

main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    -h|--help|help)
      usage
      exit 0
      ;;
  esac

  resolve_container
  echo "Контейнер: $CONTAINER"

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
    *)
      echo "Неизвестная команда: $cmd" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
