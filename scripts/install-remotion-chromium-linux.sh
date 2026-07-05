#!/usr/bin/env bash
# Устанавливает Chrome Headless Shell для Remotion на Linux render-воркер.
#
#   ./scripts/install-remotion-chromium-linux.sh
#   ./scripts/install-remotion-chromium-linux.sh root@192.168.0.136
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="149.0.7790.0"
ZIP_NAME="chromium-headless-shell-linux-x64-${VERSION}.zip"
CACHE_DIR="${TMPDIR:-/tmp}/remotion-chrome"
ZIP_PATH="${CACHE_DIR}/${ZIP_NAME}"
URL="https://remotion.media/chromium-headless-shell-linux-x64-${VERSION}.zip?clear"

resolve_ssh_target() {
  if [[ -n "${1:-}" ]]; then
    echo "$1"
    return
  fi
  if [[ -n "${GPU_DEPLOY_HOST:-}" ]]; then
    echo "${GPU_DEPLOY_USER:-root}@${GPU_DEPLOY_HOST}"
    return
  fi
  if [[ -f "${ROOT}/docs/.env" ]]; then
    local host
    host="$(grep -E '^LOCAL_GPU_RENDER_URL=' "${ROOT}/docs/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | sed -E 's#^https?://##' | cut -d/ -f1 | cut -d: -f1)"
    if [[ -n "$host" ]]; then
      echo "root@${host}"
      return
    fi
  fi
  echo "Задай SSH target, GPU_DEPLOY_HOST или LOCAL_GPU_RENDER_URL в docs/.env" >&2
  exit 1
}

SSH_TARGET="$(resolve_ssh_target "${1:-}")"
REPO_PATH="${GPU_DEPLOY_PATH:-/root/messanger}"
REMOTE_BASE="${REPO_PATH}/node_modules/.remotion/chrome-headless-shell"
REMOTE_BIN="${REMOTE_BASE}/linux64/chrome-headless-shell-linux64/chrome-headless-shell"

mkdir -p "${CACHE_DIR}"
if [[ ! -f "${ZIP_PATH}" ]]; then
  echo "==> Скачиваем Chromium ${VERSION} (локально)…"
  curl -fsSL -o "${ZIP_PATH}" "${URL}"
fi

STAGING="${CACHE_DIR}/staging-linux64"
rm -rf "${STAGING}"
mkdir -p "${STAGING}/linux64"
unzip -q -o "${ZIP_PATH}" -d "${STAGING}/linux64/"

echo "==> Заливаем Chromium на ${SSH_TARGET}…"
ssh -o BatchMode=yes -o ConnectTimeout=20 "${SSH_TARGET}" "mkdir -p '${REMOTE_BASE}'"
rsync -az "${STAGING}/linux64/" "${SSH_TARGET}:${REMOTE_BASE}/linux64/"
ssh -o BatchMode=yes "${SSH_TARGET}" "printf '%s\n' '${VERSION}' > '${REMOTE_BASE}/VERSION' && chmod +x '${REMOTE_BIN}' && test -x '${REMOTE_BIN}' && echo 'Chromium OK: ${REMOTE_BIN}'"
