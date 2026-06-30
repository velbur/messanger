import type {ConversationInput} from "./schema";

export const VIDEO_LAYOUT_BUNDLE_MARKER = "video-horizontal-layout-v1";

void VIDEO_LAYOUT_BUNDLE_MARKER;

export type VideoTextMode = "chat" | "narration";

export type VideoConfig = {
  textMode: VideoTextMode;
};

export const VIDEO_COMPOSITION = {
  width: 1920,
  height: 1080,
} as const;

const DEFAULT_VIDEO: VideoConfig = {
  textMode: "narration",
};

export const isVideoLayout = (conversation: ConversationInput): boolean =>
  conversation.layout === "video";

export const mergeVideoConfig = (conversation: ConversationInput): VideoConfig => {
  const raw = conversation.video;
  const textMode = raw?.textMode === "chat" ? "chat" : "narration";
  return {...DEFAULT_VIDEO, textMode};
};

export const isVideoChatMode = (conversation: ConversationInput): boolean =>
  isVideoLayout(conversation) && mergeVideoConfig(conversation).textMode === "chat";

export const isVideoNarrationMode = (conversation: ConversationInput): boolean =>
  isVideoLayout(conversation) && mergeVideoConfig(conversation).textMode === "narration";

export const getCompositionDimensions = (
  conversation: ConversationInput,
): {width: number; height: number} =>
  isVideoLayout(conversation)
    ? {width: VIDEO_COMPOSITION.width, height: VIDEO_COMPOSITION.height}
    : {width: 1080, height: 1920};

/** Убираем story-кадры — в Video остаются фото в пузырях чата, как в Shorts. */
export const stripVideoLayoutAssets = (conversation: ConversationInput): ConversationInput => {
  if (!isVideoLayout(conversation)) {
    return conversation;
  }

  return {
    ...conversation,
    story: undefined,
    hookText: undefined,
    messages: conversation.messages.map((message) => {
      const next = {...message};
      delete next.storyImage;
      delete next.storyImagePrompt;
      delete next.storyVideo;
      delete next.storyVideoDurationMs;
      delete next.storyVideoProfile;
      delete next.storyVideoLoop;
      delete next.storySfx;
      return next;
    }),
  };
};
