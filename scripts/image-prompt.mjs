import path from "node:path";
import {readFile, writeFile, mkdir} from "node:fs/promises";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
export const STYLE_PROMPT_PATH = path.join(ROOT, "prompts", "image-style.txt");
export const STORY_STYLE_PROMPT_PATH = path.join(ROOT, "prompts", "story-image-style.txt");

export const DEFAULT_STYLE_PROMPT = `Единый стиль проекта: фотореалистичное фото, снято на камеру смартфона или 35mm, естественный свет, высокая детализация, реалистичные материалы и кожа. Кинематографичная композиция кадра для вложения в мессенджер. Не иллюстрация, не рисунок, не мультфильм, не 3D-рендер, не аниме. Без текста и надписей на картинке.`;

export const DEFAULT_STORY_STYLE_PROMPT = `Единый стиль story-кадров: фотореалистичное кино, cinematic still frame, shot on 35mm, высокая детализация, естественные лица и освещение, глубина сцены, атмосферный свет. Вертикальный кадр 9:16 как кадр из фильма. Не иллюстрация, не digital painting, не мультфильм, не cartoon. Без текста и надписей на картинке.`;

export const SCENE_PROMPT_MAX = 500;

const COMPACT_STYLE = "Стиль: фотореализм, кинематографичное фото.";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const contactLabel = (author, contactName) => {
  if (author === "me") {
    return "Я";
  }
  return contactName?.trim() || "Собеседник";
};

const captionLines = (caption) =>
  String(caption ?? "")
    .split(/\n+/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean);

const mentionsPeople = (caption) =>
  /люд|человек|девушк|парень|мужчин|женщин|толп|пассажир/i.test(caption);

export const extractMustNotShow = (caption, {contactName} = {}) => {
  const not = ["портрет", "селфи", "рамка мессенджера"];
  if (contactName?.trim()) {
    not.push(`лицо ${contactName.trim()}`);
  }
  if (!mentionsPeople(caption)) {
    not.push("люди", "лица");
  }
  if (/полоск|точк|схем|табл|нет\s+схем/i.test(caption)) {
    not.push("деревья", "тени веток", "уличная природа");
  }
  if (/пустой|вагон/i.test(caption)) {
    not.push("пассажиры в вагоне");
  }
  return [...new Set(not)];
};

const formatMessageLine = (message, index, messageIndex, contactName, maxTextLen) => {
  const who = contactLabel(message.author, contactName);
  const raw = normalizeSpace(message.text);
  let text = raw;
  if (text.length > maxTextLen) {
    text = `${text.slice(0, Math.max(8, maxTextLen - 1))}…`;
  }
  if (!text && message.image?.trim()) {
    text = "[фото]";
  }
  if (!text) {
    text = "—";
  }
  const mark = index === messageIndex ? " ←СГЕНЕРИРУЙ ЭТО ФОТО" : "";
  const photo = message.image?.trim() && index !== messageIndex ? " 📷" : "";
  return `${index + 1}) ${who}: ${text}${photo}${mark}`;
};

/**
 * Вся переписка с начала до сообщения с картинкой (включительно).
 * При нехватке места укорачиваются старые реплики, хвост сохраняется.
 */
export const buildDialogueTranscript = (
  messages,
  messageIndex,
  contactName,
  {maxChars = 320} = {},
) => {
  const slice = messages.slice(0, messageIndex + 1);
  let maxTextLen = 48;
  let lines = slice.map((msg, i) =>
    formatMessageLine(msg, i, messageIndex, contactName, maxTextLen),
  );
  let text = lines.join(" | ");
  let truncated = false;
  let omittedCount = 0;

  while (text.length > maxChars && maxTextLen > 12) {
    maxTextLen -= 8;
    lines = slice.map((msg, i) =>
      formatMessageLine(msg, i, messageIndex, contactName, maxTextLen),
    );
    text = lines.join(" | ");
  }

  while (text.length > maxChars && lines.length > 3) {
    truncated = true;
    omittedCount++;
    lines = lines.slice(1);
    text = `…(+${omittedCount} репл.) ` + lines.join(" | ");
  }

  if (text.length > maxChars) {
    truncated = true;
    text = `${text.slice(0, maxChars - 1)}…`;
  }

  return {
    lines,
    text,
    messageCount: slice.length,
    targetIndex: messageIndex,
    truncated,
    omittedCount,
  };
};

/**
 * Полная переписка для LLM.
 * Опционально — реплики после целевого сообщения (уточняют содержимое кадра).
 */
