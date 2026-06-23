/** Чеклист качества Shorts перед рендером (без LLM). */

export const runShortsPreRenderChecklist = (conversation, {displayTitle = ""} = {}) => {
  const warnings = [];
  const tips = [];
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];

  if (messages.length === 0) {
    return {ok: false, warnings: ["Нет сообщений"], tips: []};
  }

  const firstText = String(messages[0]?.text ?? "").trim();
  if (!firstText && !messages[0]?.image) {
    warnings.push("Первое сообщение без текста и без фото");
  }

  if (!displayTitle?.trim()) {
    warnings.push("Нет названия ролика (displayTitle) — задайте перед публикацией");
  }

  const last = messages[messages.length - 1];
  const lastText = String(last?.text ?? "").trim();
  if (!lastText && !last?.image) {
    warnings.push("Последнее сообщение пустое");
  } else if (lastText.length > 90) {
    warnings.push("Финал длинный — панчлайн лучше в 1 короткой реплике");
  }

  const imageCount = messages.filter((m) => m.image || m.imagePrompt).length;
  if (imageCount > 2) {
    warnings.push(`Много фото (${imageCount}) — для Shorts часто лучше 0–1`);
  }

  if (messages.length > 22) {
    warnings.push(`Много сообщений (${messages.length}) — проверьте удержание`);
  }

  return {ok: warnings.length === 0, warnings, tips};
};
