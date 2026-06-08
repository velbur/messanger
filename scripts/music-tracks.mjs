import path from "node:path";
import {copyFile, mkdir, readdir, stat} from "node:fs/promises";
import {existsSync} from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");

export const AUDIO_DIR = path.join(ROOT, "audio");
export const PUBLIC_MUSIC_DIR = path.join(ROOT, "public", "music");

/** Не показывать в UI (старые треки / только для legacy JSON) */
export const HIDDEN_TRACKS = new Set(["velvet-receiver.mp3"]);

/** Подписи в UI (ключ — имя файла) */
export const TRACK_LABELS = {
  "romantic.mp3": "Романтика",
  "fun.mp3": "Весёлая",
  "mystic.mp3": "Мистика",
  "kremlin.mp3": "Кремль",
};

export const DEFAULT_MUSIC_ID = "romantic.mp3";

const isMp3 = (name) => name.toLowerCase().endsWith(".mp3");

const collectFromDir = async (dir) => {
  try {
    const entries = await readdir(dir);
    return entries.filter(isMp3);
  } catch {
    return [];
  }
};

/** Скопировать треки из audio/ в public/music/, если их ещё нет в public */
export const syncAudioToPublic = async () => {
  await mkdir(PUBLIC_MUSIC_DIR, {recursive: true});
  const fromAudio = await collectFromDir(AUDIO_DIR);

  for (const file of fromAudio) {
    const src = path.join(AUDIO_DIR, file);
    const dest = path.join(PUBLIC_MUSIC_DIR, file);
    if (!existsSync(dest)) {
      await copyFile(src, dest);
      continue;
    }
    const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)]);
    if (srcStat.mtimeMs > destStat.mtimeMs) {
      await copyFile(src, dest);
    }
  }
};

export const listMusicTracks = async () => {
  await syncAudioToPublic();

  const names = new Set([
    ...(await collectFromDir(PUBLIC_MUSIC_DIR)),
    ...(await collectFromDir(AUDIO_DIR)),
  ]);

  return [...names]
    .filter((file) => !HIDDEN_TRACKS.has(file))
    .sort((a, b) => {
      const labelA = TRACK_LABELS[a] ?? a;
      const labelB = TRACK_LABELS[b] ?? b;
      return labelA.localeCompare(labelB, "ru");
    })
    .map((file) => ({
      id: file,
      label: TRACK_LABELS[file] ?? file.replace(/\.mp3$/i, ""),
      src: `music/${file}`,
      previewUrl: `/music/${file}`,
    }));
};

export const resolveMusicSrc = async (musicId) => {
  if (!musicId || musicId === "none") {
    return null;
  }

  const file = path.basename(String(musicId));
  if (!isMp3(file)) {
    throw new Error("Некорректный трек");
  }

  await syncAudioToPublic();

  const inPublic = path.join(PUBLIC_MUSIC_DIR, file);
  if (!existsSync(inPublic)) {
    const inAudio = path.join(AUDIO_DIR, file);
    if (!existsSync(inAudio)) {
      throw new Error(`Трек не найден: ${file}`);
    }
    await mkdir(PUBLIC_MUSIC_DIR, {recursive: true});
    await copyFile(inAudio, inPublic);
  }

  return `music/${file}`;
};

/** Найти id трека по music.src из JSON */
export const musicIdFromSrc = (src) => {
  if (!src || typeof src !== "string") {
    return null;
  }
  const file = path.basename(src);
  return isMp3(file) ? file : null;
};
