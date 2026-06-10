import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseConversation} from "../src/chat/schema.ts";

const MIGRATIONS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USSR_SERIES_ID = "usssr";

const addColumnIfMissing = (db, table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((col) => col.name === column)) {
    return false;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
};

const inferUsssrSeriesMeta = (row) => {
  const title = String(row.title ?? "").toLowerCase();
  const output = String(row.output_file ?? "").toLowerCase();
  const sources = [title, output];

  for (const source of sources) {
    let match = source.match(/poka_v_sssr_part(\d+)/);
    if (match) {
      return {seriesId: USSR_SERIES_ID, partNumber: Number(match[1])};
    }
    match = source.match(/usssr[^a-z0-9]*part[^0-9]*(\d+)/);
    if (match) {
      return {seriesId: USSR_SERIES_ID, partNumber: Number(match[1])};
    }
    match = source.match(/sssr[^a-z0-9]*part[^0-9]*(\d+)/);
    if (match) {
      return {seriesId: USSR_SERIES_ID, partNumber: Number(match[1])};
    }
  }

  if (!title.includes("sssr") && !title.includes("usssr") && !title.includes("poka")) {
    return null;
  }

  try {
    const conversation = JSON.parse(row.conversation_json);
    const introText = String(conversation?.intro?.text ?? conversation?.intro ?? "");
    const match = introText.match(/[Чч]асть\s*(\d+)/);
    if (match) {
      return {seriesId: USSR_SERIES_ID, partNumber: Number(match[1])};
    }
  } catch {
    /* ignore invalid json */
  }

  return null;
};

export const MIGRATIONS = [
  {
    id: "001_dialogue_prompt",
    up(db) {
      addColumnIfMissing(db, "dialogues", "dialogue_prompt", "TEXT NOT NULL DEFAULT ''");
    },
  },
  {
    id: "002_series_fields",
    up(db) {
      addColumnIfMissing(db, "dialogues", "kind", "TEXT NOT NULL DEFAULT 'shorts'");
      addColumnIfMissing(db, "dialogues", "series_id", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "dialogues", "part_number", "INTEGER");
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_dialogues_series
          ON dialogues(kind, series_id, part_number);
      `);
    },
  },
  {
    id: "003_backfill_usssr_series",
    up(db) {
      const rows = db
        .prepare(
          `SELECT id, title, output_file, kind, series_id, part_number, conversation_json
           FROM dialogues`,
        )
        .all();

      const update = db.prepare(
        `UPDATE dialogues
         SET kind = 'series', series_id = ?, part_number = ?
         WHERE id = ?`,
      );

      let updated = 0;
      for (const row of rows) {
        if (row.kind === "series" && row.series_id && row.part_number) {
          continue;
        }

        const meta = inferUsssrSeriesMeta(row);
        if (!meta) {
          continue;
        }

        update.run(meta.seriesId, meta.partNumber, row.id);
        updated += 1;
      }

      if (updated > 0) {
        console.log(`[migrate 003] Помечено как серия usssr: ${updated} диалог(ов)`);
      }
    },
  },
  {
    id: "004_import_usssr_part2",
    async up(db) {
      const existing = db
        .prepare(
          `SELECT id FROM dialogues
           WHERE kind = 'series' AND series_id = ? AND part_number = 2
           LIMIT 1`,
        )
        .get(USSR_SERIES_ID);

      if (existing) {
        return;
      }

      const conversationPath = path.join(
        MIGRATIONS_ROOT,
        "series",
        "usssr",
        "part-2",
        "conversation.json",
      );
      const raw = JSON.parse(await readFile(conversationPath, "utf8"));
      const conversation = parseConversation({
        ...raw,
        wallpaper: raw.wallpaper ?? "dark",
        intro: raw.intro ?? {
          enabled: true,
          text: "Часть 2: Где ночевать?",
          durationMs: 5000,
        },
        endCard: raw.endCard ?? {
          enabled: true,
          text: "Продолжение следует...",
          durationMs: 5000,
        },
        music: raw.music ?? {
          enabled: true,
          src: "music/kremlin.mp3",
        },
      });

      const now = Date.now();
      const id = crypto.randomUUID();
      const title = "poka_v_sssr_part2";
      const contactName = conversation.contactName?.trim() ?? "";
      const json = JSON.stringify(conversation);
      const dialoguePrompt =
        "Часть 2: Даня доел ужин, нужно решить где ночевать. Алиса ищет варианты через расписание автобусов и билет в Красный Лог.";

      db.prepare(
        `INSERT INTO dialogues (
           id, title, contact_name, wallpaper, music, output_file, dialogue_prompt,
           kind, series_id, part_number, conversation_json, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'series', ?, 2, ?, ?, ?)`,
      ).run(
        id,
        title,
        contactName,
        "dark",
        "kremlin.mp3",
        dialoguePrompt,
        USSR_SERIES_ID,
        json,
        now,
        now,
      );

      console.log("[migrate 004] Импортирована usssr, часть 2");
    },
  },
  {
    id: "005_title_display",
    up(db) {
      addColumnIfMissing(db, "dialogues", "title_display", "TEXT NOT NULL DEFAULT ''");
    },
  },
];

export const runDialogueMigrations = async (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id),
  );

  const insert = db.prepare(
    "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) {
      continue;
    }
    await migration.up(db);
    insert.run(migration.id, Date.now());
    console.log(`[migrate] ${migration.id}`);
  }
};
