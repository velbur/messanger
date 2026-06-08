import type {MessageInput} from "./schema";

type MessageLike = Pick<MessageInput, "text" | "image">;

export const hasMessageImage = (message: MessageLike): boolean =>
  Boolean(message.image?.trim());

export const messageCaption = (message: MessageLike): string => (message.text ?? "").trim();

export const isTextOnlyMessage = (message: MessageLike): boolean =>
  !hasMessageImage(message) && messageCaption(message).length > 0;
