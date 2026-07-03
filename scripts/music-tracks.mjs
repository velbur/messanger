import path from "node:path";
import {copyFile, mkdir, readdir, stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {loadMusicLibrary, PUBLIC_MUSIC_DIR as LIB_PUBLIC_DIR} from "./music-library.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

export const AUDIO_DIR = path.join(ROOT, "audio");
export const PUBLIC_MUSIC_DIR = path.join(ROOT, "public", "music");

/** Не показывать в UI (старые треки / только для legacy JSON) */
export const HIDDEN_TRACKS = new Set(["velvet-receiver.mp3"]);

/** Legacy подписи для старых имён файлов */
export const TRACK_LABELS = {
  "romantic.mp3": "Романтика (legacy)",
  "fun.mp3": "Весёлая (legacy)",
  "mystic.mp3": "Мистика (legacy)",
  "kremlin.mp3": "Кремль (legacy)",
  "Thermal Relay.mp3": "Нейтральная (legacy)",
};

/** @type {Record<string, string[]>} */
let libraryMoodMap = {};

/** Настроения для автоподбора story-музыки (заполняется из library.json) */
export const MUSIC_TRACK_MOODS = {
  "romantic.mp3": ["romance", "warm", "calm", "neutral"],
  "fun.mp3": ["comedy", "light", "happy", "casual", "neutral"],
  "mystic.mp3": ["mystery", "horror", "tension", "night", "story"],
  "kremlin.mp3": ["dramatic", "serious", "political", "neutral"],
  "Thermal Relay.mp3": ["neutral", "calm", "ambient", "story"],
  "gasoline-heist.mp3": ["comedy", "tension", "story", "dramatic", "neutral"],
};

export const DEFAULT_MUSIC_ID = "romantic-beautiful-dream.mp3";

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

const mergeLibraryMoods = (tracks) => {
  for (const track of tracks) {
    if (track.id && Array.isArray(track.moods)) {
      MUSIC_TRACK_MOODS[track.id] = track.moods;
      libraryMoodMap[track.id] = track.moods;
    }
  }
};

const loadLibraryTracks = async () => {
  try {
    const library = await loadMusicLibrary();
    mergeLibraryMoods(library.tracks ?? []);
    return (library.tracks ?? [])
      .filter((track) => existsSync(path.join(PUBLIC_MUSIC_DIR, track.id)))
      .map((track) => ({
        id: track.id,
        label: track.label,
        title: track.title ?? track.label,
        category: track.category ?? null,
        moods: track.moods ?? [],
        license: track.license ?? library.license?.name ?? "Mixkit Free License",
        licenseUrl: track.licenseUrl ?? library.license?.url ?? "https://mixkit.co/license/",
        licenseNote: track.licenseNote ?? library.license?.note ?? null,
        sourceUrl: track.sourceUrl ?? null,
        src: `music/${track.id}`,
        previewUrl: `/music/${track.id}`,
      }));
  } catch {
    return [];
  }
};

export const listMusicTracks = async () => {
  await syncAudioToPublic();

  const libraryTracks = await loadLibraryTracks();
  const libraryIds = new Set(libraryTracks.map((t) => t.id));

  const names = new Set([
    ...(await collectFromDir(PUBLIC_MUSIC_DIR)),
    ...(await collectFromDir(AUDIO_DIR)),
  ]);

  const legacyTracks = [...names]
    .filter((file) => !HIDDEN_TRACKS.has(file) && !libraryIds.has(file))
    .sort((a, b) => {
      const labelA = TRACK_LABELS[a] ?? a;
      const labelB = TRACK_LABELS[b] ?? b;
      return labelA.localeCompare(labelB, "ru");
    })
    .map((file) => ({
      id: file,
      label: TRACK_LABELS[file] ?? file.replace(/\.mp3$/i, ""),
      title: TRACK_LABELS[file] ?? file.replace(/\.mp3$/i, ""),
      category: null,
      moods: MUSIC_TRACK_MOODS[file] ?? ["neutral"],
      license: null,
      licenseUrl: null,
      licenseNote: null,
      sourceUrl: null,
      src: `music/${file}`,
      previewUrl: `/music/${file}`,
    }));

  return [...libraryTracks, ...legacyTracks].sort((a, b) =>
    a.label.localeCompare(b.label, "ru"),
  );
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

export const getMusicLicenseInfo = async () => {
  try {
    const library = await loadMusicLibrary();
    return library.license ?? null;
  } catch {
    return null;
  }
};
