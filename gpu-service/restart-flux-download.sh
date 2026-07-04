#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

pkill -9 -f 'hf download black-forest-labs' 2>/dev/null || true
pkill -9 -f 'download_models.sh' 2>/dev/null || true
sleep 2
find "$ROOT/models/flux-1-dev" -name '*.lock' -delete 2>/dev/null || true

source "$ROOT/.venv/bin/activate"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a
export HF_HUB_ENABLE_HF_TRANSFER=1
export HUGGING_FACE_HUB_TOKEN="${HF_TOKEN:-${HUGGING_FACE_HUB_TOKEN:-}}"

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "HF_TOKEN не задан в .env — скачивание будет медленным (unauthenticated)" >&2
  HF_DL=(hf download black-forest-labs/FLUX.1-dev --local-dir "$ROOT/models/flux-1-dev")
else
  HF_DL=(hf download black-forest-labs/FLUX.1-dev --local-dir "$ROOT/models/flux-1-dev" --token "$HF_TOKEN")
fi

nohup "${HF_DL[@]}" > "$ROOT/flux-download.log" 2>&1 &
echo "flux-download pid=$!"
echo "tail -f $ROOT/flux-download.log"
