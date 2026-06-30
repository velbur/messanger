import path from "node:path";
import {mkdir} from "node:fs/promises";
import {DatabaseSync} from "node:sqlite";
import {runDialogueMigrations} from "./dialogue-migrations.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "dialogues.db");

let db;

const getDb = () => {
  if (!db) {
    throw new Error("База диалогов не инициализирована");
  }
  return db;
};

export const initDialogueDb = async () => {
  await mkdir(DATA_DIR, {recursive: true});
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS dialogues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      contact_name TEXT,
      wallpaper TEXT NOT NULL DEFAULT 'default',
      music TEXT NOT NULL DEFAULT '',
      output_file TEXT,
      dialogue_prompt TEXT NOT NULL DEFAULT '',
      title_display TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'shorts',
      series_id TEXT NOT NULL DEFAULT '',
      part_number INTEGER,
      conversation_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dialogues_updated ON dialogues(updated_at DESC);
  `);

  await runDialogueMigrations(db);
};

const DIALOGUE_LIST_COLUMNS = `id, title, title_display, contact_name, wallpaper, music, output_file, dialogue_prompt,
  kind, series_id, part_number, conversation_json, created_at, updated_at`;

const rowToListItem = (row) => ({
  id: row.id,
  title: row.title,
  titleDisplay: row.title_display ?? "",
  contactName: row.contact_name ?? "",
  wallpaper: row.wallpaper,
  music: row.music,
  dialoguePrompt: row.dialogue_prompt ?? "",
  kind: row.kind === "series" ? "series" : row.kind === "video" ? "video" : "shorts",
  seriesId: row.series_id ?? "",
  partNumber: row.part_number ?? null,
  messageCount: countMessages(row.conversation_json),
  outputFile: row.output_file,
  downloadUrl: row.output_file ? `/out/${row.output_file}` : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const countMessages = (jsonText) => {
  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed.messages) ? parsed.messages.length : 0;
  } catch {
    return 0;
  }
};

const defaultTitle = (conversation) => {
  const name = conversation?.contactName?.trim();
  if (name) {
    return name;
  }
  const count = Array.isArray(conversation?.messages) ? conversation.messages.length : 0;
  return count > 0 ? `Диалог (${count} сообщ.)` : "Новый диалог";
};

export const listDialogues = ({kind} = {}) => {
  const normalizedKind = kind === "series" || kind === "shorts" || kind === "video" ? kind : null;
  const rows = normalizedKind
    ? getDb()
        .prepare(
          `SELECT ${DIALOGUE_LIST_COLUMNS}
           FROM dialogues WHERE kind = ? ORDER BY updated_at DESC`,
        )
        .all(normalizedKind)
    : getDb()
        .prepare(
          `SELECT ${DIALOGUE_LIST_COLUMNS}
           FROM dialogues ORDER BY updated_at DESC`,
        )
        .all();
  return rows.map(rowToListItem);
};

export const getSeriesContextMessages = (seriesId, beforePartNumber) => {
  const normalizedSeriesId = String(seriesId ?? "").trim();
  if (!normalizedSeriesId) {
    return [];
  }

  const partLimit =
    typeof beforePartNumber === "number" && Number.isFinite(beforePartNumber) ? beforePartNumber : null;

  const rows = partLimit
    ? getDb()
        .prepare(
          `SELECT part_number, conversation_json
           FROM dialogues
           WHERE kind = 'series' AND series_id = ? AND part_number IS NOT NULL AND part_number < ?
           ORDER BY part_number ASC`,
        )
        .all(normalizedSeriesId, partLimit)
    : getDb()
        .prepare(
          `SELECT part_number, conversation_json
           FROM dialogues
           WHERE kind = 'series' AND series_id = ? AND part_number IS NOT NULL
           ORDER BY part_number ASC`,
        )
        .all(normalizedSeriesId);

  const messages = [];
  for (const row of rows) {
    try {
      const conversation = JSON.parse(row.conversation_json);
      if (Array.isArray(conversation?.messages)) {
        messages.push(...conversation.messages);
      }
    } catch {
      /* skip damaged rows */
    }
  }
  return messages;
};

export const getDialogueBySeriesPart = (seriesId, partNumber) => {
  const normalizedSeriesId = String(seriesId ?? "").trim();
  const part = Number(partNumber);
  if (!normalizedSeriesId || !Number.isFinite(part) || part <= 0) {
    return null;
  }

  const row = getDb()
    .prepare(
      `SELECT ${DIALOGUE_LIST_COLUMNS}
       FROM dialogues
       WHERE kind = 'series' AND series_id = ? AND part_number = ?
       LIMIT 1`,
    )
    .get(normalizedSeriesId, Math.trunc(part));

  if (!row) {
    return null;
  }

  return getDialogue(row.id);
};

export const getDialogue = (id) => {
  const row = getDb()
    .prepare(`SELECT ${DIALOGUE_LIST_COLUMNS} FROM dialogues WHERE id = ?`)
    .get(id);
  if (!row) {
    return null;
  }
  let conversation;
  try {
    conversation = JSON.parse(row.conversation_json);
  } catch {
    throw new Error("Повреждённые данные диалога в базе");
  }
  return {
    ...rowToListItem(row),
    conversation,
    conversationJson: row.conversation_json,
  };
};

const normalizeKind = (kind) => {
  if (kind === "series") {
    return "series";
  }
  if (kind === "video") {
    return "video";
  }
  return "shorts";
};

const normalizeSeriesId = (seriesId, kind) => {
  if (kind !== "series") {
    return "";
  }
  return String(seriesId ?? "").trim();
};

const normalizePartNumber = (partNumber, kind) => {
  if (kind !== "series") {
    return null;
  }
  if (partNumber === null || partNumber === undefined || partNumber === "") {
    return null;
  }
  const value = Number(partNumber);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
};

export const createDialogue = ({
  title,
  titleDisplay = "",
  conversation,
  wallpaper = "default",
  music = "",
  dialoguePrompt = "",
  kind = "shorts",
  seriesId = "",
  partNumber = null,
}) => {
  const id = crypto.randomUUID();
  const now = Date.now();
  const resolvedKind = normalizeKind(kind);
  const resolvedSeriesId = normalizeSeriesId(seriesId, resolvedKind);
  const resolvedPartNumber = normalizePartNumber(partNumber, resolvedKind);
  const resolvedTitle = (title ?? "").trim() || defaultTitle(conversation);
  const resolvedTitleDisplay = String(titleDisplay ?? "").trim();
  const contactName = conversation?.contactName?.trim() ?? "";
  const json = JSON.stringify(conversation);

  getDb()
    .prepare(
      `INSERT INTO dialogues (
         id, title, title_display, contact_name, wallpaper, music, output_file, dialogue_prompt,
         kind, series_id, part_number, conversation_json, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      resolvedTitle,
      resolvedTitleDisplay,
      contactName,
      wallpaper,
      music,
      String(dialoguePrompt ?? ""),
      resolvedKind,
      resolvedSeriesId,
      resolvedPartNumber,
      json,
      now,
      now,
    );

  return getDialogue(id);
};

