#!/usr/bin/env node
/**
 * Smoke-тест local-gpu I2V: health + опциональная генерация одного клипа.
 *
 *   LOCAL_GPU_VIDEO_URL=http://<server>:8008 node scripts/test-local-gpu-video.mjs
 *   LOCAL_GPU_VIDEO_URL=http://127.0.0.1:8008 node scripts/test-local-gpu-video.mjs --image public/images/foo.png
 *   ... --resolution 720p --steps 15   # быстрый smoke-тест
 */
import {access, readFile} from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";
import {
  ensureLocalGpuVideoEnv,
  generateImageToVideoFileLocalGpu,
  getLocalGpuVideoUrl,
  probeLocalGpuVideoHealth,
} from "./local-gpu-video.mjs";
import {buildStoryMotionPrompt, describeMotionPromptMode} from "./story-motion-prompt.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const parseArgs = () => {
  const args = process.argv.slice(2);
  let image = null;
  let output = path.join(ROOT, "out", "local-gpu-test.mp4");
  let resolution = "1080p";
  let steps = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--image" && args[i + 1]) {
      image = path.resolve(ROOT, args[i + 1]);
      i += 1;
    } else if (args[i] === "--output" && args[i + 1]) {
      output = path.resolve(ROOT, args[i + 1]);
      i += 1;
    } else if (args[i] === "--resolution" && args[i + 1]) {
      resolution = args[i + 1];
      i += 1;
    } else if (args[i] === "--steps" && args[i + 1]) {
      steps = Number(args[i + 1]);
      i += 1;
    }
  }
  return {image, output, resolution, steps};
};

/** storyImagePrompt из json/<slug>.json по пути public/images/<slug>/story-msg-N.png */
const resolveStoryImagePrompt = async (imageAbsolutePath) => {
  const imagesRoot = path.join(ROOT, "public", "images");
  const rel = path.relative(imagesRoot, imageAbsolutePath);
  if (rel.startsWith("..") || !rel.includes(path.sep)) {
    return null;
  }
  const slug = rel.split(path.sep)[0];
  const imageRef = `images/${rel.split(path.sep).join("/")}`;
  const jsonPath = path.join(ROOT, "json", `${slug}.json`);
  try {
    const conversation = JSON.parse(await readFile(jsonPath, "utf8"));
    for (const message of conversation.messages ?? []) {
      if (message.storyImage === imageRef) {
        return message.storyImagePrompt?.trim() || null;
      }
    }
    const opening = conversation.story?.opening;
    if (opening?.image === imageRef) {
      return opening.imagePrompt?.trim() || null;
    }
  } catch {
    return null;
  }
  return null;
};

const runFfprobe = (filePath) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,width,height,duration",
        "-of",
        "json",
        filePath,
      ],
      {stdio: ["ignore", "pipe", "pipe"]},
    );
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exit ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });

const main = async () => {
  await ensureLocalGpuVideoEnv();
  const url = getLocalGpuVideoUrl();
  if (!url) {
    console.error(
      "Задайте LOCAL_GPU_VIDEO_URL в docs/.env или: LOCAL_GPU_VIDEO_URL=http://<server>:8008 npm run test:local-gpu-video",
    );
    process.exit(1);
  }

  console.log(`GPU service: ${url}`);
  const health = await probeLocalGpuVideoHealth();
  console.log("Health:", JSON.stringify(health, null, 2));
  if (!health.ok) {
    process.exit(1);
  }

  const {image, output, resolution, steps} = parseArgs();
  if (!image) {
    console.log("Health OK. Для генерации добавьте --image public/images/<frame>.png");
    console.log("Быстрый тест: --resolution 720p --steps 15");
    return;
  }

  const expectWidth = resolution.toLowerCase().includes("720") ? 720 : 1080;
  const expectHeight = resolution.toLowerCase().includes("720") ? 1280 : 1920;

  await access(image);
  const storyImagePrompt = await resolveStoryImagePrompt(image);
  const motionMode = describeMotionPromptMode(storyImagePrompt);
  const prompt = buildStoryMotionPrompt(storyImagePrompt);
  console.log(
    `Генерация: ${image} → ${output} (${resolution}${steps ? `, ${steps} steps` : ""}, motion: ${motionMode})`,
  );
  if (storyImagePrompt) {
    console.log(`  storyImagePrompt: ${storyImagePrompt.slice(0, 120)}…`);
  }
  const result = await generateImageToVideoFileLocalGpu({
    imageAbsolutePath: image,
    prompt,
    outputPath: output,
    duration: 4,
    resolution,
    aspectRatio: "9:16",
    steps,
    onPoll: ({status}) => console.log(`  status: ${status}`),
  });
  console.log("Result:", result);

  const durationMs = await probeVideoDurationMs(output);
  const probe = await runFfprobe(output);
  const stream = probe?.streams?.[0] ?? {};
  console.log("ffprobe:", {
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    durationSec: stream.duration,
    durationMs,
  });

  if (stream.width !== expectWidth || stream.height !== expectHeight) {
    console.error(`Ожидалось ${expectWidth}x${expectHeight}, получено ${stream.width}x${stream.height}`);
    process.exit(1);
  }
  if (durationMs < 3000 || durationMs > 6000) {
    console.error(`Ожидалось ~4 с, получено ${(durationMs / 1000).toFixed(1)} с`);
    process.exit(1);
  }
  console.log("OK: local-gpu I2V test passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