export const buildFullDialogueTranscriptForLlm = (
  messages,
  messageIndex,
  contactName,
  {
    maxChars = 120_000,
    tailLines = 120,
    includeFutureContext = true,
    maxFutureMessages = 25,
    maxFutureChars = 8_000,
  } = {},
) => {
  const formatLine = (msg, index, {isFuture = false} = {}) => {
    const who = contactLabel(msg.author, contactName);
    let text = normalizeSpace(msg.text);
    if (!text && msg.image?.trim()) {
      text = "[у сообщения уже есть фото]";
    }
    if (!text) {
      text = "—";
    }
    let mark = "";
    if (index === messageIndex) {
      mark = " ← ЦЕЛЕВОЕ СООБЩЕНИЕ (генерируем фото к нему)";
    } else if (isFuture) {
      mark = " [после фото — контекст, не отдельный кадр]";
    } else if (msg.image?.trim()) {
      mark = " [фото]";
    }
    const promptNote = msg.imagePrompt?.trim()
      ? ` (промпт кадра: ${normalizeSpace(msg.imagePrompt).slice(0, 100)})`
      : "";
    return `${index + 1}. ${who}: ${text}${mark}${promptNote}`;
  };

  const slice = messages.slice(0, messageIndex + 1);
  let lines = slice.map((msg, i) => formatLine(msg, i));
  let truncated = false;
  let linesIncluded = lines.length;

  if (lines.join("\n").length > maxChars && lines.length > tailLines) {
    truncated = true;
    lines = lines.slice(-tailLines);
    linesIncluded = lines.length;
    lines.unshift(`…(показаны последние ${tailLines} из ${slice.length} реплик до целевого)`);
  }

  let text = lines.join("\n");
  if (text.length > maxChars) {
    truncated = true;
    text = `${text.slice(0, maxChars - 1)}…`;
  }

  let futureText = "";
  let futureMessageCount = 0;
  let futureTruncated = false;
  let futureLinesIncluded = 0;
  let hasFutureContext = false;

  if (includeFutureContext && messageIndex < messages.length - 1) {
    const futureSlice = messages.slice(messageIndex + 1);
    futureMessageCount = futureSlice.length;
    const futureLines = [];

    for (let i = 0; i < futureSlice.length && i < maxFutureMessages; i++) {
      const index = messageIndex + 1 + i;
      futureLines.push(formatLine(futureSlice[i], index, {isFuture: true}));
      futureLinesIncluded++;
    }

    if (futureSlice.length > maxFutureMessages) {
      futureTruncated = true;
      futureLines.push(`…(ещё ${futureSlice.length - maxFutureMessages} реплик после не показаны)`);
    }

    futureText = futureLines.join("\n");
    if (futureText.length > maxFutureChars) {
      futureTruncated = true;
      futureText = `${futureText.slice(0, maxFutureChars - 1)}…`;
    }

    hasFutureContext = futureLinesIncluded > 0;
  }

  return {
    text,
    futureText,
    messageCount: slice.length,
    futureMessageCount,
    truncated,
    futureTruncated,
    linesIncluded,
    futureLinesIncluded,
    hasFutureContext,
  };
};

const countImageFramesBefore = (messages, messageIndex) => {
  let n = 0;
  for (let i = 0; i < messageIndex; i++) {
    if (messages[i]?.image?.trim()) {
      n++;
    }
  }
  return n + 1;
};

const assemblePrompt = (parts, max = SCENE_PROMPT_MAX) => {
  const order = ["task", "dialogue", "scene", "hide", "style", "footer"];
  const byKey = Object.fromEntries(parts.map((p) => [p.key, p.text]));

  const join = () =>
    order
      .map((key) => byKey[key])
      .filter(Boolean)
      .join(" ");

  let text = join();
  for (const key of ["hide", "style"]) {
    if (text.length <= max) {
      break;
    }
    byKey[key] = key === "style" ? COMPACT_STYLE : "";
    text = join();
  }
  if (text.length > max) {
    const dialogueBudget = Math.max(80, max - (text.length - (byKey.dialogue?.length ?? 0)) - 20);
    if (byKey.dialogue && byKey.dialogue.length > dialogueBudget) {
      byKey.dialogue = `${byKey.dialogue.slice(0, dialogueBudget - 1)}…`;
      text = join();
    }
  }
  if (text.length > max) {
    text = `${text.slice(0, max - 1)}…`;
  }
  return text.trim();
};

