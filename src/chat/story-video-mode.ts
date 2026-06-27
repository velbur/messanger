/** Сцены с линейным движением — loop выглядит нелепо; держим последний кадр + лёгкий Ken Burns */
const FORWARD_MOTION_RE =
  /(лестниц|ступен|подним|спуск|ид[ёе]т|шаг|вперёд|проход|коридор|подход|walk|climb|stair|forward|ascend|descend|approach)/i;

export const inferStoryVideoLoop = (imagePrompt?: string): boolean =>
  !FORWARD_MOTION_RE.test(String(imagePrompt ?? "").trim());

export const resolveStoryVideoLoop = (
  explicit: boolean | undefined,
  imagePrompt?: string,
): boolean => (explicit === undefined ? inferStoryVideoLoop(imagePrompt) : explicit);
