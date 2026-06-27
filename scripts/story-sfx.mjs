import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {existsSync} from "node:fs";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {SFX_CATALOG, getSfxCatalogMap, SFX_CATALOG_VERSION} from "./sfx-catalog.mjs";
import {isOpenRouterConfigured, chatCompletionJson} from "./openrouter-client.mjs";
import {isStoryVisualLayout, messageHasStoryImage} from "../src/chat/story.ts";
import {SFX_MIN_HEURISTIC_SCORE, STORY_SFX_PROFILE} from "../src/chat/sfx.ts";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const MIN_HEURISTIC_SCORE = SFX_MIN_HEURISTIC_SCORE;

const TAG_KEYWORDS = [
  ["дожд", "rain"],
  ["морос", "rain"],
  ["гроз", "storm"],
  ["град", "hail"],
  ["гром", "thunder"],
  ["ветер", "wind"],
  ["туман", "fog"],
  ["ноч", "night"],
  ["чердак", "attic"],
  ["подвал", "basement"],
  ["двер", "door"],
  ["гараж", "garage"],
  ["стук", "knock"],
  ["звон", "ring"],
  ["шаг", "footsteps"],
  ["скрип", "creak"],
  ["скреж", "scratch"],
  ["царап", "scratch"],
  ["шкатул", "clock"],
  ["дом", "house"],
  ["квартир", "home"],
  ["кухн", "kitchen"],
  ["ванн", "bathroom"],
  ["душ", "shower"],
  ["туалет", "toilet"],
  ["улиц", "outdoor"],
  ["двор", "yard"],
  ["лес", "forest"],
  ["парк", "park"],
  ["луг", "meadow"],
  ["город", "city"],
  ["переул", "alley"],
  ["рынок", "market"],
  ["офис", "office"],
  ["больниц", "hospital"],
  ["школ", "school"],
  ["магазин", "supermarket"],
  ["ресторан", "restaurant"],
  ["бар", "bar"],
  ["библиотек", "library"],
  ["бассейн", "pool"],
  ["костер", "campfire"],
  ["костёр", "campfire"],
  ["водопад", "waterfall"],
  ["листв", "leaves"],
  ["собак", "dog"],
  ["кош", "cat"],
  ["мур", "cat"],
  ["лягуш", "frog"],
  ["птиц", "birds"],
  ["колокол", "bells"],
  ["церков", "church"],
  ["сердц", "heartbeat"],
  ["страх", "fear"],
  ["ужас", "horror"],
  ["кошмар", "horror"],
  ["тайн", "mystery"],
  ["призрак", "horror"],
  ["окн", "window"],
  ["лестниц", "stairs"],
  ["метал", "metal"],
  ["телефон", "phone"],
  ["звонок", "ring"],
  ["часы", "clock"],
  ["толп", "crowd"],
  ["кафе", "cafe"],
  ["машин", "car"],
  ["автобус", "bus"],
  ["поезд", "train"],
  ["самолет", "airplane"],
  ["самолёт", "airplane"],
  ["велосип", "bicycle"],
  ["ключ", "keys"],
  ["замок", "lock"],
  ["компьютер", "computer"],
  ["принтер", "printer"],
  ["уведомлен", "notification"],
  ["телевиз", "tv"],
  ["каш", "cough"],
  ["вздох", "sigh"],
  ["смех", "laughter"],
  ["плач", "cry"],
  ["ребен", "baby"],
  ["ребён", "baby"],
  ["пылесос", "vacuum"],
  ["полив", "sprinkler"],
  ["ужас", "horror"],
  ["дрон", "drone"],
];

const collectSceneBriefs = (conversation) => {
  const scenes = [];
  const opening = conversation.story?.opening;
  if (opening?.imagePrompt?.trim() || opening?.image?.trim()) {
    scenes.push({
      key: "opening",
      label: "Заставка (opening)",
      imagePrompt: normalizeSpace(opening.imagePrompt) || "—",
      messageText: "",
      messageIndex: null,
    });
  }

  const messages = conversation.messages ?? [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!messageHasStoryImage(message)) {
      continue;
    }
    const who = message.author === "me" ? "Я" : conversation.contactName ?? "Собеседник";
    scenes.push({
      key: String(index),
      label: `Сцена msg-${index + 1} (${who})`,
      imagePrompt: normalizeSpace(message.storyImagePrompt) || "—",
      messageText: normalizeSpace(message.text) || "—",
      messageIndex: index,
    });
  }
  return scenes;
};

