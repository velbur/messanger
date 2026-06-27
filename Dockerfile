FROM node:22-bookworm-slim

# Chromium (Remotion headless) + ffmpeg + шрифты (в т.ч. кириллица)
# python3/make/g++ — запасной путь, если prebuilt-бинарники sharp/onnx не подойдут
# Если часы Podman VM отстают: «Release … not valid yet» — отключаем проверку даты apt
RUN printf '%s\n' \
    'Acquire::Check-Valid-Until "false";' \
    'Acquire::Check-Date "false";' \
    > /etc/apt/apt.conf.d/99docker-clock \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    wget \
    python3 \
    make \
    g++ \
    fonts-dejavu-core \
    fonts-noto-core \
    fonts-noto-color-emoji \
    fontconfig \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_TIMEOUT=300000
ENV NPM_CONFIG_MAXSOCKETS=2

COPY package.json package-lock.json ./
ARG LOCK_HASH=unknown
LABEL lock_hash=$LOCK_HASH
RUN npm cache clean --force \
  && npm ci --no-audit --no-fund \
  || (echo "npm ci failed — retry after cache clean" \
      && npm cache clean --force \
      && npm ci --no-audit --no-fund)

COPY . .

RUN mkdir -p out

# Скачать Chrome Headless Shell в образ (Linux), чтобы не качать при каждом render
RUN npx remotion browser ensure

ENV NODE_ENV=production

EXPOSE 3333

# Рендер по умолчанию; переопределяется в docker run / run.sh
CMD ["node", "scripts/render.mjs", "--input", "public/conversation.json", "--output", "out/video.mp4"]
