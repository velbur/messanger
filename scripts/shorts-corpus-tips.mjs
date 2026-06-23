/** Подсказки из сводки корпуса Shorts для UI. */

export const extractCorpusTips = (summaryMarkdown) => {
  const text = String(summaryMarkdown ?? "").trim();
  if (!text || text.includes("_(Пока пусто")) {
    return [];
  }

  const tips = [];
  const sectionMatch = text.match(/## Типичные приёмы\n([\s\S]*?)(?=\n## |$)/);
  if (sectionMatch) {
    const lines = sectionMatch[1]
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line.length > 20);
    tips.push(...lines.slice(-4));
  }

  const finaleMatch = text.match(/## Тип финала\n([\s\S]*?)(?=\n## |$)/);
  if (finaleMatch) {
    const lines = finaleMatch[1]
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line.length > 20);
    tips.push(...lines.slice(-2));
  }

  return [...new Set(tips)].slice(0, 5);
};