export const buildFrameBrief = ({
  message,
  messageIndex,
  messages,
  contactName,
}) => {
  const customPrompt = normalizeSpace(message.imagePrompt);
  const rawCaption = String(message.text ?? "");
  const lines = captionLines(rawCaption);
  const caption = lines.length > 0 ? lines.join(". ") : normalizeSpace(rawCaption);
  const transcript = buildDialogueTranscript(messages, messageIndex, contactName);
  const mustNotShow = extractMustNotShow(caption, {contactName});

  return {
    frameIndex: countImageFramesBefore(messages, messageIndex),
    messageIndex,
    caption,
    imagePath: message.image?.trim() ?? "",
    customPrompt: customPrompt || null,
    mustNotShow,
    dialogueTranscript: transcript.text,
    dialogueLines: transcript.lines,
    dialogueMessageCount: transcript.messageCount,
    dialogueTruncated: transcript.truncated,
    dialogueOmittedCount: transcript.omittedCount,
  };
};

/**
 * Эвристический промпт сцены без LLM.
 */
export const buildHeuristicScenePrompt = ({
  stylePrompt = DEFAULT_STYLE_PROMPT,
  contactName,
  messages,
  messageIndex,
  sceneOverride,
}) => {
  if (!Array.isArray(messages) || messageIndex < 0 || messageIndex >= messages.length) {
    throw new Error("Некорректный индекс сообщения");
  }

  const message = messages[messageIndex];
  const frame = buildFrameBrief({message, messageIndex, messages, contactName});
  const transcript = buildDialogueTranscript(messages, messageIndex, contactName, {
    maxChars: 300,
  });

  const sceneDesc =
    normalizeSpace(sceneOverride) ||
    frame.customPrompt ||
    (frame.caption
      ? `Подпись к фото: «${frame.caption}».`
      : "Сцена по смыслу этого сообщения в переписке.");

  const who = contactLabel(message.author, contactName);
  const hideList = frame.mustNotShow.slice(0, 5).join("; ");

  return assemblePrompt([
    {
      key: "task",
      text: `По переписке ниже сгенерируй одно фотореалистичное фото ТОЛЬКО для сообщения ${messageIndex + 1} (${who}, пометка ←СГЕНЕРИРУЙ ЭТО ФОТО). Остальное — контекст, не рисовать.`,
    },
    {
      key: "dialogue",
      text: `Переписка (${transcript.messageCount} реплик${transcript.truncated ? ", начало сокращено" : ""}): ${transcript.text}`,
    },
    {key: "scene", text: sceneDesc},
    {key: "hide", text: `Не рисовать: ${hideList}.`},
    {key: "style", text: normalizeSpace(stylePrompt) || COMPACT_STYLE},
    {key: "footer", text: `${CHAT_IMAGE_ASPECT_RATIO}, вложение в чат, без UI.`},
  ]);
};

export const readStylePrompt = async () => {
  try {
    const text = await readFile(STYLE_PROMPT_PATH, "utf8");
    const trimmed = text.trim();
    return trimmed || DEFAULT_STYLE_PROMPT;
  } catch {
    return DEFAULT_STYLE_PROMPT;
  }
};

export const writeStylePrompt = async (content) => {
  const trimmed = String(content ?? "").trim();
  if (!trimmed) {
    throw new Error("Промпт не может быть пустым");
  }
  await mkdir(path.dirname(STYLE_PROMPT_PATH), {recursive: true});
  await writeFile(STYLE_PROMPT_PATH, `${trimmed}\n`, "utf8");
  return trimmed;
};

export const readStoryStylePrompt = async () => {
  try {
    const text = await readFile(STORY_STYLE_PROMPT_PATH, "utf8");
    const trimmed = text.trim();
    return trimmed || DEFAULT_STORY_STYLE_PROMPT;
  } catch {
    return DEFAULT_STORY_STYLE_PROMPT;
  }
};

export const writeStoryStylePrompt = async (content) => {
  const trimmed = String(content ?? "").trim();
  if (!trimmed) {
    throw new Error("Промпт не может быть пустым");
  }
  await mkdir(path.dirname(STORY_STYLE_PROMPT_PATH), {recursive: true});
  await writeFile(STORY_STYLE_PROMPT_PATH, `${trimmed}\n`, "utf8");
  return trimmed;
};

export const previewImagePrompt = async ({conversation, messageIndex, stylePrompt}) => {
  const style = stylePrompt ?? (await readStylePrompt());
  const {resolveFramePrompts} = await import("./image-prompt-llm.mjs");

  const resolved = await resolveFramePrompts({
    conversation,
    messageIndex,
    stylePrompt: style,
  });

  return {
    prompt: resolved.imagePrompt,
    charCount: resolved.imagePrompt?.length ?? 0,
    frameBrief: resolved.frame,
    imagePrompt: resolved.imagePrompt,
    promptSource: resolved.promptSource,
    llmModel: resolved.llmModel,
  };
};
