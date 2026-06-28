import {loadPublicImageDataUrl} from "./image-references.mjs";

const clip = (value, max) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
};

/** Короткое описание сцены для обложки — из сюжета/первых сообщений */
export const resolvePreviewCoverSceneHint = (conversation) => {
  const parts = [];
  const opening = conversation?.story?.opening;
  if (opening?.imagePrompt) {
    parts.push(opening.imagePrompt);
  }
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (const message of messages) {
    if (message?.storyImagePrompt) {
      parts.push(message.storyImagePrompt);
    }
    if (parts.length >= 2) {
      break;
    }
  }
  if (parts.length === 0) {
    if (conversation?.hookText) {
      parts.push(conversation.hookText);
    }
    for (const message of messages) {
      const text = String(message?.text ?? "").trim();
      if (text) {
        parts.push(text);
      }
      if (parts.length >= 3) {
        break;
      }
    }
  }
  return clip(parts.join(". "), 600);
};

/** Найти подходящий кадр-референс (стиль обложки = стиль видео) */
export const resolvePreviewCoverReferenceRef = (conversation) => {
  const opening = conversation?.story?.opening?.image;
  if (opening) {
    return String(opening).trim();
  }
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (const message of messages) {
    const ref = String(message?.storyImage ?? message?.image ?? "").trim();
    if (ref && !/^https?:\/\//i.test(ref)) {
      return ref;
    }
  }
  return null;
};

export const loadPreviewCoverReferenceDataUrl = async (conversation) => {
  const ref = resolvePreviewCoverReferenceRef(conversation);
  if (!ref) {
    return null;
  }
  try {
    return await loadPublicImageDataUrl(ref);
  } catch {
    return null;
  }
};

/**
 * Промпт для генерации цепляющей вертикальной обложки (без текста — заголовок
 * накладывается в Remotion поверх, чтобы оставался чётким).
 */
export const buildPreviewCoverPrompt = ({title, sceneHint, stylePrompt} = {}) => {
  const cleanTitle = clip(title, 160);
  const cleanScene = clip(sceneHint, 600);
  const cleanStyle = clip(stylePrompt, 600);

  const lines = [
    "Vertical 9:16 YouTube thumbnail / cover frame for a short video. Eye-catching, high click-through, cinematic and dramatic.",
    "Single strong focal subject with intense, expressive emotion (surprise, tension, intrigue). Bold dramatic lighting, rich saturated colors, high contrast, subtle vignette, shallow depth of field.",
    "Composition leaves the center area relatively clean and uncluttered so a large title can be overlaid there later.",
    cleanScene ? `Scene context: ${cleanScene}.` : "",
    cleanTitle ? `Mood / topic of the video (do NOT render this as text): ${cleanTitle}.` : "",
    cleanStyle ? `Visual style reference: ${cleanStyle}.` : "",
    "Absolutely NO text, letters, words, numbers, captions, watermarks, logos or UI of any kind anywhere in the image. Pure illustrative/photographic frame only.",
  ];

  return lines.filter(Boolean).join("\n");
};
