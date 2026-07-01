import path from "node:path";
import {mkdir, readFile, writeFile, stat} from "node:fs/promises";
import {existsSync} from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");
export const MUSIC_LIBRARY_PATH = path.join(ROOT, "music", "library.json");
export const PUBLIC_MUSIC_DIR = path.join(ROOT, "public", "music");

export const MIXKIT_LICENSE = {
  name: "Mixkit Free License",
  url: "https://mixkit.co/license/",
  note: "Можно в YouTube, TikTok и соцсетях без атрибуции. Не для ТВ/радио и CD.",
};

/** mixkitId → настроения для автоподбора */
export const CURATED_MIXKIT_TRACKS = [
  {mixkitId: 493, moods: ["romance", "warm", "calm", "neutral"], category: "romantic"},
  {mixkitId: 659, moods: ["romance", "love", "warm", "neutral"], category: "romantic"},
  {mixkitId: 601, moods: ["romance", "reflective", "calm"], category: "romantic"},
  {mixkitId: 644, moods: ["comedy", "light", "happy", "casual", "neutral"], category: "upbeat"},
  {mixkitId: 5, moods: ["comedy", "light", "happy", "casual"], category: "comedy"},
  {mixkitId: 466, moods: ["comedy", "casual", "light"], category: "comedy"},
  {mixkitId: 614, moods: ["dramatic", "serious", "story", "neutral"], category: "cinematic"},
  {mixkitId: 871, moods: ["dramatic", "story", "tension"], category: "cinematic"},
  {mixkitId: 188, moods: ["mystery", "horror", "tension", "night", "story"], category: "mystery"},
  {mixkitId: 615, moods: ["mystery", "tension", "night", "story"], category: "mystery"},
  {mixkitId: 165, moods: ["mystery", "tension", "night", "story"], category: "mystery"},
  {mixkitId: 404, moods: ["mystery", "tension", "dramatic", "story"], category: "mystery"},
  {mixkitId: 538, moods: ["mystery", "horror", "tension", "night"], category: "mystery"},
  {mixkitId: 565, moods: ["mystery", "tension", "story", "night"], category: "mystery"},
  {mixkitId: 588, moods: ["mystery", "horror", "night", "story"], category: "mystery"},
  {mixkitId: 605, moods: ["mystery", "horror", "tension", "night"], category: "mystery"},
  {mixkitId: 548, moods: ["mystery", "story", "tension", "night"], category: "mystery"},
  {mixkitId: 671, moods: ["mystery", "horror", "tension", "night", "story"], category: "mystery"},
  {mixkitId: 122, moods: ["mystery", "night", "tension", "story"], category: "mystery"},
  {mixkitId: 464, moods: ["mystery", "tension", "story", "night"], category: "mystery"},
  {mixkitId: 141, moods: ["mystery", "night", "tension", "story"], category: "mystery"},
  {mixkitId: 612, moods: ["mystery", "horror", "tension"], category: "mystery"},
  {mixkitId: 443, moods: ["neutral", "calm", "ambient", "story"], category: "calm"},
  {mixkitId: 127, moods: ["neutral", "calm", "relaxation"], category: "calm"},
  {mixkitId: 657, moods: ["neutral", "calm", "ambient"], category: "ambient"},
];

const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48) || "track";

export const mixkitDownloadUrl = (mixkitId) =>
  `https://assets.mixkit.co/music/${mixkitId}/${mixkitId}.mp3`;

export const mixkitItemUrl = (mixkitId) =>
  `https://mixkit.co/free-stock-music/item/${mixkitId}/`;

export const fetchMixkitTitle = async (mixkitId) => {
  const res = await fetch(mixkitItemUrl(mixkitId), {
    headers: {"User-Agent": "messanger-music-sync/1.0"},
  });
  if (!res.ok) {
    throw new Error(`Mixkit #${mixkitId}: HTTP ${res.status}`);
  }
  const html = await res.text();
  const jsonMatch = html.match(/"name":"([^"]+)"/);
  if (jsonMatch?.[1] && jsonMatch[1] !== "Mixkit") {
    return jsonMatch[1];
  }
  const titleMatch = html.match(/<title>([^|<]+)/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }
  return `Track ${mixkitId}`;
};

const CATEGORY_LABELS = {
  romantic: "Романтика",
  upbeat: "Бодрая",
  comedy: "Комедия",
  cinematic: "Кино",
  mystery: "Мистика",
  calm: "Спокойная",
  ambient: "Фон",
};

export const buildTrackEntry = async ({mixkitId, moods, category}) => {
  const title = await fetchMixkitTitle(mixkitId);
  const slug = slugify(title);
  const id = `${category}-${slug}.mp3`;
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  return {
    id,
    label: `${categoryLabel} — ${title}`,
    title,
    category,
    mixkitId,
    moods,
    license: MIXKIT_LICENSE.name,
    licenseUrl: MIXKIT_LICENSE.url,
    licenseNote: MIXKIT_LICENSE.note,
    sourceUrl: mixkitItemUrl(mixkitId),
    downloadUrl: mixkitDownloadUrl(mixkitId),
  };
};

export const downloadTrackFile = async (track, {force = false} = {}) => {
  await mkdir(PUBLIC_MUSIC_DIR, {recursive: true});
  const dest = path.join(PUBLIC_MUSIC_DIR, track.id);
  if (!force && existsSync(dest)) {
    const info = await stat(dest);
    if (info.size > 10_000) {
      return {path: dest, skipped: true};
    }
  }

  const res = await fetch(track.downloadUrl, {
    headers: {
      "User-Agent": "messanger-music-sync/1.0",
      Referer: "https://mixkit.co/",
    },
  });
  if (!res.ok) {
    throw new Error(`${track.id}: download HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 10_000) {
    throw new Error(`${track.id}: слишком маленький файл`);
  }
  await writeFile(dest, buffer);
  return {path: dest, skipped: false};
};

export const loadMusicLibrary = async () => {
  try {
    const raw = await readFile(MUSIC_LIBRARY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tracks)) {
      throw new Error("library.json: нет массива tracks");
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {version: 1, tracks: []};
    }
    throw error;
  }
};

export const saveMusicLibrary = async (library) => {
  await mkdir(path.dirname(MUSIC_LIBRARY_PATH), {recursive: true});
  await writeFile(MUSIC_LIBRARY_PATH, `${JSON.stringify(library, null, 2)}\n`, "utf8");
};

export const syncMusicLibrary = async ({force = false, rebuildManifest = false} = {}) => {
  const logs = [];
  let tracks;

  if (rebuildManifest || !existsSync(MUSIC_LIBRARY_PATH)) {
    logs.push(`Собираю каталог из ${CURATED_MIXKIT_TRACKS.length} треков Mixkit…`);
    tracks = [];
    for (const spec of CURATED_MIXKIT_TRACKS) {
      const entry = await buildTrackEntry(spec);
      tracks.push(entry);
      logs.push(`  · ${entry.label}`);
    }
    await saveMusicLibrary({version: 1, license: MIXKIT_LICENSE, tracks});
  } else {
    const library = await loadMusicLibrary();
    tracks = library.tracks;
    logs.push(`Каталог: ${tracks.length} треков`);
  }

  let downloaded = 0;
  let skipped = 0;
  for (const track of tracks) {
    const result = await downloadTrackFile(track, {force});
    if (result.skipped) {
      skipped += 1;
    } else {
      downloaded += 1;
      logs.push(`Скачан: ${track.id}`);
    }
  }

  logs.push(`Готово: скачано ${downloaded}, уже было ${skipped}`);
  return {tracks, logs};
};
