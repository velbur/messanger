import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const SERIES_DIR = path.join(ROOT, "series");

export const resolveSeriesPath = (inputPath) => {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  if (inputPath.startsWith("series/")) {
    return path.join(ROOT, inputPath);
  }
  return path.join(SERIES_DIR, inputPath);
};

export const seriesContentDir = (seriesId) => path.join(SERIES_DIR, String(seriesId ?? "").trim());
