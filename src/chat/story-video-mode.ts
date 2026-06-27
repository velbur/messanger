/** Loop только по явному storyVideoLoop: true — иначе один проход + лёгкий Ken Burns на кадре */
export const inferStoryVideoLoop = (_imagePrompt?: string): boolean => false;

export const resolveStoryVideoLoop = (
  explicit: boolean | undefined,
  _imagePrompt?: string,
): boolean => explicit === true;
