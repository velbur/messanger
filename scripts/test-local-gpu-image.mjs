#!/usr/bin/env node
/**
 * Smoke-тест local-gpu T2I: health + опциональная генерация одного кадра.
 *
 *   LOCAL_GPU_VIDEO_URL=http://<server>:8008 node scripts/test-local-gpu-image.mjs
 *   LOCAL_GPU_VIDEO_URL=http://127.0.0.1:8008 node scripts/test-local-gpu-image.mjs --prompt "A cozy attic at night"
 */
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  generateTextToImageFileLocalGpu,
  getLocalGpuImageUrl,
  probeLocalGpuImageHealth,
} from "./local-gpu-image.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const parseArgs = () => {
  const args = process.argv.slice(2);
  let prompt = "Vertical illustration, cozy attic at night, warm lamp light, cinematic, no text";
  let output = path.join(ROOT, "out", "local-gpu-t2i-test.png");
  let steps = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--prompt" && args[i + 1]) {
      prompt = args[i + 1];
      i += 1;
    } else if (args[i] === "--output" && args[i + 1]) {
      output = path.resolve(args[i + 1]);
      i += 1;
    } else if (args[i] === "--steps" && args[i + 1]) {
      steps = Number(args[i + 1]);
      i += 1;
    } else if (args[i] === "--health-only") {
      return {healthOnly: true};
    }
  }
  return {prompt, output, steps, healthOnly: false};
};

const main = async () => {
  const {prompt, output, steps, healthOnly} = parseArgs();
  const url = getLocalGpuImageUrl();
  if (!url) {
    console.error(
      "Задайте LOCAL_GPU_VIDEO_URL в docs/.env или: LOCAL_GPU_VIDEO_URL=http://<server>:8008 npm run test:local-gpu-image",
    );
    process.exit(1);
  }

  console.log(`GPU service: ${url}`);
  const health = await probeLocalGpuImageHealth();
  console.log("Health:", health);
  if (!health.ok) {
    process.exit(1);
  }
  if (healthOnly) {
    console.log("OK: health check passed");
    return;
  }

  console.log(`Generating T2I → ${output}`);
  const result = await generateTextToImageFileLocalGpu({
    prompt,
    outputPath: output,
    steps,
    onPoll: ({status, attempt, maxAttempts}) => {
      console.log(`  poll ${attempt}/${maxAttempts ?? "?"}: ${status}`);
    },
  });
  console.log("Result:", {
    outputPath: result.outputPath,
    bytes: result.bytes,
    model: result.model,
    imageSize: result.imageSize,
    inferenceSec: result.inferenceSec,
    jobId: result.jobId,
  });
  console.log("OK: local-gpu T2I test passed");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
