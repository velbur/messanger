/** Зацикливание story-видео отключено: один проход + hold на кадре */
export const inferStoryVideoLoop = (_imagePrompt?: string): boolean => false;

export const resolveStoryVideoLoop = (
  _explicit: boolean | undefined,
  _imagePrompt?: string,
): boolean => false;

/** Сбросить storyVideoLoop в conversation (устаревшие true из старых JSON) */
export const normalizeStoryVideoLoopFlags = (conversation: {
  story?: {opening?: {storyVideoLoop?: boolean}};
  messages?: Array<{storyVideoLoop?: boolean}>;
}) => {
  if (conversation.story?.opening) {
    delete conversation.story.opening.storyVideoLoop;
  }
  for (const message of conversation.messages ?? []) {
    delete message.storyVideoLoop;
  }
};
