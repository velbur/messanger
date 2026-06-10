import {readFile} from "node:fs/promises";
import path from "node:path";
import {parseConversation} from "../src/chat/schema.ts";
import {
  initDialogueDb,
  getDialogueBySeriesPart,
  createDialogue,
  updateDialogue,
} from "./dialogue-db.mjs";
import {seriesContentDir} from "./project-paths.mjs";

const USSSR_PARTS = {
  1: {
    title: "poka_v_sssr_part1",
    intro: "Часть 1: Гастроном",
    dialoguePrompt: "",
  },
  2: {
    title: "poka_v_sssr_part2",
    intro: "Часть 2: Где ночевать?",
    dialoguePrompt:
      "Часть 2: Даня доел ужин, нужно решить где ночевать. Алиса ищет варианты через расписание автобусов и билет в Красный Лог.",
  },
};

const SERIES_DEFAULTS = {
  usssr: {
    wallpaper: "dark",
    music: "kremlin.mp3",
    endCardText: "Продолжение следует...",
    parts: USSSR_PARTS,
  },
};

const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const applyPublishDefaults = (conversation, {intro, endCardText, wallpaper}) => ({
  ...conversation,
  wallpaper: conversation.wallpaper ?? wallpaper,
  intro: conversation.intro ?? {
    enabled: true,
    text: intro,
    durationMs: 5000,
  },
  endCard: conversation.endCard ?? {
    enabled: true,
    text: endCardText,
    durationMs: 5000,
  },
  music: conversation.music ?? {
    enabled: true,
    src: "music/kremlin.mp3",
  },
});

export const importSeriesPart = async ({seriesId = "usssr", partNumber, force = false} = {}) => {
  const part = Number(partNumber);
  if (!Number.isFinite(part) || part <= 0) {
    throw new Error("partNumber должен быть положительным числом");
  }

  const seriesDefaults = SERIES_DEFAULTS[seriesId];
  if (!seriesDefaults) {
    throw new Error(`Неизвестная серия: ${seriesId}`);
  }

  const partMeta = seriesDefaults.parts[part];
  if (!partMeta) {
    throw new Error(`Нет метаданных для ${seriesId}, часть ${part}`);
  }

  const conversationPath = path.join(seriesContentDir(seriesId), `part-${part}`, "conversation.json");
  const raw = await readJsonFile(conversationPath);
  const withPublish = applyPublishDefaults(raw, {
    intro: partMeta.intro,
    endCardText: seriesDefaults.endCardText,
    wallpaper: seriesDefaults.wallpaper,
  });
  const conversation = parseConversation(withPublish);

  const existing = getDialogueBySeriesPart(seriesId, part);
  if (existing && !force) {
    return {action: "skipped", dialogue: existing};
  }

  if (existing) {
    const dialogue = updateDialogue(existing.id, {
      title: partMeta.title,
      conversation,
      wallpaper: seriesDefaults.wallpaper,
      music: seriesDefaults.music,
      dialoguePrompt: partMeta.dialoguePrompt,
      kind: "series",
      seriesId,
      partNumber: part,
    });
    return {action: "updated", dialogue};
  }

  const dialogue = createDialogue({
    title: partMeta.title,
    conversation,
    wallpaper: seriesDefaults.wallpaper,
    music: seriesDefaults.music,
    dialoguePrompt: partMeta.dialoguePrompt,
    kind: "series",
    seriesId,
    partNumber: part,
  });
  return {action: "created", dialogue};
};

const printUsage = () => {
  console.log(`Импорт части серии из series/<series>/part-N/conversation.json в dialogues.db

Использование:
  node scripts/series-import.mjs --series usssr --part 2
  node scripts/series-import.mjs --series usssr --part 2 --force

Опции:
  --series <id>   ID серии (по умолчанию: usssr)
  --part <n>      Номер части (обязательно)
  --force         Перезаписать, если часть уже есть в базе
  -h, --help      Справка
`);
};

const parseArgs = (argv) => {
  const args = {seriesId: "usssr", partNumber: null, force: false, help: false};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--series":
        args.seriesId = argv[++i];
        break;
      case "--part":
        args.partNumber = Number(argv[++i]);
        break;
      case "--force":
        args.force = true;
        break;
      default:
        break;
    }
  }
  return args;
};

export const runSeriesImportCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return;
  }
  if (!args.partNumber) {
    printUsage();
    throw new Error("Укажите --part");
  }

  await initDialogueDb();
  const result = await importSeriesPart({
    seriesId: args.seriesId,
    partNumber: args.partNumber,
    force: args.force,
  });

  const {dialogue, action} = result;
  console.log(
    `${action === "created" ? "Добавлено" : action === "updated" ? "Обновлено" : "Уже есть"}: ${dialogue.title} (${dialogue.seriesId}, часть ${dialogue.partNumber})`,
  );
  return result;
};

const isMain = import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) {
  runSeriesImportCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
