import {
  computeSceneCountFromTarget,
  getStorySceneDurationSec,
  getStoryTargetDurationSec,
  suggestSceneAnchorsByTime,
  buildMessageTimelineMs,
} from "./story-scene-timing.mjs";
import {
  applyStoryScenesPlan,
  enrichScenesWithTimelineMs,
  scenesFromLegacyMessageIndices,
} from "./story-scene-sync.mjs";
import {chatCompletionJson as openRouterChatJson, isOpenRouterConfigured} from "./openrouter-client.mjs";

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const fallbackStoryScenesByTime = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageCount = messages.length;
  if (messageCount === 0) {
    return {includeOpening: true, scenes: [], rationale: "fallback-empty", messageIndices: []};
  }

  const sceneCount = computeSceneCountFromTarget(conversation);
  const anchors = suggestSceneAnchorsByTime(conversation, sceneCount);
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";

  const scenes = anchors.map((anchorIndex, order) => {
    const prevAnchor = order > 0 ? anchors[order - 1] : 0;
    const messageFrom = order === 0 ? 0 : prevAnchor;
    const messageTo =
      order < anchors.length - 1
        ? Math.max(anchorIndex, anchors[order + 1] - 1)
        : messageCount - 1;
    const text = messages
      .slice(messageFrom, messageTo + 1)
      .map((m) => normalizeSpace(m.text))
      .filter(Boolean)
      .join(" ")
      .slice(0, 180);

    return {
      id: `scene-${order + 1}`,
      beat: text || `Смысловой блок ${order + 1} (${myName} / ${contactName})`,
      anchorMessageIndex: anchorIndex,
      messageFrom,
      messageTo,
    };
  });

  return {
    includeOpening: true,
    scenes: enrichScenesWithTimelineMs(conversation, scenes),
    rationale: "равномерная сетка по времени (fallback)",
    messageIndices: anchors,
  };
};

const normalizeLlmScenes = (data, conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const messageCount = messages.length;
  const includeOpening = data?.includeOpening !== false;
  const raw = Array.isArray(data?.scenes) ? data.scenes : [];
  const {min, max} = getStorySceneDurationSec(conversation);

  const scenes = raw
    .map((item, index) => {
      const anchor = Number.parseInt(String(item?.anchorMessageIndex ?? item?.anchor ?? ""), 10);
      const from = Number.parseInt(String(item?.messageFrom ?? anchor), 10);
      const to = Number.parseInt(String(item?.messageTo ?? anchor), 10);
      if (!Number.isFinite(anchor) || anchor < 0 || anchor >= messageCount) {
        return null;
      }
      const beat = normalizeSpace(item?.beat);
      if (!beat) {
        return null;
      }
      return {
        id: normalizeSpace(item?.id) || `scene-${index + 1}`,
        beat,
        anchorMessageIndex: anchor,
        messageFrom: Number.isFinite(from) && from >= 0 ? Math.min(from, anchor) : anchor,
        messageTo:
          Number.isFinite(to) && to >= 0 ? Math.min(messageCount - 1, Math.max(to, anchor)) : anchor,
        estimatedStartMs:
          typeof item?.estimatedStartMs === "number" ? item.estimatedStartMs : undefined,
        estimatedEndMs: typeof item?.estimatedEndMs === "number" ? item.estimatedEndMs : undefined,
      };
    })
    .filter(Boolean);

  if (scenes.length === 0 && messageCount > 0) {
    return fallbackStoryScenesByTime(conversation);
  }

  const deduped = [];
  const seenAnchors = new Set();
  for (const scene of scenes.sort((a, b) => a.anchorMessageIndex - b.anchorMessageIndex)) {
    if (seenAnchors.has(scene.anchorMessageIndex)) {
      continue;
    }
    seenAnchors.add(scene.anchorMessageIndex);
    deduped.push(scene);
  }

  return {
    includeOpening,
    scenes: enrichScenesWithTimelineMs(conversation, deduped),
    rationale: normalizeSpace(data?.rationale) || `сцены ~${min}–${max} с`,
    messageIndices: deduped.map((s) => s.anchorMessageIndex),
  };
};

const formatTimedTranscript = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const rows = buildMessageTimelineMs(conversation);
  const rowByIndex = new Map(rows.map((r) => [r.index, r]));
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";

  return messages
    .map((message, index) => {
      const who = message.author === "me" ? myName : contactName;
      const row = rowByIndex.get(index);
      const t0 = row ? (row.startMs / 1000).toFixed(1) : "?";
      const t1 = row ? (row.endMs / 1000).toFixed(1) : "?";
      return `[${t0}–${t1}s] ${index}. ${who}: ${normalizeSpace(message.text)}`;
    })
    .join("\n");
};

/**
 * План сцен по целевому времени ролика (~4–6 с смысла на кадр).
 */
export const planStoryScenesByTime = async (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (messages.length === 0) {
    return {includeOpening: true, scenes: [], rationale: "", messageIndices: []};
  }

  if (!isOpenRouterConfigured()) {
    return fallbackStoryScenesByTime(conversation);
  }

  const targetSec = getStoryTargetDurationSec(conversation);
  const sceneCount = computeSceneCountFromTarget(conversation);
  const {min, max} = getStorySceneDurationSec(conversation);
  const myName = normalizeSpace(conversation?.myName) || "Я";
  const contactName = normalizeSpace(conversation?.contactName) || "Собеседник";

  try {
    const {data} = await openRouterChatJson({
      messages: [
        {
          role: "system",
          content: [
            "Ты монтажёр рисованного Shorts: переписка внизу, иллюстрации 9:16 сверху.",
            `Целевая длительность ролика ~${targetSec} с. Нужно ~${sceneCount} смен кадра.`,
            `Каждая сцена — один смысловой блок на ~${min}–${max} с визуала (не каждая реплика).`,
            "Разбей переписку на сцены: beat, messageFrom/messageTo, anchorMessageIndex (0-based).",
            "includeOpening: true — establishing shot до чата.",
            'Ответ JSON: {"includeOpening":true,"rationale":"...","scenes":[{"id":"s1","beat":"...","anchorMessageIndex":0,"messageFrom":0,"messageTo":2}]}',
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Я: ${myName}`,
            `Собеседник: ${contactName}`,
            `Цель: ${sceneCount} сцен, блок ~${min}–${max} с`,
            "",
            "Переписка с оценкой времени:",
            formatTimedTranscript(conversation),
          ].join("\n"),
        },
      ],
      temperature: 0.2,
      maxTokens: 2500,
    });

    return normalizeLlmScenes(data, conversation);
  } catch {
    return fallbackStoryScenesByTime(conversation);
  }
};

/** @deprecated alias */
export const planStoryScenePlacements = async (conversation) => {
  const plan = await planStoryScenesByTime(conversation);
  return {
    includeOpening: plan.includeOpening,
    messageIndices: plan.messageIndices,
    rationale: plan.rationale,
    scenes: plan.scenes,
  };
};

export const applyStoryScenePlanToConversation = (conversation, plan) => {
  if (plan.scenes?.length) {
    return applyStoryScenesPlan(conversation, {
      includeOpening: plan.includeOpening,
      scenes: plan.scenes,
    });
  }
  const legacy = scenesFromLegacyMessageIndices(conversation, plan);
  return applyStoryScenesPlan(conversation, {
    includeOpening: legacy.includeOpening,
    scenes: legacy.scenes,
  });
};
