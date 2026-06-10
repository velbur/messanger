#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {loadOpenRouterEnv} from "./openrouter-client.mjs";
import {generateDialogue} from "./dialogue-gen.mjs";
import {resolveSeriesPath, SERIES_DIR} from "./project-paths.mjs";

function printUsage() {
  console.log(`Генерация conversation.json через OpenRouter

Использование:
  node scripts/generate-dialogue.mjs --brief "Часть 3: ..." [--out path] [--context path.json]

Опции:
  -b, --brief <text>     Промпт диалога (обязательно)
  -o, --out <path>       Выходной JSON (по умолчанию: series/usssr/part-3/conversation.json)
  -c, --context <path>   Предыдущий conversation.json для контекста
      --text-only        Только текст, без imagePrompt
      --series           Режим серии (контекст из --context)
  -h, --help             Справка
`);
}

function parseArgs(argv) {
  const args = {
    brief: null,
    out: null,
    context: null,
    textOnly: false,
    series: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-b":
      case "--brief":
        args.brief = argv[++i];
        break;
      case "-o":
      case "--out":
        args.out = argv[++i];
        break;
      case "-c":
      case "--context":
        args.context = argv[++i];
        break;
      case "--text-only":
        args.textOnly = true;
        break;
      case "--series":
        args.series = true;
        break;
      default:
        throw new Error(`Неизвестный аргумент: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  await loadOpenRouterEnv();

  if (!args.brief?.trim()) {
    printUsage();
    throw new Error("Нужен --brief");
  }

  let previousMessages;
  if (args.context) {
    const contextPath = resolveSeriesPath(args.context);
    const raw = await fs.readFile(contextPath, "utf8");
    const parsed = JSON.parse(raw);
    previousMessages = parsed.messages;
  }

  const {conversation, model, attempts} = await generateDialogue({
    prompt: args.brief,
    previousMessages,
    includeImages: !args.textOnly,
    mode: args.series || args.context ? "series" : "shorts",
  });

  const outputPath = args.out
    ? resolveSeriesPath(args.out)
    : path.join(SERIES_DIR, "usssr/part-3/conversation.json");

  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, `${JSON.stringify(conversation, null, 2)}\n`, "utf8");

  console.log(`Model: ${model}`);
  console.log(`Attempts: ${attempts}`);
  console.log(`Messages: ${conversation.messages.length}`);
  console.log(`Saved: ${outputPath}`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
