#!/usr/bin/env bash
# Деплой на GPU render-воркер после git push.
# Использование:
#   ./scripts/deploy-render-worker.sh
#   GPU_DEPLOY_HOST=vm-7742.user-project-3417.cloud.intcld.ru ./scripts/deploy-render-worker.sh
#
# Хост по умолчанию — из LOCAL_GPU_RENDER_URL в docs/.env (без схемы и порта).
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
  echo "vm-7742.user-project-3417.cloud.intcld.ru"
}

HOST="$(resolve_deploy_host)"
SSH_USER="${GPU_DEPLOY_USER:-root}"
SSH_TARGET="${SSH_USER}@${HOST}"
REPO_PATH="${GPU_DEPLOY_PATH:-/root/messanger}"
BRANCH="${GPU_DEPLOY_BRANCH:-main}"

echo "==> Деплой render-воркера → ${SSH_TARGET}:${REPO_PATH} (${BRANCH})"

ssh -o BatchMode=yes -o ConnectTimeout=20 "${SSH_TARGET}" "bash -s" <<REMOTE
set -euo pipefail
REPO_PATH="${REPO_PATH}"
BRANCH="${BRANCH}"

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true
export NODE_TLS_REJECT_UNAUTHORIZED="\${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

if [[ ! -d "\${REPO_PATH}" ]]; then
  mkdir -p "\$(dirname "\${REPO_PATH}")"
  git clone --branch "\${BRANCH}" https://github.com/velbur/messanger.git "\${REPO_PATH}"
fi

cd "\${REPO_PATH}"

if [[ ! -d .git ]]; then
  echo "Инициализация git в существующей копии…"
  git init -q
  git remote add origin https://github.com/velbur/messanger.git 2>/dev/null || git remote set-url origin https://github.com/velbur/messanger.git
fi

git config --global --add safe.directory "\${REPO_PATH}" 2>/dev/null || true

ENV_BACKUP=""
if [[ -f docs/.env ]]; then
  ENV_BACKUP="\$(mktemp)"
  cp docs/.env "\${ENV_BACKUP}"
fi

git fetch origin "\${BRANCH}"
git checkout -B "\${BRANCH}" "origin/\${BRANCH}"
git reset --hard "origin/\${BRANCH}"

if [[ -n "\${ENV_BACKUP}" ]]; then
  mkdir -p docs
  cp "\${ENV_BACKUP}" docs/.env
  rm -f "\${ENV_BACKUP}"
fi

chmod +x gpu-service/start-render-worker.sh worker-start.sh 2>/dev/null || true

LOCK_CHANGED=0
if [[ -f package-lock.json ]]; then
  if [[ ! -f node_modules/tsx/package.json ]] || ! git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q package-lock.json; then
    :
  else
    LOCK_CHANGED=1
  fi
fi
if [[ ! -f node_modules/tsx/package.json ]]; then
  echo "==> npm ci…"
  npm ci --no-audit --no-fund
elif [[ "\${LOCK_CHANGED}" == "1" ]]; then
  echo "==> npm ci (обновился package-lock)…"
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
echo "Деплой завершён: \$(git log -1 --oneline)"
REMOTE

echo "==> Готово: ${SSH_TARGET}"
