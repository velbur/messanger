import catalogData from "./data/sfx-catalog.json";
import {msToFrames} from "./fps";

export const SFX_CATALOG_VERSION = catalogData.version;
export const SFX_BUNDLE_MARKER = `sfx-catalog-v${SFX_CATALOG_VERSION}`;
export const SFX_MIX_BUNDLE_MARKER = "story-sfx-mix-v1";

export type SfxCatalogItem = {
  id: string;
  tags: string[];
  loop: boolean;
  defaultVolume: number;
  path: string;
  /** Длительность WAV, мс — для зацикливания при рендере */
  durationMs?: number;
};

export type StorySfxCueInput = {
  id: string;
  volume?: number;
  pan?: number;
  loop?: boolean;
  delayMs?: number;
};

export type ResolvedStorySfxCue = {
  id: string;
  path: string;
  volume: number;
  loop: boolean;
  delayFrames: number;
  pan: number;
  durationMs: number;
};

export const SFX_CATALOG: SfxCatalogItem[] = catalogData.items;

const catalogMap = new Map(SFX_CATALOG.map((item) => [item.id, item]));

export const getSfxCatalogItem = (id: string): SfxCatalogItem | undefined => catalogMap.get(id);

export const sfxPathForId = (id: string): string | undefined => catalogMap.get(id)?.path;

export type StorySfxConfig = {
  enabled: boolean;
  profile?: string;
  masterVolume: number;
};

const DEFAULT_STORY_SFX: StorySfxConfig = {
  enabled: false,
  masterVolume: 2.4,
};

export const STORY_SFX_PROFILE = "catalog-v2-selective";

/** Минимум совпадений тегов для эвристики — иначе тишина */
export const SFX_MIN_HEURISTIC_SCORE = 2;

export const mergeStorySfxConfig = (
  conversation: {story?: {sfx?: Partial<StorySfxConfig>}},
): StorySfxConfig => {
  const raw = conversation.story?.sfx;
  return {
    enabled: raw?.enabled === true,
    profile: raw?.profile?.trim() || undefined,
    masterVolume: raw?.masterVolume ?? DEFAULT_STORY_SFX.masterVolume,
  };
};

export const resolveStorySfxCues = (
  cues: StorySfxCueInput[] | undefined,
): ResolvedStorySfxCue[] => {
  if (!cues?.length) {
    return [];
  }

  const resolved: ResolvedStorySfxCue[] = [];
  for (const cue of cues) {
    const id = cue.id?.trim();
    if (!id) {
      continue;
    }
    const item = catalogMap.get(id);
    if (!item) {
      continue;
    }
    resolved.push({
      id,
      path: item.path,
      volume: cue.volume ?? item.defaultVolume,
      loop: cue.loop ?? item.loop,
      delayFrames: msToFrames(cue.delayMs ?? 0),
      pan: cue.pan ?? 0,
      durationMs: item.durationMs ?? (item.loop ? 10_000 : 3_000),
    });
  }
  return resolved;
};
