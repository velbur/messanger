# Chat Video Generator (WhatsApp style)

Генератор видео-переписки на Remotion: входной JSON -> вертикальный ролик 9:16 с анимацией набора и экспортом в MP4.

## Требования

- Node.js 20+
- npm
- ffmpeg / ffprobe в системе

Для Docker: установленный [Docker](https://docs.docker.com/get-docker/) (достаточно для рендера без локального Node/ffmpeg).

## Установка

```bash
npm install
```

## Входной JSON

Файл по умолчанию: `public/conversation.json`. Примеры: [`my-chat.json`](my-chat.json).

**Полная документация по полям, таймингу, emoji и ошибкам:**  
→ **[docs/JSON_FORMAT.md](docs/JSON_FORMAT.md)**

Кратко: корневой объект с `contactName`, `messages[]`; у каждого сообщения обязательны `author` (`me` | `them`) и `text`; emoji — Unicode, `:shortcode:` или `:)`.

## Веб-интерфейс (сборка из JSON)

Простая страница: вставить JSON → **Собрать видео**. Файлы сохраняются в проекте:

| Что | Путь |
|-----|------|
| JSON | `json/<имя>.json` |
| MP4 | `out/<имя>.mp4` |

### Docker (рекомендуется)

```bash
./run.sh build
./run.sh ui
```

Откройте **http://localhost:3333**. Рендер идёт в фоне (1–5+ минут), статус обновляется на странице. После готовности — ссылка «Скачать MP4».

Перед сборкой можно выбрать **светлую** или **тёмную** тему, **фоновую музыку** и **прикрепить изображения** из полей `image` в JSON (локальный путь или URL — см. `docs/JSON_FORMAT.md` §2.3).

Вкладка **«История»** — сохранённые переписки в локальной SQLite (`data/dialogues.db`, том `./run.sh ui` монтирует `data/`). **Редактор** — открыть, изменить, **Сохранить**, **Собрать видео** (при сохранённом диалоге JSON пишется в базу перед рендером).

Промпты к кадрам: **ChatGPT через OpenRouter** (`OPENROUTER_TEXT_MODEL`) читает **всю переписку** и формирует `imagePrompt`. Генерация вложений в чат: **4:3** (не Full HD 9:16), модель изображений — `OPENROUTER_IMAGE_MODEL`.

Опции: `./run.sh ui --build` (пересобрать образ), `./run.sh ui --port 8080`.

Остановка: **Ctrl+C** в терминале. Если терминал «завис» после рендера, подождите несколько секунд или выполните `docker rm -f chat-video-ui`.

### Локально (без Docker)

```bash
npm install
npm run ui
```

## Предпросмотр (Remotion Studio)

```bash
npm run dev
```

Откроется Remotion Studio с композицией `ChatVideo`.

## Рендер через CLI Remotion

```bash
npm run render
```

Команда выдаёт:
- 1080x1920
- 60 FPS
- MP4
- H.264
- AAC

## Docker

Сборка и рендер через `run.sh` (Node/ffmpeg/Chromium внутри контейнера):

```bash
chmod +x run.sh
./run.sh build    # Chrome скачивается в образ при сборке (~90 МБ)
./run.sh render   # повторные render без повторной загрузки
```

**Почему раньше качалось каждый раз:** `docker run --rm` создаёт новый контейнер; кэш в `node_modules/.remotion` не сохранялся. После `./run.sh build` браузер уже внутри образа. Если снова видите загрузку — пересоберите образ: `./run.sh build`.

Свой JSON и выходной файл:

```bash
./run.sh render --input ./my-chat.json --output ./out/result.mp4
```

Предпросмотр Remotion Studio в браузере:

```bash
./run.sh dev
# открыть http://localhost:3000
```

Справка по командам:

```bash
./run.sh help
```

## Фоновая музыка

По умолчанию играет **Романтика** (`music/romantic.mp3`), тихо на фоне, в цикле на всю длительность ролика.

В JSON:

```json
"music": {
  "enabled": true,
  "src": "music/romantic.mp3",
  "volume": 0.24
}
```

Отключить: `"music": { "enabled": false }`. Свой трек — положите в `public/` и укажите `src`.

## Звуки

По умолчанию в `public/sounds/`: входящее (два тона), исходящее (щелчок), набор (клик).

Пересоздать встроенные SFX:

```bash
npm run sounds:generate
```

Свои файлы — положите в `public/` и укажите в JSON:

```json
"sounds": {
  "incoming": "sounds/my-in.wav",
  "outgoing": "sounds/my-out.wav",
  "typing": "sounds/my-type.wav",
  "messageVolume": 0.8
}
```

## Рендер через скрипт с кастомным JSON

```bash
node scripts/render.mjs --input path/to/chat.json --output out/video.mp4
```

## Проверка параметров видео

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 out/video.mp4
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1 out/video.mp4
```

Ожидаемо:
- видео: `codec_name=h264`, `width=1080`, `height=1920`, `r_frame_rate=60/1`
- аудио: `codec_name=aac`