const buildCatalogSummary = () =>
  SFX_CATALOG.map(
    (item) =>
      `${item.id} | ${item.tags.join(",")} | loop=${item.loop ? "yes" : "no"} | vol≈${item.defaultVolume}`,
  ).join("\n");

const scoreItem = (item, matchedTags) =>
  item.tags.reduce((sum, tag) => sum + (matchedTags.has(tag) ? 1 : 0), 0);

const buildHeuristicCues = (sceneText, {minScore = MIN_HEURISTIC_SCORE} = {}) => {
  const lower = sceneText.toLowerCase();
  const matchedTags = new Set();
  for (const [keyword, tag] of TAG_KEYWORDS) {
    if (lower.includes(keyword)) {
      matchedTags.add(tag);
    }
  }

  if (matchedTags.size === 0) {
    return [];
  }

  const scored = SFX_CATALOG.map((item) => ({
    item,
    score: scoreItem(item, matchedTags),
  }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return [];
  }

  const ambient = scored.find((entry) => entry.item.loop)?.item;
  const accent = scored.find(
    (entry) => !entry.item.loop && entry.item.id !== ambient?.id && entry.score >= MIN_HEURISTIC_SCORE,
  )?.item;

  const cues = [];
  if (ambient) {
    cues.push({id: ambient.id, loop: true, volume: ambient.defaultVolume});
  }
  if (accent) {
    cues.push({
      id: accent.id,
      loop: false,
      volume: accent.defaultVolume,
      delayMs: ambient ? 600 : 0,
    });
  }
  return cues.slice(0, 2);
};

const validateCue = (raw) => {
  const id = String(raw?.id ?? "").trim();
  if (!id || !getSfxCatalogMap().has(id)) {
    return null;
  }
  const item = getSfxCatalogMap().get(id);
  const volume =
    typeof raw.volume === "number" ? Math.min(1, Math.max(0, raw.volume)) : item.defaultVolume;
  const loop = typeof raw.loop === "boolean" ? raw.loop : item.loop;
  const delayMs =
    typeof raw.delayMs === "number" ? Math.min(8000, Math.max(0, Math.round(raw.delayMs))) : 0;
  return {id, volume, loop, delayMs};
};

const normalizeSceneCues = (rawCues) => {
  if (!Array.isArray(rawCues)) {
    return [];
  }
  return rawCues.map(validateCue).filter(Boolean).slice(0, 2);
};

const applyAssignment = (conversation, assignment) => {
  if (!conversation.story) {
    conversation.story = {};
  }
  if (!conversation.story.sfx) {
    conversation.story.sfx = {};
  }
  conversation.story.sfx.profile = STORY_SFX_PROFILE;
  conversation.story.sfx.enabled = conversation.story.sfx.enabled !== false;

  const hasOpening =
    conversation.story.opening?.image?.trim() || conversation.story.opening?.imagePrompt?.trim();
  if (hasOpening) {
    if (!conversation.story.opening) {
      conversation.story.opening = {};
    }
    conversation.story.opening.storySfx = normalizeSceneCues(assignment.opening);
  }

  const scenes = assignment.scenes ?? {};
  for (const [key, rawCues] of Object.entries(scenes)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= (conversation.messages?.length ?? 0)) {
      continue;
    }
    conversation.messages[index].storySfx = normalizeSceneCues(rawCues);
  }

  for (const message of conversation.messages ?? []) {
    if (messageHasStoryImage(message) && message.storySfx === undefined) {
      message.storySfx = [];
    }
  }
};

export const countStoryScenesForSfx = (conversation) => {
  if (!isStoryVisualLayout(conversation)) {
    return 0;
  }
  let count = 0;
  if (conversation.story?.opening?.image?.trim() || conversation.story?.opening?.imagePrompt?.trim()) {
    count += 1;
  }
  for (const message of conversation.messages ?? []) {
    if (messageHasStoryImage(message)) {
      count += 1;
    }
  }
  return count;
};

