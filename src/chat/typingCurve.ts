/** Вес символа в «человечном» наборе: выше = дольше до следующего символа */
const pauseAfter = new Set([",", ".", "!", "?", "…", ":", ";", "—", "–"]);

const charTypingWeight = (char: string, index: number): number => {
  let weight = 1;

  if (char === " ") {
    weight = 0.72;
  } else if (char === "\n") {
    weight = 2.9;
  } else if (pauseAfter.has(char)) {
    weight = 2.3;
  } else if (/\p{Extended_Pictographic}/u.test(char)) {
    weight = 1.2;
  }

  // Микропаузы: лёгкие «задумчивости» на разных позициях (детерминировано)
  if ((index + 1) % 4 === 0) {
    weight += 0.38;
  }
  if ((index * 7 + 5) % 9 === 0) {
    weight += 0.28;
  }
  if ((index * 11 + 2) % 13 === 0) {
    weight += 0.22;
  }

  return weight;
};

/** Сколько символов показать при progress ∈ [0, 1] (неровный темп, микропаузы) */
export const visibleCharCountAtProgress = (progress: number, text: string): number => {
  const chars = [...text];
  const total = chars.length;
  if (total === 0) {
    return 0;
  }

  const t = Math.min(1, Math.max(0, progress));
  if (t >= 1) {
    return total;
  }

  const weights = chars.map((char, index) => charTypingWeight(char, index));
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  const target = t * sum;

  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (acc >= target) {
      return i + 1;
    }
  }

  return total;
};
