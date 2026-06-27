import type {ConversationInput} from "./schema";
import {msToFrames} from "./fps";

/** Обложка-превью идёт ровно durationMs — без TIMING_SCALE переписки */

export type PreviewCoverConfig = {
  enabled: boolean;
  image: string;
  title: string;
  durationMs: number;
};

export const DEFAULT_PREVIEW_COVER_MS = 3000;

/** Маркер обложки в bundle — обновить в scripts/bundle-cache.mjs */
export const PREVIEW_COVER_BUNDLE_MARKER = "preview-cover-v1";

export const mergePreviewCover = (conversation: ConversationInput): PreviewCoverConfig => {
  const cover = conversation.previewCover;
  const image = String(cover?.image ?? "").trim();
  const title = String(cover?.title ?? "").trim();
  return {
    enabled: Boolean(cover?.enabled && image),
    image,
    title,
    durationMs: cover?.durationMs ?? DEFAULT_PREVIEW_COVER_MS,
  };
};

export const previewCoverDurationFrames = (cover: PreviewCoverConfig): number =>
  cover.enabled ? msToFrames(cover.durationMs) : 0;
