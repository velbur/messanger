/** Текст для TTS: без эмодзи, URL и лишних символов */
export const textForSpeech = (raw) => {
  let text = String(raw ?? "").trim();
  if (!text) {
    return "";
  }

  text = text
    .replace(/:[a-z0-9_+-]+:/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[@#]\S+/g, " ")
    .replace(/[«»""]/g, " ")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  return text;
};

export const isSpeechableText = (raw) => textForSpeech(raw).length > 0;
