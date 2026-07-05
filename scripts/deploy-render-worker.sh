#!/usr/bin/env bash
# Деплой на LAN GPU render-воркер (rsync + перезапуск :3333).
#
# Хост: GPU_DEPLOY_HOST или хост из LOCAL_GPU_RENDER_URL в docs/.env
#
#   ./scripts/deploy-render-worker.sh
#   GPU_DEPLOY_HOST=192.168.0.136 ./scripts/deploy-render-worker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

resolve_deploy_host() {
  if [[ -n "${GPU_DEPLOY_HOST:-}" ]]; then
    echo "$GPU_DEPLOY_HOST"
    return
  fi
  if [[ -f "${ROOT}/docs/.env" ]]; then
    local url
    url="$(grep -E '^LOCAL_GPU_RENDER_URL=' "${ROOT}/docs/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
    if [[ -n "$url" ]]; then
      echo "$url" | sed -E 's#^https?://##' | cut -d/ -f1 | cut -d: -f1
      return
    fi
  fi
  echo "Задай GPU_DEPLOY_HOST или LOCAL_GPU_RENDER_URL в docs/.env" >&2
  exit 1
}

HOST="$(resolve_deploy_host)"
SSH_USER="${GPU_DEPLOY_USER:-root}"
SSH_TARGET="${SSH_USER}@${HOST}"
REPO_PATH="${GPU_DEPLOY_PATH:-/root/messanger}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new)

echo "==> Деплой render-воркера → ${SSH_TARGET}:${REPO_PATH}"
echo "    Локальный коммит: $(git log -1 --oneline)"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude out \
  --exclude .cache \
  --exclude .venv \
  --exclude gpu-service/.venv \
  --exclude gpu-service/models \
  --exclude gpu-service/__pycache__ \
  --exclude 'public/audio' \
  --exclude 'public/images' \
  --exclude docs/.env \
  -e "ssh ${SSH_OPTS[*]}" \
  "${ROOT}/" "${SSH_TARGET}:${REPO_PATH}/"

ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "bash -s" <<REMOTE
set -euo pipefail
REPO_PATH="${REPO_PATH}"
cd "\${REPO_PATH}"

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true
export NODE_TLS_REJECT_UNAUTHORIZED="\${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

chmod +x gpu-service/start-render-worker.sh worker-start.sh 2>/dev/null || true

if [[ ! -f node_modules/tsx/package.json ]]; then
  echo "==> npm ci…"
  npm ci --no-audit --no-fund
fi

if [[ ! -x .venv/bin/python ]] && [[ -f scripts/python/requirements-depth.txt ]]; then
  echo "==> Python venv для depth…"
  ./run.sh setup-native 2>&1 | tail -15
fi

echo "==> Перезапуск render-воркера…"
./gpu-service/start-render-worker.sh
sleep 3
curl -sf "http://127.0.0.1:\${RENDER_WORKER_PORT:-3333}/api/render-targets" | head -c 240
echo
echo "Деплой завершён."
REMOTE

echo "==> Готово: ${SSH_TARGET}"

if [[ -x "${ROOT}/scripts/install-remotion-chromium-linux.sh" ]]; then
  echo "==> Chromium для Remotion…"
  "${ROOT}/scripts/install-remotion-chromium-linux.sh" "${SSH_TARGET}" || true
fi
