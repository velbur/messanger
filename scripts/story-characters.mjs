const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export const normalizeStoryCharacter = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const id = normalizeSpace(raw.id);
  const name = normalizeSpace(raw.name);
  const appearance = normalizeSpace(raw.appearance);
  if (!id || !name || !appearance) {
    return null;
  }
  const role = raw.role === "me" || raw.role === "them" || raw.role === "other" ? raw.role : undefined;
  return {id, name, role, appearance};
};

export const getStoryCharacters = (conversation) => {
  const list = conversation?.story?.characters;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(normalizeStoryCharacter).filter(Boolean);
};

export const hasStoryCharacters = (conversation) => getStoryCharacters(conversation).length > 0;

export const findStoryCharacter = (conversation, id) =>
  getStoryCharacters(conversation).find((character) => character.id === id);

export const formatCharacterBible = (conversation) => {
  const characters = getStoryCharacters(conversation);
  if (!characters.length) {
    return "";
  }
  return characters
    .map((character) => {
      const roleHint =
        character.role === "me"
          ? " (я в переписке)"
          : character.role === "them"
            ? " (собеседник)"
            : "";
      return `- ${character.id} — ${character.name}${roleHint}: ${character.appearance}`;
    })
    .join("\n");
};

export const formatCharactersForScene = (conversation, characterIds = []) => {
  const ids = Array.isArray(characterIds) ? characterIds.map((id) => normalizeSpace(id)).filter(Boolean) : [];
  if (!ids.length) {
    return "";
  }
  const lines = ids
    .map((id) => findStoryCharacter(conversation, id))
    .filter(Boolean)
    .map((character) => `${character.name}: ${character.appearance}`);
  return lines.join(" ");
};

export const appendSceneCharacterAppearances = (imagePrompt, conversation, characterIds = []) => {
  const scene = normalizeSpace(imagePrompt);
  const appearances = formatCharactersForScene(conversation, characterIds);
  if (!scene || !appearances) {
    return scene;
  }
  const lower = scene.toLowerCase();
  const alreadyMentioned = getStoryCharacters(conversation)
    .filter((character) => characterIds.includes(character.id))
    .every((character) => lower.includes(character.name.toLowerCase()));
  if (alreadyMentioned) {
    return scene;
  }
  return `${scene} Внешность героев в кадре (строго): ${appearances}`;
};
