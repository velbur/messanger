/** Убирает LLM-плейсхолдеры в квадратных скобках из текста сообщения. */
export const sanitizeMessageText = (text: string | undefined): string =>
  String(text ?? "")
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
