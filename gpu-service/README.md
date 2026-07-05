# GPU I2V Service (Wan 2.1 → 1080p)

Self-hosted image-to-video для story-кадров: **Wan 2.1 I2V-14B 720P** на GPU, финальный вывод **1080×1920 (9:16)**.

Целевой сервер: **1× Tesla A100 80 ГБ**, Ubuntu 22.04, CUDA 13, 256 ГБ NVMe.

## Быстрый старт

```bash
cd gpu-service
python3 -m venv .venv
source .venv/bin/activate

# PyTorch nightly для CUDA 13 (пример; проверьте актуальную команду на pytorch.org)
pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu130

pip install -r requirements.txt
chmod +x download_models.sh
./download_models.sh

# Опционально: HF token для gated-моделей
# export HF_TOKEN=hf_...

uvicorn app:app --host 0.0.0.0 --port 8008
```

Проверка:

```bash
curl http://localhost:8008/health
curl -X POST http://<server-ip>:8008/i2v \
  -F "image=@/path/to/frame.png" \
  -F "prompt=Subtle ambient motion" \
  -F "duration=4" \
  -F "aspect_ratio=9:16" \
  -o test.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 test.mp4
# Ожидаемо: 1080,1920,~4.x
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `WAN_MODEL_ID` | `Wan-AI/Wan2.1-I2V-14B-720P-Diffusers` | ID на Hugging Face для `download_models.sh` |
| `FLUX_MODEL_ID` | `black-forest-labs/FLUX.1-dev` | Text-to-image (gated; нужен `HF_TOKEN` + лицензия на HF) |
| `DOWNLOAD_FLUX` | `1` | Скачивать FLUX.1-dev в `./models/flux-1-dev` |
| `WAN_MODEL_PATH` | `./models/wan-i2v-14b-720p` | Локальный путь к весам Wan |
| `FLUX_MODEL_PATH` | `./models/flux-1-dev` | Локальный путь к FLUX.1-dev |
| `GPU_T2I_WIDTH` / `GPU_T2I_HEIGHT` | `1080` / `1920` | Story 9:16 |
| `GPU_T2I_STEPS` | `28` | Шаги FLUX |
| `GPU_T2I_GUIDANCE` | `3.5` | guidance_scale |
| `MODELS_DIR` | `./models` | Корень кэша весов |
| `GPU_UPSCALER` | `realesrgan` | `realesrgan` или `lanczos` |
| `GPU_I2V_FPS` | `16` | FPS выходного mp4 |
| `GPU_I2V_DURATION` | `4` | Длительность по умолчанию (сек) |
| `GPU_I2V_WIDTH` / `GPU_I2V_HEIGHT` | `1080` / `1920` | Финальное разрешение |
| `GPU_I2V_STEPS` | `30` | Шаги диффузии (меньше = быстрее, хуже детали; для теста: 15) |
| `GPU_I2V_GUIDANCE` | `5.0` | guidance_scale |
| `GPU_STARTUP_MODEL` | `none` | При старте: `none` (не грузить), `flux` или `wan` |

## Доставка весов (эфемерный сервер)

**Не заливайте ~32 ГБ с домашнего ПК** — качайте на сервере:

```bash
export HF_HUB_ENABLE_HF_TRANSFER=1
./download_models.sh
```

Скрипт идемпотентный: если веса уже в `./models`, повторно не качает.

### Персистентность

- **Диск переживает stop/start** (ваш провайдер) → веса остаются в `./models`, качать заново не нужно. После рестарта VM:
  ```bash
  cd gpu-service && GPU_STARTUP_MODEL=none ./start-server.sh
  ```
  Модель в VRAM не загружается при старте — переключите через API или UI перед работой.
- **Диск обнуляется** → сделайте **снапшот образа** после первого `./download_models.sh` (рестарт = готовый сервер).
- **Частое пересоздание** → храните `./models` на S3-совместимом volume того же региона и монтируйте при старте.

### Синхронизация кода

Код сервиса — через `git pull` или `rsync gpu-service/` (килобайты). Веса не трогаются.

### Переключение моделей (FLUX ↔ Wan)

Wan и FLUX не держатся в VRAM одновременно.

```bash
curl http://<server>:8008/models/status
curl -X POST http://<server>:8008/models/switch -F "target=flux"   # картинки
curl -X POST http://<server>:8008/models/switch -F "target=wan"    # I2V
curl -X POST http://<server>:8008/models/switch -F "target=none"    # выгрузить
```

UI и скрипты переключают автоматически: батч картинок → `flux`, story-видео → `wan`.

## Интеграция с проектом

На машине, где запускается UI / render (docs/.env):

```bash
# Story-кадры 9:16 (FLUX.1-dev)
export STORY_IMAGE_PROVIDER=local-gpu
export LOCAL_GPU_VIDEO_URL=http://<server-ip>:8008