export const updateDialogue = (
  id,
  {title, titleDisplay, conversation, wallpaper, music, outputFile, dialoguePrompt, kind, seriesId, partNumber},
) => {
  const existing = getDialogue(id);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  const resolvedKind = kind !== undefined ? normalizeKind(kind) : existing.kind;
  const resolvedSeriesId =
    seriesId !== undefined ? normalizeSeriesId(seriesId, resolvedKind) : existing.seriesId ?? "";
  const resolvedPartNumber =
    partNumber !== undefined ? normalizePartNumber(partNumber, resolvedKind) : existing.partNumber;
  const resolvedTitle =
    title !== undefined ? String(title).trim() || defaultTitle(conversation ?? existing.conversation) : existing.title;
  const resolvedTitleDisplay =
    titleDisplay !== undefined ? String(titleDisplay).trim() : (existing.titleDisplay ?? "");
  const contactName =
    conversation?.contactName?.trim() ?? existing.contactName ?? "";
  const json = conversation ? JSON.stringify(conversation) : existing.conversationJson;
  const wp = wallpaper ?? existing.wallpaper;
  const mus = music ?? existing.music;
  const out = outputFile !== undefined ? outputFile : existing.outputFile;
  const prompt =
    dialoguePrompt !== undefined ? String(dialoguePrompt) : (existing.dialoguePrompt ?? "");

  getDb()
    .prepare(
      `UPDATE dialogues SET title = ?, title_display = ?, contact_name = ?, wallpaper = ?, music = ?, output_file = ?,
       dialogue_prompt = ?, kind = ?, series_id = ?, part_number = ?,
       conversation_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      resolvedTitle,
      resolvedTitleDisplay,
      contactName,
      wp,
      mus,
      out,
      prompt,
      resolvedKind,
      resolvedSeriesId,
      resolvedPartNumber,
      json,
      now,
      id,
    );

  return getDialogue(id);
};

export const deleteDialogue = (id) => {
  const result = getDb().prepare("DELETE FROM dialogues WHERE id = ?").run(id);
  return result.changes > 0;
};

export const touchDialogueOutput = (id, outputFile) => {
  const now = Date.now();
  getDb()
    .prepare("UPDATE dialogues SET output_file = ?, updated_at = ? WHERE id = ?")
    .run(outputFile, now, id);
  return getDialogue(id);
};
