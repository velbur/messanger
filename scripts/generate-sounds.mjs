#!/usr/bin/env node
/**
 * Генерация SFX для переписки (ffmpeg).
 * Запуск: node scripts/generate-sounds.mjs
 */
import {execSync} from "node:child_process";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "sounds");

mkdirSync(outDir, {recursive: true});

const ffmpeg = (args) => {
  execSync(`ffmpeg -y ${args}`, {stdio: "inherit"});
};

// Входящее: два мягких тона (уведомление)
ffmpeg(
  `-f lavfi -i sine=frequency=587:duration=0.055 ` +
    `-f lavfi -i sine=frequency=784:duration=0.09 ` +
    `-filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,afade=t=in:st=0:d=0.006,afade=t=out:st=0.12:d=0.05,volume=0.42" ` +
    `-ar 48000 -ac 1 "${path.join(outDir, "incoming.wav")}"`,
);

// Исходящее: один короткий «щелчок» отправки
ffmpeg(
  `-f lavfi -i sine=frequency=988:duration=0.095 ` +
    `-af "afade=t=in:st=0:d=0.004,afade=t=out:st=0.035:d=0.06,volume=0.36" ` +
    `-ar 48000 -ac 1 "${path.join(outDir, "outgoing.wav")}"`,
);

// Набор: тихий клик клавиши
ffmpeg(
  `-f lavfi -i "anoisesrc=duration=0.028:color=white:sample_rate=48000:amplitude=0.12" ` +
    `-af "highpass=f=1800,lowpass=f=5500,afade=t=in:st=0:d=0.003,afade=t=out:st=0.012:d=0.016,volume=0.55" ` +
    `-ar 48000 -ac 1 "${path.join(outDir, "typing.wav")}"`,
);

console.log("Sounds written to public/sounds/");
