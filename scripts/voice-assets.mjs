import path from "node:path";
import {access, mkdir, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {uploadAssetToRemote} from "./remote-upload.mjs";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {slugifyProjectName} from "./project-slug.mjs";
import {isSpeechableText} from "./tts/text-for-speech.mjs";
import {probeAudioDurationMs} from "./tts/audio-duration.mjs";
import {synthesizeOpenRouterSpeech} from "./tts/openrouter-tts.mjs";
import {ensureConversationEmotions} from "./tts/voice-emotion.mjs";
import {isOpenRouterConfigured, getOpenRouterTtsVoices} from "./openrouter-client.mjs";
import {mergeConversationVoiceover, pickOpenRouterVoice, buildConversationVoiceTtsProfile} from "../src/chat/voiceover.ts";

const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");

const safePublicPath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Недопустимый путь к аудио");
  }
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error("Недопустимый путь к аудио");
  }
  return {relative: normalized, absolute};
};

export const voiceRefForMessage = (namespace, messageIndex) =>
  `audio/${namespace}/msg-${messageIndex + 1}.wav`;

const defaultAudioNamespace = () => `short-${Date.now().toString(36)}`;

export const normalizeAudioNamespace = (value) => {
  const slug = slugifyProjectName(String(value ?? "").trim() || defaultAudioNamespace());
  return slug === "render" ? defaultAudioNamespace() : slug;
};

export const collectVoiceRefs = (conversation) => {
  const refs = [];
  const messages = conversation?.messages ?? [];
  for (let index = 0; index < messages.length; index += 1) {
    const ref = String(messages[index]?.voiceAudio ?? "").trim();
    if (ref) {
      refs.push(ref);
    }
  }
  return [...new Set(refs)];
};

/** Все voiceAudio из JSON лежат в local public/audio */
export const conversationHasLocalVoiceFiles = (conversation) => {
  const refs = collectVoiceRefs(conversation);
  if (refs.length === 0) {
    return false;
  }
  return refs.every((ref) => {
    try {
      const {absolute} = safePublicPath(ref);
      return existsSync(absolute);
    } catch {
      return false;
    }
  });
};

/** Проверка перед рендером / отправкой на воркер */
export const assertVoiceoverReadyForRender = (conversation) => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    return;
  }

  for (let index = 0; index < (conversation.messages ?? []).length; index += 1) {
    const message = conversation.messages[index];
    if (!isSpeechableText(message.text)) {
      continue;
    }
    const ref = String(message.voiceAudio ?? "").trim();
    if (!ref) {
      throw new Error(
        `Озвучка сообщения #${index + 1}: нет файла. Включите озвучку и соберите видео на Mac.`,
      );
    }
    const {absolute} = safePublicPath(ref);
    if (!existsSync(absolute)) {
      throw new Error(
        `Озвучка сообщения #${index + 1}: файл не найден (${ref}). Сгенерируйте озвучку заново.`,
      );
    }
  }
};

export const saveVoiceBuffer = async (buffer, relativePath) => {
  const {relative, absolute} = safePublicPath(relativePath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, buffer);
  return relative;
};

const isOpenRouterVoiceMessage = (message) => message?.voiceTtsProvider === "openrouter";

export const messageNeedsOpenRouterVoice = (message, voiceover, voices) => {
  const text = String(message?.text ?? "").trim();
  if (!isSpeechableText(text)) {
    return false;
  }
  const activeVoiceover = voiceover ?? mergeConversationVoiceover({});
  const openRouterVoices = voices ?? getOpenRouterTtsVoices();
  const expectedProfile = buildConversationVoiceTtsProfile(activeVoiceover, openRouterVoices);
  const expectedVoice = pickOpenRouterVoice(activeVoiceover, message.author, openRouterVoices);

  const existing = String(message?.voiceAudio ?? "").trim();
  if (!existing) {
    return true;
  }
  if (!isOpenRouterVoiceMessage(message)) {
    return true;
  }
  if (message.voiceTtsProfile !== expectedProfile) {
    return true;
  }
  if (message.voiceTtsVoice && message.voiceTtsVoice !== expectedVoice) {
    return true;
  }
  try {
    const {absolute} = safePublicPath(existing);
    return !existsSync(absolute);
  } catch {
    return true;
  }
};

const needsVoiceGeneration = (message, voiceover, voices) =>
  messageNeedsOpenRouterVoice(message, voiceover, voices);

export const resolveConversationVoiceover = async (
  conversation,
  {failOnMissingVoice = false, logs = []} = {},
) => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    return logs;
  }

  for (let index = 0; index < conversation.messages.length; index += 1) {
    const message = conversation.messages[index];
    if (isSpeechableText(message.text) && !String(message.voiceAudio ?? "").trim()) {
      const errorText = `Озвучка #${index + 1}: нет voiceAudio. Соберите видео с включённой озвучкой на Mac.`;
      if (failOnMissingVoice) {
        throw new Error(errorText);
      }
      logs.push(errorText);
      continue;
    }

    const ref = String(message.voiceAudio ?? "").trim();
    if (!ref) {
      continue;
    }
    const {absolute} = safePublicPath(ref);
    if (!existsSync(absolute)) {
      const errorText = `Озвучка #${index + 1}: файл не найден (${ref}). Соберите видео с озвучкой на Mac.`;
      if (failOnMissingVoice) {
        throw new Error(errorText);
      }
      logs.push(errorText);
      delete message.voiceAudio;
      delete message.voiceDurationMs;
      delete message.voiceTtsProvider;
      delete message.voiceTtsProfile;
      delete message.voiceTtsVoice;
    }
  }

  return logs;
};