const sceneNeedsAssignment = (conversation) => {
  const hasOpening =
    conversation.story?.opening?.image?.trim() || conversation.story?.opening?.imagePrompt?.trim();
  if (hasOpening && conversation.story?.opening?.storySfx === undefined) {
    return true;
  }
  for (const message of conversation.messages ?? []) {
    if (messageHasStoryImage(message) && message.storySfx === undefined) {
      return true;
    }
  }
  return false;
};

export const needsStorySfxAssignment = (conversation) => {
  if (!isStoryVisualLayout(conversation)) {
    return false;
  }
  if (conversation.story?.sfx?.enabled === false) {
    return false;
  }
  if (conversation.story?.sfx?.profile !== STORY_SFX_PROFILE) {
    return countStoryScenesForSfx(conversation) > 0;
  }
  return sceneNeedsAssignment(conversation);
};

const assignHeuristic = (conversation, logs) => {
  const scenes = collectSceneBriefs(conversation);
  const assignment = {opening: [], scenes: {}};
  let withSound = 0;
  for (const scene of scenes) {
    const text = `${scene.imagePrompt} ${scene.messageText}`;
    const cues = buildHeuristicCues(text);
    if (cues.length > 0) {
      withSound += 1;
    }
    if (scene.key === "opening") {
      assignment.opening = cues;
    } else {
      assignment.scenes[scene.key] = cues;
    }
  }
  applyAssignment(conversation, assignment);
  logs.push(
    `SFX (эвристика): ${withSound}/${scenes.length} сцен со звуком, каталог v${SFX_CATALOG_VERSION}`,
  );
};

const assignWithLlm = async (conversation, logs) => {
  const scenes = collectSceneBriefs(conversation);
  if (scenes.length === 0) {
    return;
  }

  const sceneBlocks = scenes
    .map(
      (scene) =>
        `[${scene.key}] ${scene.label}\nimagePrompt: ${scene.imagePrompt}\nтекст реплики: ${scene.messageText}`,
    )
    .join("\n\n");

  const system = [
    "Ты звукорежиссёр для коротких story-роликов (переписка + сюжетные кадры сверху).",
    "Подбери атмосферные звуки ТОЛЬКО из каталога — id строго из списка.",
    "Главное правило: если нет уверенного совпадения — оставь сцену БЕЗ звука (пустой массив []).",
    "Лучше тишина, чем неуместный звук (не подставляй room-tone «на всякий случай»).",
    "Добавляй звук только когда imagePrompt явно задаёт место/погоду/действие.",
    "На сцену максимум: 1 loop-фон (0.12–0.26) ИЛИ 1 короткий акцент, редко оба если оба точно уместны.",
    "Не повторяй один и тот же акцент на соседних сценах без причины.",
    "Текст чата — только для настроения, не для буквальных шуточных SFX.",
    'Ответ JSON: {"opening":[],"scenes":{"0":[],"3":[{"id":"rain-light","volume":0.2,"loop":true}]}}',
    "Ключи scenes — индекс сообщения строкой. opening — только заставка.",
  ].join("\n");

  const user = [
    `Контакт: ${conversation.contactName ?? "Собеседник"}`,
    `Каталог (${SFX_CATALOG.length} звуков):\n${buildCatalogSummary()}`,
    `Сцены:\n${sceneBlocks}`,
  ].join("\n\n");

  const parsed = await chatCompletionJson({system, user, temperature: 0.2});
  applyAssignment(conversation, parsed);
  const withSound =
    normalizeSceneCues(parsed.opening).length +
    Object.values(parsed.scenes ?? {}).reduce(
      (sum, cues) => sum + normalizeSceneCues(cues).length,
      0,
    );
  logs.push(
    `SFX (LLM): ${withSound} звуков на ${scenes.length} сцен, профиль ${STORY_SFX_PROFILE}`,
  );
};

