import {existsSync} from "node:fs";
import path from "node:path";
import {isGeminiTtsVoiceId} from "../src/chat/voiceover.ts";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {isOpenRouterConfigured} from "./openrouter-client.mjs";
import {synthesizeOpenRouterSpeech} from "./tts/openrouter-tts.mjs";

const PREVIEW_DIR = path.join(PUBLIC_DIR, "audio", "_voice-previews");

export const VOICE_PREVIEW_SAMPLE_TEXT = "Привет! Вот как я звучу в живой переписке.";

export const voicePreviewRelativePath = (voiceId) =>
  `audio/_voice-previews/${voiceId}.wav`;

/**
 * @param {string} voiceId
 * @returns {Promise<{ relative: string, previewUrl: string, cached: boolean }>}
 */
export const ensureVoicePreview = async (voiceId) => {
  const id = String(voiceId ?? "").trim();
  if (!isGeminiTtsVoiceId(id)) {
    throw new Error(`Неизвестный голос: ${id || "(пусто)"}`);
  }
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const relative = voicePreviewRelativePath(id);
  const absolute = path.join(PUBLIC_DIR, relative);

  if (!existsSync(absolute)) {
    await synthesizeOpenRouterSpeech({
      text: VOICE_PREVIEW_SAMPLE_TEXT,
      voice: id,
      outputPath: absolute,
      emotion: "спокойно, по-дружески",
    });
    return {relative, previewUrl: `/${relative}`, cached: false};
  }

  return {relative, previewUrl: `/${relative}`, cached: true};
};
