#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {generateImageToFile, getOpenRouterConfig, loadOpenRouterEnv} from "./openrouter-client.mjs";
import {generateAndSaveConversationImages} from "./conversation-images.mjs";
import {resolveSeriesPath} from "./project-paths.mjs";

function printUsage() {
  console.log(`Генерация изображений через OpenRouter (GPT Image 2)

Использование:
  node scripts/generate-image.mjs --prompt "описание" [--output out/image]
  node scripts/generate-image.mjs --file prompts/scene.txt [--output out/scene]
  node scripts/generate-image.mjs --from-json usssr/part-1/conversation.json

Опции:
  -p, --prompt <text>       Текстовый промпт
  -f, --file <path>         Промпт из файла
      --from-json <path>    Сгенерировать все imagePrompt из conversation.json
  -o, --output <path>       Путь к файлу без расширения или с расширением
      --model <id>            Модель OpenRouter (по умолчанию из .env)
      --aspect-ratio <ratio>  Например 4:3, 16:9, 1:1
      --size <size>           1K, 2K или 4K
  -h, --help                Показать справку
`);
}

function parseArgs(argv) {
  const args = {
    prompt: null,
    file: null,
    fromJson: null,
    output: null,
    model: null,
    aspectRatio: null,
    imageSize: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-p":
      case "--prompt":
        args.prompt = argv[++i];
        break;
      case "-f":
      case "--file":
        args.file = argv[++i];
        break;
      case "--from-json":
        args.fromJson = argv[++i];
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--aspect-ratio":
        args.aspectRatio = argv[++i];
        break;
      case "--size":
        args.imageSize = argv[++i];
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
  const config = getOpenRouterConfig();
  if (!config) {
    throw new Error("Задайте OPENROUTER_API_KEY в .env");
  }

  console.log(`Model: ${args.model || config.imageModel}`);
  console.log(`Aspect: ${args.aspectRatio || config.aspectRatio}`);
  console.log(`Size: ${args.imageSize || config.imageSize}`);

  if (args.fromJson) {
    const conversationPath = resolveSeriesPath(args.fromJson);
    const {logs} = await generateAndSaveConversationImages(conversationPath, {
      provider: "openrouter",
    });

    for (const line of logs) {
      console.log(line);
    }
    console.log(`Done: ${logs.length} image(s) -> public/images + ${conversationPath}`);
    return;
  }

  let prompt = args.prompt;
  if (args.file) {
    const filePath = resolveSeriesPath(args.file);
    prompt = (await fs.readFile(filePath, "utf8")).trim();
  }

  if (!prompt) {
    printUsage();
    throw new Error("Нужен --prompt, --file или --from-json");
  }

  const outputPath = resolveSeriesPath(args.output || path.join("generated-images", "image-01"));
  const result = await generateImageToFile({
    prompt,
    outputPath,
    model: args.model,
    aspectRatio: args.aspectRatio,
    imageSize: args.imageSize,
  });

  console.log(`Saved: ${result.path}`);
  if (result.text) {
    console.log(`Model note: ${result.text}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
