import fs from "node:fs/promises";
import path from "node:path";
import {
  createSpeech,
  getOpenRouterTtsModel,
} from "../openrouter-client.mjs";
import {textForSpeech} from "./text-for-speech.mjs";

const RUSSIAN_STYLE_PROMPT =
  "Озвучь по-русски, естественно, с правильными ударениями, как реплика в живой переписке. ВАЖНО: сохраняй один и тот же тембр, пол и возраст голоса выбранного диктора — не превращай голос в другого человека. Меняй только интонацию, темп и лёгкий эмоциональный окрас в рамках того же тембра.";

const CHAT_SPEECH_SPEED = 1.04;

/** Базовый стиль + настроение реплики (интонация, не смена диктора) */
const buildSpeechPrompt = (emotion) => {
  const tone = String(emotion ?? "").replace(/\s+/g, " ").trim();
  if (!tone) {
    return RUSSIAN_STYLE_PROMPT;
  }
  return `${RUSSIAN_STYLE_PROMPT} Настроение реплики (только интонация и темп, не тембр): ${tone}.`;
};

const writePcmWav = async (outputPath, pcm, sampleRate) => {
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

/**
 * @param {{
 *   text: string,
 *   voice: string,
 *   outputPath: string,
 *   model?: string,
 *   emotion?: string,
 * }} opts
 */
export const synthesizeOpenRouterSpeech = async ({text, voice, outputPath, model, emotion}) => {
  const spoken = textForSpeech(text);
  if (!spoken) {
    throw new Error("Пустой текст для озвучки");
  }

  const resolvedModel = model ?? getOpenRouterTtsModel();
  const isGemini = resolvedModel.includes("gemini");
  const responseFormat = isGemini ? "pcm" : "mp3";

  const buffer = await createSpeech({
    text: spoken,
    voice,
    model: resolvedModel,
    responseFormat,
    prompt: isGemini ? buildSpeechPrompt(emotion) : undefined,
    speed: isGemini ? CHAT_SPEECH_SPEED : undefined,
  });

  await fs.mkdir(path.dirname(outputPath), {recursive: true});

  if (responseFormat === "mp3") {
    const mp3Path = outputPath.endsWith(".mp3") ? outputPath : `${outputPath.replace(/\.wav$/i, "")}.mp3`;
    await fs.writeFile(mp3Path, buffer);
    return {
      provider: "openrouter",
      speaker: voice,
      model: resolvedModel,
      outputPath: mp3Path,
      format: "mp3",
    };
  }

  const wavPath = outputPath.endsWith(".wav") ? outputPath : `${outputPath.replace(/\.mp3$/i, "")}.wav`;
  await writePcmWav(wavPath, buffer, 24_000);
  return {
    provider: "openrouter",
    speaker: voice,
    model: resolvedModel,
    outputPath: wavPath,
    format: "wav",
  };
};