const refillEmptyStorySfxFromHeuristic = (conversation, logs) => {
  const scenes = collectSceneBriefs(conversation);
  let filled = 0;
  for (const scene of scenes) {
    const text = `${scene.imagePrompt} ${scene.messageText}`;
    const cues = buildHeuristicCues(text, {minScore: 1});
    if (cues.length === 0) {
      continue;
    }

    if (scene.key === "opening") {
      const existing = conversation.story?.opening?.storySfx;
      if (Array.isArray(existing) && existing.length > 0) {
        continue;
      }
      if (!conversation.story.opening) {
        conversation.story.opening = {};
      }
      conversation.story.opening.storySfx = cues;
      filled += 1;
      continue;
    }

    const index = scene.messageIndex;
    const message = conversation.messages?.[index];
    if (!message) {
      continue;
    }
    const existing = message.storySfx;
    if (Array.isArray(existing) && existing.length > 0) {
      continue;
    }
    message.storySfx = cues;
    filled += 1;
  }

  if (filled > 0) {
    logs.push(`SFX: эвристика заполнила ${filled} сцен без звука`);
  }
};

export const assignStorySfxIfNeeded = async (conversation, {force = false} = {}) => {
  const logs = [];
  if (!isStoryVisualLayout(conversation)) {
    return logs;
  }
  if (conversation.story?.sfx?.enabled === false) {
    return logs;
  }
  if (!force && !needsStorySfxAssignment(conversation)) {
    refillEmptyStorySfxFromHeuristic(conversation, logs);
    return logs;
  }

  if (isOpenRouterConfigured()) {
    try {
      await assignWithLlm(conversation, logs);
      refillEmptyStorySfxFromHeuristic(conversation, logs);
      return logs;
    } catch (error) {
      logs.push(
        `SFX LLM: ${error instanceof Error ? error.message : String(error)} — fallback на эвристику`,
      );
    }
  } else {
    logs.push("SFX: OpenRouter не настроен — эвристика по тегам");
  }

  assignHeuristic(conversation, logs);
  refillEmptyStorySfxFromHeuristic(conversation, logs);
  return logs;
};

export const collectStorySfxRefs = (conversation) => {
  const ids = new Set();
  const opening = conversation.story?.opening?.storySfx ?? [];
  for (const cue of opening) {
    if (cue?.id) {
      ids.add(cue.id);
    }
  }
  for (const message of conversation.messages ?? []) {
    for (const cue of message.storySfx ?? []) {
      if (cue?.id) {
        ids.add(cue.id);
      }
    }
  }
  return [...ids].map((id) => `sfx/${id}.wav`);
};

export const resolveStorySfxFiles = async (conversation, {failOnMissing = true} = {}) => {
  const logs = [];
  const refs = collectStorySfxRefs(conversation);
  for (const ref of refs) {
    const abs = path.join(PUBLIC_DIR, ref);
    if (!existsSync(abs)) {
      const message = `SFX не найден: ${ref} (запустите npm run sfx:generate)`;
      if (failOnMissing) {
        throw new Error(message);
      }
      logs.push(message);
    }
  }
  if (refs.length > 0) {
    logs.push(`SFX: ${refs.length} файлов в порядке`);
  }
  return logs;
};

export const syncStorySfxToRemote = async (conversation, remoteBaseUrl, logs) => {
  const refs = collectStorySfxRefs(conversation);
  for (const ref of refs) {
    const abs = path.join(PUBLIC_DIR, ref);
    let buffer;
    try {
      const {readFile} = await import("node:fs/promises");
      buffer = await readFile(abs);
    } catch {
      logs.push(`SFX не найден локально, пропущен: ${ref}`);
      continue;
    }
    const resp = await fetch(`${remoteBaseUrl}/api/images/upload`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({targetRef: ref, contentBase64: buffer.toString("base64")}),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(`Не удалось отправить SFX ${ref} на воркер: ${data.error ?? resp.status}`);
    }
    logs.push(`SFX отправлен на воркер: ${ref}`);
  }
};

export const ensureSfxCatalogJson = async () => {
  const catalogPath = path.join(PUBLIC_DIR, "sfx", "catalog.json");
  if (existsSync(catalogPath)) {
    return;
  }
  await mkdir(path.join(PUBLIC_DIR, "sfx"), {recursive: true});
  const payload = {
    version: SFX_CATALOG_VERSION,
    items: SFX_CATALOG.map((item) => ({...item, path: `sfx/${item.id}.wav`})),
  };
  await writeFile(catalogPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};
