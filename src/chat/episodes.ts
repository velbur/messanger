import type {ConversationInput} from "./schema";

export type EpisodesConfig = {
  enabled?: boolean;
  /** Индекс последнего сообщения эпизода (включительно, 0-based). Последний эпизод — до конца переписки. */
  splitAfter?: number[];
};

/** Равномерные границы эпизодов для N частей. */
export const computeEqualEpisodeSplits = (
  messageCount: number,
  episodeCount: number,
): number[] => {
  if (episodeCount <= 1 || messageCount <= 1) {
    return [];
  }
  const splits: number[] = [];
  for (let part = 1; part < episodeCount; part += 1) {
    const end = Math.floor((part * messageCount) / episodeCount) - 1;
    const prev = splits[splits.length - 1] ?? -1;
    splits.push(Math.max(prev + 1, Math.min(end, messageCount - 2)));
  }
  return splits;
};

export const resolveEpisodeCount = (config: EpisodesConfig | undefined): number => {
  if (!config?.enabled) {
    return 1;
  }
  const splits = config.splitAfter ?? [];
  return splits.length + 1;
};

export const validateEpisodeSplits = (
  messageCount: number,
  splitAfter: number[] | undefined,
): string | null => {
  if (!splitAfter?.length) {
    return messageCount < 2 ? "Для эпизодов нужно минимум 2 сообщения" : null;
  }
  let prev = -1;
  for (const index of splitAfter) {
    if (!Number.isInteger(index) || index < 0) {
      return "Границы эпизодов должны быть целыми числами ≥ 0";
    }
    if (index <= prev) {
      return "Границы эпизодов должны идти по возрастанию";
    }
    if (index >= messageCount - 1) {
      return "Последний эпизод должен содержать хотя бы одно сообщение";
    }
    prev = index;
  }
  return null;
};

/** Заголовок на обложке превью: для эпизодов добавляет «Часть N». */
export const buildPreviewCoverTitle = (
  baseTitle: string,
  episodeNumber: number,
  totalEpisodes: number,
): string => {
  const base = String(baseTitle ?? "").replace(/\s+/g, " ").trim();
  if (totalEpisodes <= 1) {
    return base;
  }
  const part = `Часть ${episodeNumber}`;
  return base ? `${base}\n${part}` : part;
};

export const buildEpisodeConversations = (conversation: ConversationInput): ConversationInput[] => {
  const config = conversation.episodes;
  if (!config?.enabled) {
    return [conversation];
  }

  const messages = conversation.messages;
  const splitAfter = config.splitAfter ?? [];
  const error = validateEpisodeSplits(messages.length, splitAfter);
  if (error || splitAfter.length === 0) {
    return [conversation];
  }

  const boundaries = [...splitAfter, messages.length - 1];
  const total = boundaries.length;
  const episodes: ConversationInput[] = [];
  let start = 0;

  for (let i = 0; i < boundaries.length; i += 1) {
    const end = boundaries[i];
    episodes.push(sliceConversationForEpisode(conversation, start, end, i + 1, total));
    start = end + 1;
  }

  return episodes;
};

const sliceConversationForEpisode = (
  conversation: ConversationInput,
  startIndex: number,
  endIndex: number,
  episodeNumber: number,
  totalEpisodes: number,
): ConversationInput => {
  const isFirst = episodeNumber === 1;
  const sliced: ConversationInput = {
    ...conversation,
    messages: conversation.messages.slice(startIndex, endIndex + 1),
    episodes: undefined,
  };

  if (!isFirst) {
    if (sliced.intro) {
      sliced.intro = {...sliced.intro, enabled: false};
    }
    if (sliced.story?.opening) {
      sliced.story = {
        ...sliced.story,
        opening: {
          durationMs: 800,
          animation: "none",
        },
      };
    }
    if (totalEpisodes > 1) {
      sliced.hookText = `Часть ${episodeNumber}`;
    }
  }

  const cover = conversation.previewCover;
  if (cover?.image?.trim()) {
    sliced.previewCover = {
      ...cover,
      enabled: cover.enabled !== false,
    };
  }

  return sliced;
};
