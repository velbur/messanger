import path from "node:path";
import {access, mkdir, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {slugifyProjectName} from "./project-slug.mjs";
import {isSpeechableText} from "./tts/text-for-speech.mjs";
import {probeAudioDurationMs} from "./tts/audio-duration.mjs";
import {synthesizeOpenRouterSpeech} from "./tts/openrouter-tts.mjs";
import {isOpenRouterConfigured, getOpenRouterTtsVoices} from "./openrouter-client.mjs";
import {mergeConversationVoiceover, pickOpenRouterVoice} from "../src/chat/voiceover.ts";

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

const needsVoiceGeneration = (message, voiceover) => {
  const text = String(message.text ?? "").trim();
  if (!isSpeechableText(text)) {
    return false;
  }
  const existing = String(message.voiceAudio ?? "").trim();
  if (!existing) {
    return true;
  }
  const provider = voiceover?.provider ?? "openrouter";
  if (provider === "openrouter" && existing.endsWith(".mp3")) {
    /* ok */
  } else if (provider === "openrouter" && !existing.endsWith(".wav") && !existing.endsWith(".mp3")) {
    return true;
  }
  const {absolute} = safePublicPath(existing);
  return !existsSync(absolute);
};

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

  const pendingCount = (conversation.messages ?? []).filter((message) =>
    needsVoiceGeneration(message, activeVoiceover),
  ).length;

  if (!isOpenRouterConfigured()) {
    if (pendingCount === 0) {
      logs.push("Все реплики уже озвучены");
      return logs;
    }
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const namespace = normalizeAudioNamespace(audioNamespace);
  const openRouterVoices = getOpenRouterTtsVoices();
  let generated = 0;
  for (let index = 0; index < conversation.messages.length; index += 1) {
    const message = conversation.messages[index];
    if (!needsVoiceGeneration(message, activeVoiceover)) {
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
      });
      const savedPath = result.outputPath;
      message.voiceAudio = path
        .relative(PUBLIC_DIR, savedPath)
        .split(path.sep)
        .join("/");
      message.voiceDurationMs = await probeAudioDurationMs(savedPath);
      generated += 1;
      logs.push(
        `Озвучка #${index + 1} (${message.author}, ${result.speaker}) → ${message.voiceAudio} · ${(message.voiceDurationMs / 1000).toFixed(1)} с`,
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
    needsVoiceGeneration(message, activeVoiceover),
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
    const resp = await fetch(`${remoteBaseUrl}/api/voiceover/upload`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        path: ref,
        dataBase64: buffer.toString("base64"),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`Не удалось отправить ${ref} на воркер: ${data.error ?? resp.status}`);
    }
    logs.push(`Озвучка отправлена на воркер: ${ref}`);
  }
};

export {AUDIO_DIR};
