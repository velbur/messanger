import path from "node:path";
import {mkdir} from "node:fs/promises";
import {DatabaseSync} from "node:sqlite";

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
      conversation_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dialogues_updated ON dialogues(updated_at DESC);
  `);
};

const rowToListItem = (row) => ({
  id: row.id,
  title: row.title,
  contactName: row.contact_name ?? "",
  wallpaper: row.wallpaper,
  music: row.music,
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

export const listDialogues = () => {
  const rows = getDb()
    .prepare(
      `SELECT id, title, contact_name, wallpaper, music, output_file, conversation_json, created_at, updated_at
       FROM dialogues ORDER BY updated_at DESC`,
    )
    .all();
  return rows.map(rowToListItem);
};

export const getDialogue = (id) => {
  const row = getDb()
    .prepare(
      `SELECT id, title, contact_name, wallpaper, music, output_file, conversation_json, created_at, updated_at
       FROM dialogues WHERE id = ?`,
    )
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

export const createDialogue = ({
  title,
  conversation,
  wallpaper = "default",
  music = "",
}) => {
  const id = crypto.randomUUID();
  const now = Date.now();
  const resolvedTitle = (title ?? "").trim() || defaultTitle(conversation);
  const contactName = conversation?.contactName?.trim() ?? "";
  const json = JSON.stringify(conversation);

  getDb()
    .prepare(
      `INSERT INTO dialogues (id, title, contact_name, wallpaper, music, output_file, conversation_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .run(id, resolvedTitle, contactName, wallpaper, music, json, now, now);

  return getDialogue(id);
};

export const updateDialogue = (
  id,
  {title, conversation, wallpaper, music, outputFile},
) => {
  const existing = getDialogue(id);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  const resolvedTitle =
    title !== undefined ? String(title).trim() || defaultTitle(conversation ?? existing.conversation) : existing.title;
  const contactName =
    conversation?.contactName?.trim() ?? existing.contactName ?? "";
  const json = conversation ? JSON.stringify(conversation) : existing.conversationJson;
  const wp = wallpaper ?? existing.wallpaper;
  const mus = music ?? existing.music;
  const out = outputFile !== undefined ? outputFile : existing.outputFile;

  getDb()
    .prepare(
      `UPDATE dialogues SET title = ?, contact_name = ?, wallpaper = ?, music = ?, output_file = ?,
       conversation_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(resolvedTitle, contactName, wp, mus, out, json, now, id);

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
