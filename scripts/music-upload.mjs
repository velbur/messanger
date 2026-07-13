import path from "node:path";
import {existsSync} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {
  PUBLIC_MUSIC_DIR,
  loadMusicLibrary,
  saveMusicLibrary,
} from "./music-library.mjs";

const MAX_MUSIC_UPLOAD_BYTES = 32 * 1024 * 1024;

const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48) || "track";

const isMp3Buffer = (buffer) => {
  if (!buffer || buffer.length < 3) {
    return false;
  }
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return true;
  }
  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
};

export const sanitizeMusicUploadFileName = (fileName) => {
  const base = path.basename(String(fileName ?? "").trim());
  if (!base.toLowerCase().endsWith(".mp3")) {
    throw new Error("Нужен файл MP3");
  }
  const stem = base.slice(0, -4);
  const slug = slugify(stem) || "track";
  return `${slug}.mp3`;
};

const uniqueMusicFileName = async (preferred) => {
  if (!existsSync(path.join(PUBLIC_MUSIC_DIR, preferred))) {
    return preferred;
  }
  const stem = preferred.slice(0, -4);
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${stem}-${index}.mp3`;
    if (!existsSync(path.join(PUBLIC_MUSIC_DIR, candidate))) {
      return candidate;
    }
  }
  return `upload-${Date.now()}.mp3`;
};

const humanTitleFromFileName = (fileName) =>
  path
    .basename(String(fileName ?? "").trim(), ".mp3")
    .replace(/[-_]+/g, " ")
    .trim();

/** Сохраняет MP3 в public/music/, регистрирует в library.json, возвращает track id. */
export const uploadUserMusicTrack = async (buffer, {fileName, label} = {}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Пустой файл");
  }
  if (!isMp3Buffer(buffer)) {
    throw new Error("Файл не похож на MP3");
  }

  const maxBytes = MAX_MUSIC_UPLOAD_BYTES;
  if (buffer.length > maxBytes) {
    throw new Error(`Файл слишком большой (макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`);
  }

  await mkdir(PUBLIC_MUSIC_DIR, {recursive: true});
  const safeName = await uniqueMusicFileName(sanitizeMusicUploadFileName(fileName));
  await writeFile(path.join(PUBLIC_MUSIC_DIR, safeName), buffer);

  const title =
    String(label ?? "").trim() ||
    humanTitleFromFileName(fileName) ||
    safeName.replace(/\.mp3$/i, "");

  const library = await loadMusicLibrary();
  if (!Array.isArray(library.tracks)) {
    library.tracks = [];
  }
  const trackLabel = title.includes("—") ? title : `Загружено — ${title}`;
  if (!library.tracks.some((track) => track.id === safeName)) {
    library.tracks.push({
      id: safeName,
      label: trackLabel,
      title,
      category: "uploads",
      moods: ["neutral", "story"],
      license: "Custom",
      licenseUrl: null,
      licenseNote: "Загружено вручную — проверьте права перед публикацией",
      sourceUrl: null,
    });
    await saveMusicLibrary(library);
  }

  return {
    id: safeName,
    track: {
      id: safeName,
      label: trackLabel,
      title,
      category: "uploads",
      moods: ["neutral", "story"],
      license: "Custom",
      licenseUrl: null,
      licenseNote: "Загружено вручную — проверьте права перед публикацией",
      sourceUrl: null,
      src: `music/${safeName}`,
      previewUrl: `/music/${safeName}`,
    },
  };
};