# Story-видео (Wan 2.1 I2V)
export STORY_VIDEO_PROVIDER=local-gpu
# LOCAL_GPU_VIDEO_URL — тот же URL GPU-сервиса
```

Тесты из репозитория:

```bash
npm run test:local-gpu-image -- --health-only
npm run test:local-gpu-image -- --prompt "Cozy attic at night, vertical illustration"
npm run test:local-gpu-video -- --image public/images/<story-frame>.png
```

## Text-to-image (FLUX.1-dev)

```bash
curl -X POST http://<server>:8008/t2i \
  -F "prompt=Vertical illustration, cozy attic at night, cinematic, no text" \
  -F "width=1080" \
  -F "height=1920" \
  -F "steps=28"
# → {"job_id":"...", "status":"queued"}

curl http://<server>:8008/t2i/jobs/<job_id>
curl -o frame.png http://<server>:8008/t2i/jobs/<job_id>/download
```

Wan и FLUX **не загружены в VRAM одновременно** — сервис выгружает одну модель перед загрузкой другой.

## Remotion-рендер (MP4) на GPU-сервере

Порт **3333** — отдельный Node-воркер (`RENDER_WORKER=1`), не путать с gpu-service **8008**.

На GPU-сервере (после `git clone` / `rsync` проекта):

```bash
chmod +x gpu-service/start-render-worker.sh
./gpu-service/start-render-worker.sh
# Откройте порт 3333 в firewall
curl -s http://127.0.0.1:3333/api/render-targets
```

На Mac (`docs/.env`):

```bash
LOCAL_GPU_RENDER_URL=http://<gpu-server>:3333
# или автоматически тот же хост, что LOCAL_GPU_VIDEO_URL, порт 3333:
# LOCAL_GPU_RENDER_AUTO=1
# LOCAL_GPU_RENDER_DEFAULT=1   # выбирать GPU-сервер в UI по умолчанию
```

В UI при сборке появится пункт **«GPU-сервер (рендер)»**. Prep (картинки, Wan) идёт с Mac на :8008; финальный Remotion — на :3333.

## Доступ с локальной машины

- **Публичный IP + порт 8008** (откройте в firewall провайдера), или
- **SSH-туннель**: `ssh -L 8008:localhost:8008 user@server` → `LOCAL_GPU_VIDEO_URL=http://127.0.0.1:8008`

## Пайплайн

1. Wan I2V-14B генерирует 720×1280 (~4 с, 16 fps)
2. Апскейл до 1080×1920 (Real-ESRGAN или Lanczos)
3. MP4 h264 отдаётся через job API

### API (рекомендуется для клиентов)

```bash
# 1. Поставить задачу (мгновенный ответ)
curl -X POST http://<server>:8008/i2v -F "image=@frame.png" -F "prompt=..." -F "resolution=720p" -F "steps=15"
# → {"job_id":"...", "status":"queued"}

# 2. Статус
curl http://<server>:8008/i2v/jobs/<job_id>

# 3. Скачать mp4 когда status=completed
curl -o out.mp4 http://<server>:8008/i2v/jobs/<job_id>/download
```

Синхронный режим (может обрываться по таймауту прокси): `POST /i2v?wait=1`