/**
 * @param {import('../src/chat/schema.ts').ConversationInput} conversation
 */
export const generateMissingVoiceover = async (conversation, {audioNamespace} = {}) => {
  const logs = [];
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    conversation.voiceover = {...voiceover, enabled: true};
  }
  conversation.voiceover = {...mergeConversationVoiceover(conversation), provider: "openrouter"};
  const activeVoiceover = mergeConversationVoiceover(conversation);
  const openRouterVoices = getOpenRouterTtsVoices();

  const pendingCount = (conversation.messages ?? []).filter((message) =>
    needsVoiceGeneration(message, activeVoiceover, openRouterVoices),
  ).length;

  if (!isOpenRouterConfigured()) {
    if (pendingCount === 0) {
      logs.push("Все реплики уже озвучены");
      return logs;
    }
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const namespace = normalizeAudioNamespace(audioNamespace);

  try {
    const {filled, attempted} = await ensureConversationEmotions(conversation);
    if (attempted) {
      logs.push(
        filled > 0
          ? `Эмоции озвучки определены по сюжету: ${filled} реплик`
          : "Эмоции озвучки: не удалось определить — озвучу с базовой интонацией",
      );
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logs.push(`Эмоции озвучки: пропущено (${reason}) — базовая интонация`);
  }

  let generated = 0;
  for (let index = 0; index < conversation.messages.length; index += 1) {
    const message = conversation.messages[index];
    if (!needsVoiceGeneration(message, activeVoiceover, openRouterVoices)) {
      if (message.voiceAudio && !message.voiceDurationMs) {
        try {
          const {absolute} = safePublicPath(message.voiceAudio);
          message.voiceDurationMs = await probeAudioDurationMs(absolute);
        } catch {
          /* ignore */
        }
      }
      continue;
    }

    const text = String(message.text ?? "").trim();
    const targetRef = voiceRefForMessage(namespace, index);
    const {absolute} = safePublicPath(targetRef);

    try {
      const voice = pickOpenRouterVoice(activeVoiceover, message.author, openRouterVoices);
      const result = await synthesizeOpenRouterSpeech({
        text,
        voice,
        outputPath: absolute,
        emotion: String(message.voiceEmotion ?? "").trim() || undefined,
      });
      const savedPath = result.outputPath;
      message.voiceAudio = path
        .relative(PUBLIC_DIR, savedPath)
        .split(path.sep)
        .join("/");
      message.voiceTtsProvider = "openrouter";
      message.voiceTtsProfile = buildConversationVoiceTtsProfile(activeVoiceover, openRouterVoices);
      message.voiceTtsVoice = voice;
      message.voiceDurationMs = await probeAudioDurationMs(savedPath);
      generated += 1;
      const emotionHint = String(message.voiceEmotion ?? "").trim();
      logs.push(
        `Озвучка #${index + 1} (${message.author}, OpenRouter/${result.model}, ${result.speaker}${emotionHint ? `, «${emotionHint}»` : ""}) → ${message.voiceAudio} · ${(message.voiceDurationMs / 1000).toFixed(1)} с`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.push(`Озвучка #${index + 1}: ошибка — ${reason}`);
    }
  }

  if (generated === 0 && logs.length === 0) {
    logs.push("Все реплики уже озвучены");
  }

  const stillMissing = (conversation.messages ?? []).filter((message) =>
    needsVoiceGeneration(message, activeVoiceover, openRouterVoices),
  ).length;
  if (stillMissing > 0) {
    const failures = logs.filter((line) => /ошибка/i.test(line));
    const detail =
      failures.length > 0
        ? failures.join("; ")
        : `${stillMissing} реплик без озвучки после генерации`;
    throw new Error(detail);
  }

  return logs;
};

export const syncVoiceToRemote = async (conversation, remoteBaseUrl, logs) => {
  const voiceover = mergeConversationVoiceover(conversation);
  if (!voiceover.enabled) {
    return;
  }

  assertVoiceoverReadyForRender(conversation);
  const refs = collectVoiceRefs(conversation);
  if (refs.length === 0) {
    throw new Error("Озвучка включена, но нет файлов для отправки на воркер");
  }

  for (const ref of refs) {
    const {absolute} = safePublicPath(ref);
    if (!existsSync(absolute)) {
      throw new Error(`Озвучка не найдена локально: ${ref}`);
    }
    const buffer = await import("node:fs/promises").then((fs) => fs.readFile(absolute));
    await uploadAssetToRemote(remoteBaseUrl, ref, buffer);
    logs.push(`Озвучка отправлена на воркер: ${ref}`);
  }
};

export {AUDIO_DIR};
