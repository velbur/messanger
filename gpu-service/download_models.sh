#!/usr/bin/env bash
# Идемпотентная загрузка весов Wan, FLUX.1-dev (и опц. Real-ESRGAN) на GPU-сервере.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

export HF_XET_HIGH_PERFORMANCE="${HF_XET_HIGH_PERFORMANCE:-1}"

WAN_MODEL_ID="${WAN_MODEL_ID:-Wan-AI/Wan2.1-I2V-14B-720P-Diffusers}"
FLUX_MODEL_ID="${FLUX_MODEL_ID:-black-forest-labs/FLUX.1-dev}"
MODELS_DIR="${MODELS_DIR:-$ROOT/models}"
WAN_DIR="$MODELS_DIR/wan-i2v-14b-720p"
FLUX_DIR="$MODELS_DIR/flux-1-dev"
REALESRGAN_DIR="$MODELS_DIR/realesrgan"
# Опционально для GPU_UPSCALER=realesrgan
REALESRGAN_URL="${REALESRGAN_URL:-https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth}"
DOWNLOAD_UPSCALER="${DOWNLOAD_UPSCALER:-1}"
DOWNLOAD_FLUX="${DOWNLOAD_FLUX:-1}"

mkdir -p "$MODELS_DIR"

have_wan_weights() {
  [[ -f "$WAN_DIR/model_index.json" ]] \
    && [[ -f "$WAN_DIR/vae/config.json" ]] \
    && { [[ -f "$WAN_DIR/transformer/diffusion_pytorch_model.safetensors.index.json" ]] \
      || ls "$WAN_DIR"/transformer/*.safetensors >/dev/null 2>&1; }
}

have_realesrgan_weights() {
  [[ -d "$REALESRGAN_DIR" ]] && find "$REALESRGAN_DIR" -name '*.pth' -o -name '*.safetensors' | grep -q .
}

have_flux_weights() {
  [[ -f "$FLUX_DIR/model_index.json" ]] \
    && [[ -f "$FLUX_DIR/ae.safetensors" ]] \
    && [[ -f "$FLUX_DIR/transformer/diffusion_pytorch_model-00001-of-00003.safetensors" ]] \
    && [[ -f "$FLUX_DIR/transformer/diffusion_pytorch_model-00002-of-00003.safetensors" ]] \
    && [[ -f "$FLUX_DIR/transformer/diffusion_pytorch_model-00003-of-00003.safetensors" ]] \
    && [[ -f "$FLUX_DIR/text_encoder_2/model-00002-of-00002.safetensors" ]]
}

download_hf() {
  local repo_id="$1"
  local local_dir="$2"
  echo "==> Hugging Face: $repo_id -> $local_dir"
  export HF_HUB_ENABLE_HF_TRANSFER=1
  export HUGGING_FACE_HUB_TOKEN="${HF_TOKEN:-${HUGGING_FACE_HUB_TOKEN:-}}"
  if command -v hf >/dev/null 2>&1; then
    if [[ -n "${HF_TOKEN:-}" ]]; then
      hf download "$repo_id" --local-dir "$local_dir" --token "$HF_TOKEN"
    else
      hf download "$repo_id" --local-dir "$local_dir"
    fi
  else
    if [[ -n "${HF_TOKEN:-}" ]]; then
      huggingface-cli download "$repo_id" --local-dir "$local_dir" --token "$HF_TOKEN"
    else
      huggingface-cli download "$repo_id" --local-dir "$local_dir"
    fi
  fi
}

if ! command -v hf >/dev/null 2>&1 && ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "hf / huggingface-cli не найден. Установите: pip install 'huggingface_hub[hf_transfer]'" >&2
  exit 1
fi

if have_wan_weights; then
  echo "Wan: веса уже на месте -> $WAN_DIR"
else
  download_hf "$WAN_MODEL_ID" "$WAN_DIR"
fi

if [[ "$DOWNLOAD_UPSCALER" == "1" ]]; then
  if have_realesrgan_weights; then
    echo "Real-ESRGAN: веса уже на месте -> $REALESRGAN_DIR"
  else
    mkdir -p "$REALESRGAN_DIR"
    echo "==> Real-ESRGAN x4plus -> $REALESRGAN_DIR/RealESRGAN_x4plus.pth"
    curl -fL "$REALESRGAN_URL" -o "$REALESRGAN_DIR/RealESRGAN_x4plus.pth" || {
      echo "Предупреждение: Real-ESRGAN не скачался — будет Lanczos upscale" >&2
    }
  fi
fi

if [[ "$DOWNLOAD_FLUX" == "1" ]]; then
  if have_flux_weights; then
    echo "FLUX.1-dev: веса уже на месте -> $FLUX_DIR"
  else
    if [[ -z "${HF_TOKEN:-}" ]]; then
      echo "FLUX.1-dev: нужен HF_TOKEN в .env (gated-модель на Hugging Face)" >&2
      echo "  1) Примите лицензию: https://huggingface.co/black-forest-labs/FLUX.1-dev" >&2
      echo "  2) export HF_TOKEN=hf_... в gpu-service/.env" >&2
      exit 1
    fi
    download_hf "$FLUX_MODEL_ID" "$FLUX_DIR"
  fi
fi

echo "Готово."
echo "  Wan:  $WAN_DIR"
[[ "$DOWNLOAD_FLUX" == "1" ]] && echo "  FLUX: $FLUX_DIR"
