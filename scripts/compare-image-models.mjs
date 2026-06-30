#!/usr/bin/env node
/**
 * A/B сравнение image-моделей на одном story-промпте (9:16).
 *
 *   npm run compare:images
 *   npm run compare:images -- --models google/gemini-2.5-flash-image,openai/gpt-5-image-mini
 */
import path from "node:path";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {buildStoryImageGenerationPrompt} from "./image-prompt-llm.mjs";
import {generateImageBuffer, getOpenRouterStoryImageModel, getOpenRouterStoryImageSize, loadOpenRouterEnv, isOpenRouterConfigured} from "./openrouter-client.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "out/compare-image-models");

const DEFAULT_MODELS = [
  "google/gemini-2.5-flash-image",
  "openai/gpt-5-image-mini",
  "openai/gpt-5.4-image-2",
];

const SAMPLE_SCENE =
  "Мужчина в шумном спорт-баре смотрит футбол на большом экране, вокруг болельщики, тёплый вечерний свет.";

const slug = (model) => model.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

const parseModels = () => {
  const idx = process.argv.indexOf("--models");
  if (idx === -1) {
    return DEFAULT_MODELS;
  }
  const raw = process.argv[idx + 1] ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const main = async () => {
  await loadOpenRouterEnv();
  if (!isOpenRouterConfigured()) {
    console.error("Нужен OPENROUTER_API_KEY в docs/.env");
    process.exit(1);
  }

  const style = await readFile(path.join(ROOT, "prompts/story-image-style.txt"), "utf8");
  const prompt = buildStoryImageGenerationPrompt({
    imagePrompt: SAMPLE_SCENE,
    stylePrompt: style.trim(),
  });

  await mkdir(OUT_DIR, {recursive: true});
  await writeFile(path.join(OUT_DIR, "prompt.txt"), `${prompt}\n`, "utf8");

  const models = parseModels();
  console.log(`Промпт → ${path.relative(ROOT, path.join(OUT_DIR, "prompt.txt"))}`);
  console.log(`Формат: ${STORY_IMAGE_ASPECT_RATIO}, ${getOpenRouterStoryImageSize()}\n`);

  for (const model of models) {
    const outPath = path.join(OUT_DIR, `${slug(model)}.png`);
    process.stdout.write(`[${model}] … `);
    try {
      const {buffer, model: used} = await generateImageBuffer({
        prompt,
        model,
        aspectRatio: STORY_IMAGE_ASPECT_RATIO,
        imageSize: getOpenRouterStoryImageSize(),
      });
      await writeFile(outPath, buffer);
      console.log(`ok → ${path.relative(ROOT, outPath)} (${used})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`ошибка: ${reason}`);
    }
  }

  console.log(`\nОткрой папку out/compare-image-models/ и сравни визуально + parallax.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
