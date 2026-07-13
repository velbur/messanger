import type {MessageInput} from "./schema";

export type MessageDisplay = "center" | "bubble" | "scene";

type MessageLike = Pick<MessageInput, "text" | "image" | "display">;

export const isSceneMessage = (message: Pick<MessageInput, "display"> | undefined): boolean =>
  message?.display === "scene";

export const resolveMessageDisplay = (
  message: Pick<MessageInput, "display"> | undefined,
): MessageDisplay => {
  if (message?.display === "bubble") {
    return "bubble";
  }
  if (message?.display === "scene") {
    return "scene";
  }
  return "center";
};

export const hasMessageImage = (message: MessageLike): boolean =>
  Boolean(message.image?.trim());

export const messageCaption = (message: MessageLike): string => (message.text ?? "").trim();

export const isTextOnlyMessage = (message: MessageLike): boolean =>
  !hasMessageImage(message) && messageCaption(message).length > 0;

/** Последнее прикреплённое фото в переписке — для JPG-превью */
export const pickThumbnailImageRef = (
  conversation: {messages?: MessageLike[]},
): string | null => {
  const messages = conversation.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const ref = messages[i].image?.trim();
    if (ref) {
      return ref;
    }
  }
  return null;
};
