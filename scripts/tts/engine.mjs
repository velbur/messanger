import {spawn} from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {pipeline, env} from "@xenova/transformers";
import {textForSpeech} from "./text-for-speech.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TTS_DIR = path.join(ROOT, "scripts/tts");
const CACHE_DIR = path.join(ROOT, ".cache/huggingface");
const MMS_MODEL = "Xenova/mms-tts-rus";

env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;

let sileroAvailabilityPromise = null;
let mmsSynthesizerPromise = null;

const runPythonJson = (scriptName, stdinPayload) =>
  new Promise((resolve, reject) => {
    const child = spawn("python3", [path.join(TTS_DIR, scriptName)], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const line = stdout
        .trim()
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .at(-1);
      if (!line) {
        reject(new Error(stderr.trim() || `python ${scriptName} exited ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(line);
        if (!parsed.ok) {
          reject(new Error(parsed.error ?? `python ${scriptName} failed`));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error(stderr.trim() || String(error)));
      }
    });
    child.stdin.write(JSON.stringify(stdinPayload));
    child.stdin.end();
  });

export const checkSileroAvailability = async () => {
  if (!sileroAvailabilityPromise) {
    sileroAvailabilityPromise = runPythonJson("check_silero.py", {})
      .then(() => ({ok: true, provider: "silero"}))
      .catch((error) => ({
        ok: false,
        provider: "silero",
        error: error instanceof Error ? error.message : String(error),
      }));
  }
  return sileroAvailabilityPromise;
};

const getMmsSynthesizer = () => {
  if (!mmsSynthesizerPromise) {
    mmsSynthesizerPromise = pipeline("text-to-speech", MMS_MODEL);
  }
  return mmsSynthesizerPromise;
};

const writePcmWav = async (outputPath, samples, sampleRate) => {
  const float32 =
    samples instanceof Float32Array
      ? samples
      : Float32Array.from(samples, (value) => Number(value));
  const pcm = Buffer.alloc(float32.length * 2);
  for (let i = 0; i < float32.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, Buffer.concat([header, pcm]));
};

const synthesizeWithSilero = async ({text, speaker, outputPath, sampleRate = 48000}) => {
  await runPythonJson("silero_generate.py", {
    text,
    speaker,
    outputPath,
    sampleRate,
  });
  return {provider: "silero", speaker, sampleRate};
};

const synthesizeWithMms = async ({text, outputPath}) => {
  const synthesizer = await getMmsSynthesizer();
  const result = await synthesizer(text);
  const audio = result?.audio;
  if (!audio) {
    throw new Error("MMS-TTS не вернул audio");
  }
  const sampleRate = Number(result.sampling_rate ?? audio.sample_rate ?? 16_000);
  const samples = audio.data ?? audio;
  await writePcmWav(outputPath, samples, sampleRate);
  return {provider: "mms", speaker: "mms-rus", sampleRate};
};

/**
 * @param {{
 *   text: string,
 *   speaker: string,
 *   outputPath: string,
 *   preferredProvider?: 'silero' | 'mms' | 'auto',
 * }} opts
 */
export const synthesizeSpeech = async ({
  text,
  speaker,
  outputPath,
  preferredProvider = "auto",
}) => {
  const spoken = textForSpeech(text);
  if (!spoken) {
    throw new Error("Пустой текст для озвучки");
  }

  await fs.mkdir(path.dirname(outputPath), {recursive: true});

  const silero = await checkSileroAvailability();
  const trySilero = preferredProvider !== "mms" && silero.ok;
  if (trySilero) {
    return synthesizeWithSilero({text: spoken, speaker, outputPath});
  }

  if (preferredProvider === "silero") {
    throw new Error(
      silero.error
        ? `Silero недоступен: ${silero.error}. Установите: pip3 install -r scripts/tts/requirements.txt`
        : "Silero недоступен",
    );
  }

  return synthesizeWithMms({text: spoken, outputPath});
};

export const getVoiceoverEngineStatus = async () => {
  const silero = await checkSileroAvailability();
  return {
    silero,
    mms: {ok: true, provider: "mms", model: MMS_MODEL},
    recommended: silero.ok ? "silero" : "mms",
    installHint: silero.ok
      ? null
      : "Для актёрского качества: pip3 install -r scripts/tts/requirements.txt",
  };
};
