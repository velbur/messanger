const AUTHOR_LINE = /^\*\*(.+?):\*\*\s*$/;
const TIMESTAMP_LINE = /^\*\*(\d{1,2}:\d{2})\*\*\s*$/;
const TITLE_LINE = /^#\s+(.+)$/;

function sideForAuthor(author) {
  if (author === "Алиса") {
    return "me";
  }
  return "them";
}

export function parseDialogueMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const items = [];
  let partTitle = "";
  let currentAuthor = null;
  let currentTime = null;
  let messageIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const titleMatch = line.match(TITLE_LINE);
    if (titleMatch) {
      partTitle = titleMatch[1].trim();
      continue;
    }

    const timeMatch = line.match(TIMESTAMP_LINE);
    if (timeMatch) {
      currentTime = timeMatch[1];
      items.push({
        id: `ts-${items.length + 1}`,
        type: "timestamp",
        time: currentTime,
      });
      continue;
    }

    const authorMatch = line.match(AUTHOR_LINE);
    if (authorMatch) {
      currentAuthor = authorMatch[1].trim();
      continue;
    }

    const text = line.trim();
    if (!text || !currentAuthor) {
      continue;
    }

    messageIndex += 1;
    const isImage = text.startsWith("[Фото:") && text.endsWith("]");
    items.push({
      id: `msg-${messageIndex}`,
      type: "message",
      author: currentAuthor,
      side: sideForAuthor(currentAuthor),
      text,
      isImage,
      sentAt: currentTime,
    });
  }

  return {partTitle, items};
}
