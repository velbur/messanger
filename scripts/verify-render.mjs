#!/usr/bin/env node
/**
 * Быстрая проверка рендера: кадр с emoji в пузыре + панель ввода.
 * Выход: out/verify-frame.png, out/verify-input-crop.png, out/verify-bubble-crop.png
 */
import {execSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => execSync(cmd, {cwd: root, stdio: "inherit"});

const input = "my-chat.json";
const video = "out/verify-render.mp4";

console.log("→ render");
run(`node scripts/render.mjs --input ${input} --output ${video}`);

console.log("→ extract frames");
run(
  `ffmpeg -y -sseof -1 -i ${video} -frames:v 1 -q:v 2 out/verify-frame.png`,
);
run(
  `ffmpeg -y -i out/verify-frame.png -vf "crop=1080:200:0:1720" out/verify-input-crop.png`,
);
run(
  `ffmpeg -y -i out/verify-frame.png -vf "crop=900:220:40:1180" out/verify-bubble-crop.png`,
);

console.log("Готово. Проверьте визуально:");
console.log("  out/verify-input-crop.png");
console.log("  out/verify-bubble-crop.png");
