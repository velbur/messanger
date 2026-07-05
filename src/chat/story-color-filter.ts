export type StoryColorFilter =
  | "none"
  | "warm"
  | "cold"
  | "cinematic"
  | "vintage"
  | "noir"
  | "vivid";

export const DEFAULT_STORY_COLOR_FILTER: StoryColorFilter = "none";

export const STORY_COLOR_FILTER_OPTIONS: ReadonlyArray<{
  id: StoryColorFilter;
  label: string;
}> = [
  {id: "none", label: "Без фильтра"},
  {id: "warm", label: "Тёплый"},
  {id: "cold", label: "Холодный"},
  {id: "cinematic", label: "Кино"},
  {id: "vintage", label: "Винтаж"},
  {id: "noir", label: "Нуар"},
  {id: "vivid", label: "Яркий"},
];

const CSS_BY_FILTER: Record<StoryColorFilter, string | undefined> = {
  none: undefined,
  warm: "sepia(0.16) saturate(1.22) hue-rotate(-10deg) brightness(1.04)",
  cold: "saturate(0.9) hue-rotate(14deg) brightness(0.97) contrast(1.08)",
  cinematic: "contrast(1.14) saturate(1.06) brightness(0.95) hue-rotate(-6deg)",
  vintage: "sepia(0.32) contrast(0.9) saturate(0.82) brightness(1.04)",
  noir: "grayscale(0.88) contrast(1.28) brightness(0.9)",
  vivid: "saturate(1.38) contrast(1.1) brightness(1.03)",
};

export const coerceStoryColorFilter = (value: unknown): StoryColorFilter => {
  if (typeof value === "string" && value in CSS_BY_FILTER) {
    return value as StoryColorFilter;
  }
  return DEFAULT_STORY_COLOR_FILTER;
};

export const storyColorFilterCss = (filter: StoryColorFilter): string | undefined =>
  CSS_BY_FILTER[coerceStoryColorFilter(filter)];
