import os from "node:os";

export const parsePositiveInt = (raw, fallback) => {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Число параллельных CPU-задач (parallax bake и т.п.) */
export const resolveWorkerConcurrency = (
  envKey,
  {defaultMin = 2, defaultMax = 6} = {},
) => {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) {
    return parsePositiveInt(fromEnv, defaultMax);
  }
  const cpus = os.availableParallelism?.() ?? os.cpus().length;
  return Math.max(defaultMin, Math.min(defaultMax, Math.max(1, cpus - 1)));
};

/** Пул воркеров: не более `concurrency` одновременных `worker(item, index)`. */
export const runWithConcurrency = async (items, concurrency, worker) => {
  if (items.length === 0) {
    return [];
  }

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({length: limit}, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) {
          break;
        }
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
};
