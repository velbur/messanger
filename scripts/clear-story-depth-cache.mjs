import {glob} from "node:fs/promises";
import {rm} from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_IMAGES = path.join(ROOT, "public/images");
const PARALLAX_RAW = path.join(ROOT, ".cache/parallax-raw");

await rm(PARALLAX_RAW, {recursive: true, force: true});

let removed = 0;
for (const pattern of [
  "**/*.depth.png",
  "**/*.depth-meta.json",
  "**/*.parallax.mp4",
  "**/*.video-hold.depth.png",
  "**/*.video-hold.depth-meta.json",
  "**/*.video-hold.parallax.mp4",
  "**/*.layer-far.png",
  "**/*.layer-mid.png",
  "**/*.layer-near.png",
]) {
  for await (const abs of glob(pattern, {cwd: PUBLIC_IMAGES})) {
    await rm(path.join(PUBLIC_IMAGES, abs), {force: true});
    removed += 1;
  }
}

console.log(
  `Depth-кэш очищен: удалено ${removed} файлов (включая .video-hold.parallax), .cache/parallax-raw`,
);
