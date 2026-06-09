const jsonInput = document.getElementById("jsonInput");
const btnExample = document.getElementById("btnExample");
const btnRender = document.getElementById("btnRender");
const statusPanel = document.getElementById("statusPanel");
const statusText = document.getElementById("statusText");
const renderProgressBlock = document.getElementById("renderProgressBlock");
const renderProgressTrack = document.getElementById("renderProgressTrack");
const renderProgressBar = document.getElementById("renderProgressBar");
const renderProgressLabel = document.getElementById("renderProgressLabel");
const btnStopRender = document.getElementById("btnStopRender");
const statusLog = document.getElementById("statusLog");
const renderCommandBlock = document.getElementById("renderCommandBlock");
const renderCommandEl = document.getElementById("renderCommand");
const btnCopyRenderCommand = document.getElementById("btnCopyRenderCommand");
const downloadBlock = document.getElementById("downloadBlock");
const downloadLink = document.getElementById("downloadLink");
const pathsHint = document.getElementById("pathsHint");
const wallpaperInputs = document.querySelectorAll('input[name="wallpaper"]');
const musicSelect = document.getElementById("musicSelect");
const renderTargetRow = document.getElementById("renderTargetRow");
const renderTargetSelect = document.getElementById("renderTargetSelect");
const introEnabled = document.getElementById("introEnabled");
const introTextInput = document.getElementById("introTextInput");
const endCardEnabled = document.getElementById("endCardEnabled");
const endCardTextInput = document.getElementById("endCardTextInput");
const dialoguePanel = document.getElementById("dialoguePanel");
const dialogueEditor = document.getElementById("dialogueEditor");
const btnRefreshDialogue = document.getElementById("btnRefreshDialogue");
const tabBtnChat = document.getElementById("tabBtnChat");
const tabBtnLibrary = document.getElementById("tabBtnLibrary");
const tabBtnPrompt = document.getElementById("tabBtnPrompt");
const tabBtnApi = document.getElementById("tabBtnApi");
const tabPanelChat = document.getElementById("tabPanelChat");
const tabPanelLibrary = document.getElementById("tabPanelLibrary");
const tabPanelPrompt = document.getElementById("tabPanelPrompt");
const tabPanelApi = document.getElementById("tabPanelApi");
const apiStatusContent = document.getElementById("apiStatusContent");
const btnRefreshApiStatus = document.getElementById("btnRefreshApiStatus");
const dialogueTitleInput = document.getElementById("dialogueTitleInput");
const dialoguePathsHint = document.getElementById("dialoguePathsHint");
const dialogueSaveStatus = document.getElementById("dialogueSaveStatus");
const btnSaveDialogue = document.getElementById("btnSaveDialogue");
const btnNewDialogue = document.getElementById("btnNewDialogue");
const dialoguesList = document.getElementById("dialoguesList");
const btnRefreshLibrary = document.getElementById("btnRefreshLibrary");
const stylePromptInput = document.getElementById("stylePromptInput");
const btnSaveStylePrompt = document.getElementById("btnSaveStylePrompt");
const stylePromptStatus = document.getElementById("stylePromptStatus");
const imageLightbox = document.getElementById("imageLightbox");
const lightboxImg = document.getElementById("lightboxImg");

let scanImagesTimer = null;
let pollTimer = null;
let activeRenderJobId = null;
let klingConfigured = false;
let klingImageAvailable = false;
let klingAccountHint = "";
let grokConfigured = false;
let grokImageAvailable = false;
let grokModel = "grok-4";
let grokImageModel = "grok-imagine-image-quality";

const IMAGE_PROVIDER_STORAGE_KEY = "chat-video-image-provider";

const getDefaultImageProvider = () => {
  try {
    const saved = localStorage.getItem(IMAGE_PROVIDER_STORAGE_KEY);
    if (saved === "grok" || saved === "kling") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "kling";
};

const saveDefaultImageProvider = (provider) => {
  try {
    localStorage.setItem(IMAGE_PROVIDER_STORAGE_KEY, provider === "grok" ? "grok" : "kling");
  } catch {
    /* ignore */
  }
};

const getImageProvider = (messageIndex) => {
  if (typeof messageIndex === "number") {
    const selected = document.querySelector(
      `input[name="imageProvider-${messageIndex}"]:checked`,
    );
    if (selected) {
      return selected.value === "grok" ? "grok" : "kling";
    }
  }
  return getDefaultImageProvider();
};

const resolveProviderForNewSlot = () => {
  let provider = getDefaultImageProvider();
  const klingOk = klingConfigured && klingImageAvailable;
  const grokOk = grokImageAvailable;
  if (provider === "kling" && !klingOk && grokOk) {
    provider = "grok";
  } else if (provider === "grok" && !grokOk && klingOk) {
    provider = "kling";
  }
  return provider;
};

const canGenerateImages = (provider) => {
  if (provider === "grok") {
    return grokImageAvailable;
  }
  return klingConfigured && klingImageAvailable;
};

const getImageProviderUnavailableHint = (provider) => {
  if (provider === "grok") {
    return grokConfigured
      ? `Grok Imagine (${grokImageModel}) недоступен`
      : "Grok: задайте XAI_API_KEY в docs/.env";
  }
  return klingAccountHint || "Kling: нет пакета Image или ключей не заданы";
};

const updateSlotImageProviderControls = (messageIndex) => {
  const slot = document.querySelector(`[data-image-slot-index="${messageIndex}"]`);
  if (!slot) {
    return;
  }
  const provider = getImageProvider(messageIndex);
  const available = canGenerateImages(provider);
  const label = provider === "grok" ? "Grok" : "Kling";

  for (const btn of slot.querySelectorAll("[data-action='generate-image']")) {
    btn.disabled = !available;
    if (!available) {
      btn.title = getImageProviderUnavailableHint(provider);
    } else {
      btn.title =
        provider === "grok"
          ? `Генерация через Grok Imagine (${grokImageModel})`
          : "Генерация через Kling";
    }
    if (btn.dataset.generateLabel === "primary") {
      const hasFile = slot.classList.contains("image-slot--ok");
      btn.textContent = hasFile ? `Сгенерировать (${label})` : `Сгенерировать (${label})`;
    }
  }
};

const updateImageProviderControls = () => {
  for (const slot of document.querySelectorAll("[data-image-slot-index]")) {
    const index = Number(slot.dataset.imageSlotIndex);
    if (!Number.isNaN(index)) {
      updateSlotImageProviderControls(index);
    }
  }
};

const createImageProviderPicker = (messageIndex) => {
  const row = document.createElement("div");
  row.className = "image-slot__provider";

  const label = document.createElement("span");
  label.className = "image-slot__provider-label";
  label.textContent = "Генерация:";

  const group = document.createElement("div");
  group.className = "image-slot__provider-options";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Сервис генерации для этого кадра");

  const defaultProvider = resolveProviderForNewSlot();
  const options = [
    {
      value: "kling",
      text: "Kling",
      ok: klingConfigured && klingImageAvailable,
    },
    {value: "grok", text: "Grok Imagine", ok: grokImageAvailable},
  ];

  for (const opt of options) {
    const lab = document.createElement("label");
    lab.className = "image-slot__provider-option";
    if (!opt.ok) {
      lab.classList.add("image-slot__provider-option--disabled");
    }
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `imageProvider-${messageIndex}`;
    input.value = opt.value;
    input.checked = defaultProvider === opt.value;
    input.disabled = !opt.ok;
    input.addEventListener("change", () => {
      saveDefaultImageProvider(getImageProvider(messageIndex));
      updateSlotImageProviderControls(messageIndex);
    });
    lab.append(input, document.createTextNode(` ${opt.text}`));
    group.append(lab);
  }

  row.append(label, group);
  return row;
};
let defaultMusicId = "romantic.mp3";
let currentDialogueId = null;
let currentDialogueOutputFile = null;

const getStylePrompt = () => stylePromptInput.value.trim();

const setDialogueSaveStatus = (text, isError = false) => {
  if (!dialogueSaveStatus) {
    return;
  }
  dialogueSaveStatus.textContent = text;
  dialogueSaveStatus.classList.toggle("editor-save-status--error", isError);
};

const setActiveTab = (tabId) => {
  const panels = {
    chat: tabPanelChat,
    library: tabPanelLibrary,
    prompt: tabPanelPrompt,
    api: tabPanelApi,
  };
  const buttons = {
    chat: tabBtnChat,
    library: tabBtnLibrary,
    prompt: tabBtnPrompt,
    api: tabBtnApi,
  };

  for (const [id, panel] of Object.entries(panels)) {
    const active = id === tabId;
    panel.classList.toggle("tab-panel--active", active);
    panel.hidden = !active;
    buttons[id].classList.toggle("tabs__btn--active", active);
    buttons[id].setAttribute("aria-selected", String(active));
  }

  if (tabId === "library") {
    loadDialoguesList();
  }
  if (tabId === "api") {
    loadApiStatus();
  }
};

tabBtnChat.addEventListener("click", () => setActiveTab("chat"));
tabBtnLibrary.addEventListener("click", () => setActiveTab("library"));
tabBtnPrompt.addEventListener("click", () => setActiveTab("prompt"));
tabBtnApi.addEventListener("click", () => setActiveTab("api"));

const CYRILLIC_TO_LATIN = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const transliterateProjectName = (value) =>
  String(value)
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");

const slugifyProjectName = (value) => {
  const base = transliterateProjectName(value)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 48) || "render";
};

const updateProjectPathsHint = () => {
  if (currentDialogueOutputFile) {
    const base = currentDialogueOutputFile.replace(/\.mp4$/i, "");
    dialoguePathsHint.textContent = `Файлы: json/${base}.json, out/${currentDialogueOutputFile}`;
    return;
  }

  const raw = dialogueTitleInput.value.trim();
  if (!raw) {
    dialoguePathsHint.textContent =
      "В базе и в файлах рендера: json/<имя>.json, out/<имя>.mp4 (латиница или кириллица, например vagon)";
    return;
  }
  const slug = slugifyProjectName(raw);
  dialoguePathsHint.textContent = `Файлы: json/${slug}.json, out/${slug}.mp4`;
};

dialogueTitleInput.addEventListener("input", updateProjectPathsHint);

const applyDialogueToEditor = (dialogue) => {
  jsonInput.value = JSON.stringify(dialogue.conversation, null, 2);
  dialogueTitleInput.value = dialogue.title ?? "";
  currentDialogueOutputFile = dialogue.outputFile ?? null;
  updateProjectPathsHint();
  setWallpaper(dialogue.wallpaper === "dark" ? "dark" : "default");
  if (dialogue.music === "none") {
    setMusicId("none");
  } else if (dialogue.music) {
    setMusicId(dialogue.music);
  }
  setDialogueSaveStatus(
    currentDialogueId
      ? `Открыт диалог · обновлён ${formatDate(dialogue.updatedAt)}`
      : "",
  );
  syncTitleCardFieldsFromJson();
};

const formatDate = (ts) => {
  if (!ts) {
    return "";
  }
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const openDialogue = async (id) => {
  const res = await fetch(`/api/dialogues/${id}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось открыть диалог");
  }
  currentDialogueId = data.id;
  applyDialogueToEditor(data);
  setActiveTab("chat");
  await refreshDialogue();
};

const saveCurrentDialogue = async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    setDialogueSaveStatus("Нет JSON для сохранения", true);
    return null;
  }

  const payload = {
    title: dialogueTitleInput.value.trim() || undefined,
    json,
    wallpaper: getWallpaper(),
    music: getMusicId(),
  };

  const url = currentDialogueId ? `/api/dialogues/${currentDialogueId}` : "/api/dialogues";
  const method = currentDialogueId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка сохранения");
  }

  currentDialogueId = data.id;
  dialogueTitleInput.value = data.title ?? dialogueTitleInput.value;
  setDialogueSaveStatus(`Сохранено ${formatDate(data.updatedAt)}`);
  return data;
};

const newDialogue = () => {
  currentDialogueId = null;
  currentDialogueOutputFile = null;
  dialogueTitleInput.value = "";
  updateProjectPathsHint();
  jsonInput.value = "";
  setDialogueSaveStatus("Новый диалог — вставьте JSON и нажмите «Сохранить»");
  dialoguePanel.hidden = true;
  dialogueEditor.replaceChildren();
};

const renderDialogueListItem = (item) => {
  const card = document.createElement("article");
  card.className = "dialogue-library-card";

  const head = document.createElement("div");
  head.className = "dialogue-library-card__head";
  const title = document.createElement("h3");
  title.className = "dialogue-library-card__title";
  title.textContent = item.title || item.contactName || "Без названия";
  head.append(title);

  const meta = document.createElement("p");
  meta.className = "dialogue-library-card__meta";
  meta.textContent = `${item.contactName || "—"} · ${item.messageCount ?? 0} сообщ. · ${formatDate(item.updatedAt)}`;

  const actions = document.createElement("div");
  actions.className = "dialogue-library-card__actions";

  const btnOpen = document.createElement("button");
  btnOpen.type = "button";
  btnOpen.className = "btn btn-primary btn-small";
  btnOpen.textContent = "Открыть";
  btnOpen.addEventListener("click", async () => {
    try {
      await openDialogue(item.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn btn-danger btn-small";
  btnDelete.textContent = "Удалить";
  btnDelete.addEventListener("click", async () => {
    if (!window.confirm(`Удалить «${item.title}» из базы?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/dialogues/${item.id}`, {method: "DELETE"});
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Ошибка удаления");
      }
      if (currentDialogueId === item.id) {
        newDialogue();
      }
      await loadDialoguesList();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  actions.append(btnOpen, btnDelete);

  if (item.downloadUrl) {
    const link = document.createElement("a");
    link.className = "dialogue-library-card__video";
    link.href = item.downloadUrl;
    link.textContent = `MP4: ${item.outputFile}`;
    link.target = "_blank";
    card.append(head, meta, link, actions);
  } else {
    card.append(head, meta, actions);
  }

  return card;
};

const fetchDialoguesList = async () => {
  const res = await fetch("/api/dialogues");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка загрузки списка");
  }
  return data.dialogues ?? [];
};

const renderDialoguesList = (dialogues) => {
  if (!dialoguesList) {
    return;
  }
  dialoguesList.replaceChildren();
  if (!dialogues.length) {
    const empty = document.createElement("p");
    empty.className = "dialogues-list__empty";
    empty.textContent = "Пока нет сохранённых диалогов. Создайте в редакторе и нажмите «Сохранить».";
    dialoguesList.append(empty);
    return;
  }
  for (const item of dialogues) {
    dialoguesList.append(renderDialogueListItem(item));
  }
};

const loadDialoguesList = async () => {
  try {
    const dialogues = await fetchDialoguesList();
    renderDialoguesList(dialogues);
  } catch (err) {
    if (!dialoguesList) {
      return;
    }
    dialoguesList.replaceChildren();
    const errEl = document.createElement("p");
    errEl.className = "dialogues-list__empty";
    errEl.textContent = err instanceof Error ? err.message : String(err);
    dialoguesList.append(errEl);
  }
};

/** При старте открыть последний сохранённый диалог (по updated_at). */
const loadLatestDialogueOnStartup = async () => {
  try {
    const dialogues = await fetchDialoguesList();
    renderDialoguesList(dialogues);
    if (dialogues.length > 0) {
      await openDialogue(dialogues[0].id);
      return;
    }
  } catch {
    /* пустой редактор */
  }
  scheduleRefreshDialogue();
};

btnSaveDialogue.addEventListener("click", async () => {
  btnSaveDialogue.disabled = true;
  try {
    await saveCurrentDialogue();
    await loadDialoguesList();
  } catch (err) {
    setDialogueSaveStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    btnSaveDialogue.disabled = false;
  }
});

btnNewDialogue.addEventListener("click", newDialogue);
btnRefreshLibrary.addEventListener("click", loadDialoguesList);

const openLightbox = (src) => {
  if (!src) {
    return;
  }
  lightboxImg.src = src;
  imageLightbox.hidden = false;
  imageLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
};

const closeLightbox = () => {
  imageLightbox.hidden = true;
  imageLightbox.setAttribute("aria-hidden", "true");
  lightboxImg.removeAttribute("src");
  document.body.classList.remove("lightbox-open");
};

imageLightbox.querySelector(".lightbox__backdrop")?.addEventListener("click", closeLightbox);
imageLightbox.querySelector(".lightbox__close")?.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imageLightbox.hidden) {
    closeLightbox();
  }
});

const loadStylePrompt = async () => {
  try {
    const res = await fetch("/api/prompts/image-style");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить промпт");
    }
    stylePromptInput.value = data.content ?? "";
  } catch (err) {
    stylePromptStatus.textContent =
      err instanceof Error ? err.message : "Ошибка загрузки промпта";
  }
};

const saveStylePrompt = async () => {
  const content = getStylePrompt();
  if (!content) {
    stylePromptStatus.textContent = "Промпт не может быть пустым";
    return;
  }
  btnSaveStylePrompt.disabled = true;
  stylePromptStatus.textContent = "Сохранение…";
  try {
    const res = await fetch("/api/prompts/image-style", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({content}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка сохранения");
    }
    stylePromptInput.value = data.content ?? content;
    stylePromptStatus.textContent =
      "Сохранено. Для старых кадров — «Промпт от Grok» заново или очистите промпт кадра.";
    await refreshDialogue();
  } catch (err) {
    stylePromptStatus.textContent = err instanceof Error ? err.message : String(err);
  } finally {
    btnSaveStylePrompt.disabled = false;
  }
};

btnSaveStylePrompt.addEventListener("click", saveStylePrompt);

const getWallpaper = () => {
  const checked = document.querySelector('input[name="wallpaper"]:checked');
  return checked?.value === "dark" ? "dark" : "default";
};

const setWallpaper = (mode) => {
  for (const input of wallpaperInputs) {
    input.checked = input.value === mode;
  }
};

const syncWallpaperFromJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (parsed.wallpaper === "dark" || parsed.wallpaper === "default") {
      setWallpaper(parsed.wallpaper);
    }
  } catch {
    /* ignore invalid JSON */
  }
};

const getMusicId = () => musicSelect.value;

const setMusicId = (id) => {
  if ([...musicSelect.options].some((o) => o.value === id)) {
    musicSelect.value = id;
  }
};

const syncMusicFromJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (parsed.music?.enabled === false) {
      setMusicId("none");
      return;
    }
    const src = parsed.music?.src;
    if (src) {
      const file = src.split("/").pop();
      if (file) {
        setMusicId(file);
      }
    }
  } catch {
    /* ignore invalid JSON */
  }
};

const loadMusicTracks = async () => {
  try {
    const res = await fetch("/api/audio");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить треки");
    }

    defaultMusicId = data.defaultId ?? defaultMusicId;
    musicSelect.replaceChildren();

    const none = document.createElement("option");
    none.value = "none";
    none.textContent = "Без музыки";
    musicSelect.append(none);

    for (const track of data.tracks ?? []) {
      const opt = document.createElement("option");
      opt.value = track.id;
      opt.textContent = track.label;
      musicSelect.append(opt);
    }

    setMusicId(defaultMusicId);
  } catch (err) {
    musicSelect.replaceChildren();
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = err instanceof Error ? err.message : "Ошибка загрузки";
    musicSelect.append(opt);
  }
};

const getRenderTarget = () =>
  renderTargetSelect && renderTargetSelect.value ? renderTargetSelect.value : "local";

const loadRenderTargets = async () => {
  if (!renderTargetSelect || !renderTargetRow) {
    return;
  }
  try {
    const res = await fetch("/api/render-targets");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить цели рендера");
    }
    const targets = data.targets ?? [];

    // Селектор нужен, только если есть удалённый воркер (иначе всегда локально)
    if (targets.length <= 1) {
      renderTargetRow.hidden = true;
      return;
    }
    renderTargetSelect.replaceChildren();
    for (const target of targets) {
      const opt = document.createElement("option");
      opt.value = target.id;
      opt.textContent = target.label;
      renderTargetSelect.append(opt);
    }
    renderTargetSelect.value = data.defaultTarget ?? "local";
    renderTargetRow.hidden = false;
  } catch {
    renderTargetRow.hidden = true;
  }
};

const setJsonImage = (messageIndex, publicPath) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages) || !parsed.messages[messageIndex]) {
      return;
    }
    parsed.messages[messageIndex].image = publicPath;
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const setJsonImagePrompt = (messageIndex, imagePrompt) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages) || !parsed.messages[messageIndex]) {
      return;
    }
    const trimmed = String(imagePrompt ?? "").trim();
    if (trimmed) {
      parsed.messages[messageIndex].imagePrompt = trimmed;
    } else {
      delete parsed.messages[messageIndex].imagePrompt;
    }
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const setJsonImageEditPrompt = (messageIndex, imageEditPrompt) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages) || !parsed.messages[messageIndex]) {
      return;
    }
    const trimmed = String(imageEditPrompt ?? "").trim();
    if (trimmed) {
      parsed.messages[messageIndex].imageEditPrompt = trimmed;
    } else {
      delete parsed.messages[messageIndex].imageEditPrompt;
    }
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const imagePromptSaveTimers = new Map();
const imageEditPromptSaveTimers = new Map();

const isImageUrl = (ref) => /^https?:\/\//i.test(String(ref ?? "").trim());

const parseConversationJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

let titleCardSyncTimer = null;

const syncTitleCardFieldsFromJson = () => {
  const parsed = parseConversationJson();
  if (!parsed || !introEnabled) {
    return;
  }
  introEnabled.checked = Boolean(parsed.intro?.enabled);
  introTextInput.value = parsed.intro?.text ?? "";
  endCardEnabled.checked = Boolean(parsed.endCard?.enabled);
  endCardTextInput.value = parsed.endCard?.text ?? "";
};

const applyTitleCardFieldsToJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }

  const introText = introTextInput.value.trim();
  if (introEnabled.checked && introText) {
    parsed.intro = {enabled: true, text: introText, durationMs: 5000};
  } else {
    delete parsed.intro;
  }

  const endText = endCardTextInput.value.trim();
  if (endCardEnabled.checked && endText) {
    parsed.endCard = {enabled: true, text: endText, durationMs: 5000};
  } else {
    delete parsed.endCard;
  }

  jsonInput.value = JSON.stringify(parsed, null, 2);
};

const scheduleApplyTitleCards = () => {
  if (titleCardSyncTimer) {
    clearTimeout(titleCardSyncTimer);
  }
  titleCardSyncTimer = setTimeout(() => {
    titleCardSyncTimer = null;
    applyTitleCardFieldsToJson();
  }, 300);
};

const addImageToMessage = (messageIndex) => {
  try {
    const parsed = parseConversationJson();
    if (!parsed?.messages?.[messageIndex]) {
      return;
    }
    if (parsed.messages[messageIndex].image?.trim()) {
      return;
    }
    parsed.messages[messageIndex].image = `images/msg-${messageIndex + 1}.png`;
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const removeImageFromMessage = async (messageIndex, {deleteFile = false, item} = {}) => {
  const parsed = parseConversationJson();
  const message = parsed?.messages?.[messageIndex];
  if (!message) {
    return;
  }
  const ref = String(message.image ?? "").trim();
  const hadPrompt = Boolean(String(message.imagePrompt ?? "").trim());
  if (!ref && !hadPrompt) {
    return;
  }
  delete message.image;
  delete message.imagePrompt;
  delete message.imageEditPrompt;
  jsonInput.value = JSON.stringify(parsed, null, 2);
  if (deleteFile && ref && item?.status === "ok" && item.kind === "local") {
    await deleteLocalImage(ref);
  }
};

const deleteLocalImage = async (targetRef) => {
  const res = await fetch("/api/images/delete", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({targetRef}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка удаления");
  }
  return data;
};

const suggestGrokPrompt = async (item, {force = false} = {}) => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала вставьте JSON переписки");
  }
  if (!grokConfigured) {
    throw new Error("Grok API не настроен (XAI_API_KEY в docs/.env)");
  }
  const res = await fetch("/api/images/suggest-prompt", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      messageIndex: item.messageIndex,
      stylePrompt: getStylePrompt(),
      force,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка Grok");
  }
  if (data.imagePrompt) {
    setJsonImagePrompt(item.messageIndex, data.imagePrompt);
  }
  return data;
};

const generateKlingImage = async (item) => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала вставьте JSON переписки");
  }
  const targetRef = item.kind === "local" ? item.ref : undefined;
  const res = await fetch("/api/images/generate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      messageIndex: item.messageIndex,
      stylePrompt: getStylePrompt(),
      targetRef,
      aspectRatio: "4:3",
      useGrok: true,
      provider: getImageProvider(item.messageIndex),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка генерации");
  }
  setJsonImage(item.messageIndex, data.publicPath);
  if (data.imagePrompt) {
    setJsonImagePrompt(item.messageIndex, data.imagePrompt);
  }
  return data;
};

const correctFrameImage = async (item, editPromptOverride) => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала вставьте JSON переписки");
  }
  const parsed = parseConversationJson();
  const editPrompt = String(
    editPromptOverride ??
      parsed?.messages?.[item.messageIndex]?.imageEditPrompt ??
      "",
  ).trim();
  if (!editPrompt) {
    throw new Error("Заполните поле «Правки к кадру» (imageEditPrompt)");
  }
  if (item.status !== "ok" || item.kind !== "local") {
    throw new Error("Нужен сохранённый локальный файл изображения");
  }

  const res = await fetch("/api/images/correct", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      messageIndex: item.messageIndex,
      imageEditPrompt: editPrompt,
      stylePrompt: getStylePrompt(),
      provider: getImageProvider(item.messageIndex),
      aspectRatio: "4:3",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка правки");
  }
  setJsonImage(item.messageIndex, data.publicPath);
  if (data.previewUrl) {
    const slot = document.querySelector(
      `[data-image-slot-index="${item.messageIndex}"]`,
    );
    const img = slot?.querySelector(".image-slot__preview");
    if (img) {
      img.src = data.previewUrl;
    }
  }
  if (data.usedGrokFallback) {
    setDialogueSaveStatus(
      "Правка выполнена через Grok Imagine (Kling почти не менял кадр)",
    );
  }
  return data;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getClipboardImageFile = (clipboardData) => {
  if (!clipboardData?.items?.length) {
    return null;
  }
  for (const clipItem of clipboardData.items) {
    if (clipItem.type.startsWith("image/")) {
      return clipItem.getAsFile() || null;
    }
  }
  return null;
};

const pasteImageFileName = (file) => {
  const name = file.name?.trim();
  if (name) {
    return name;
  }
  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "png";
  return `paste-${Date.now()}.${ext}`;
};

const uploadImageFileToMessage = async (item, file) => {
  const contentBase64 = await readFileAsDataUrl(file);
  const targetRef = item.kind === "local" ? item.ref : undefined;
  const res = await fetch("/api/images/upload", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      targetRef,
      fileName: pasteImageFileName(file),
      contentBase64,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка загрузки");
  }
  setJsonImage(item.messageIndex, data.publicPath);
};

let lastFocusedImageSlotIndex = null;

const getMessageImageState = (message, item) => {
  const hasImagePath = Boolean(String(message?.image ?? "").trim());
  const hasImagePrompt = Boolean(String(message?.imagePrompt ?? "").trim());
  const status = item?.status ?? (hasImagePath ? "missing" : "pending");
  const isPendingPrompt = hasImagePrompt && !hasImagePath;
  const needsImageFile =
    isPendingPrompt || (hasImagePath && (status === "missing" || status === "url"));

  return {hasImagePath, hasImagePrompt, status, isPendingPrompt, needsImageFile};
};

const enrichImageItem = (message, messageIndex, item) => {
  const base =
    item ??
    buildItemFromMessage(message, messageIndex) ??
    buildPendingImageItem(message, messageIndex);
  if (!base) {
    return null;
  }
  const state = getMessageImageState(message, base);
  return {...base, ...state};
};

const renderImageControls = (item) => {
  const slot = document.createElement("div");
  const slotClasses = ["image-slot", `image-slot--${item.status}`];
  if (item.needsImageFile) {
    slotClasses.push("image-slot--needs-file");
  }
  if (item.isPendingPrompt) {
    slotClasses.push("image-slot--pending-prompt");
  }
  slot.className = slotClasses.join(" ");
  slot.dataset.imageSlotIndex = String(item.messageIndex);
  slot.tabIndex = 0;
  slot.title = "Ctrl+V — вставить изображение из буфера";

  const messageNum = item.messageIndex + 1;

  if (item.needsImageFile) {
    const alert = document.createElement("div");
    alert.className = "image-slot__alert";
    alert.innerHTML = `<strong>Сообщение №${messageNum} — нужно фото</strong><span>${
      item.isPendingPrompt
        ? "Вставьте картинку из буфера — она попадёт в поле <code>image</code> этого сообщения."
        : "Файл не найден — вставьте изображение из буфера (Ctrl+V)."
    }</span>`;
    slot.append(alert);
  }

  const meta = document.createElement("div");
  meta.className = "image-slot__meta";
  meta.innerHTML = `<span class="image-slot__msg-num">№${messageNum}</span>`;
  slot.append(meta);

  const ref = document.createElement("span");
  ref.className = "image-slot__ref";
  ref.textContent = item.hasImagePath ? item.ref : `images/msg-${messageNum}.png`;
  slot.append(ref);

  if (item.previewUrl) {
    const img = document.createElement("img");
    img.className = "image-slot__preview";
    img.src = item.previewUrl;
    img.alt = "Превью изображения";
    img.title = "Открыть в полном размере";
    img.addEventListener("click", () => openLightbox(item.previewUrl));
    slot.append(img);
  } else if (item.status !== "ok") {
    const placeholder = document.createElement("div");
    placeholder.className = "image-slot__placeholder";
    placeholder.textContent = "Ctrl+V — вставить изображение из буфера";
    slot.append(placeholder);
  }

  const actions = document.createElement("div");
  actions.className = "image-slot__actions";

  const btnPaste = document.createElement("button");
  btnPaste.type = "button";
  btnPaste.className = "btn btn-primary btn-small";
  btnPaste.textContent = "Из буфера";
  btnPaste.title = "Вставить скриншот или картинку из буфера (или Ctrl+V в этом блоке)";
  btnPaste.addEventListener("click", async () => {
    lastFocusedImageSlotIndex = item.messageIndex;
    slot.focus();
    btnPaste.disabled = true;
    try {
      let file = null;
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const clipItem of items) {
          if (clipItem.types.some((t) => t.startsWith("image/"))) {
            const type = clipItem.types.find((t) => t.startsWith("image/"));
            const blob = await clipItem.getType(type);
            file = new File([blob], pasteImageFileName({type, name: ""}), {type});
            break;
          }
        }
      }
      if (!file) {
        alert(
          "В буфере нет изображения. Скопируйте картинку (Cmd+C) и нажмите Ctrl+V в этом блоке или снова «Из буфера».",
        );
        return;
      }
      await uploadImageFileToMessage(item, file);
      await refreshDialogue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/denied|permission|not allowed/i.test(msg)) {
        alert(
          "Нет доступа к буферу. Разрешите в браузере или вставьте картинку через Ctrl+V в блоке фото.",
        );
      } else {
        alert(msg);
      }
    } finally {
      btnPaste.disabled = false;
    }
  });

  const pasteHint = document.createElement("span");
  pasteHint.className = "image-slot__paste-hint";
  pasteHint.textContent = "или Ctrl+V";

  actions.append(btnPaste, pasteHint);

  const canDelete =
    item.hasImagePath ||
    Boolean(item.imagePrompt) ||
    item.status === "ok" ||
    item.previewUrl;

  if (canDelete) {
    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn btn-danger btn-small";
    btnDelete.textContent = "Удалить";
    btnDelete.addEventListener("click", async () => {
      const hasFile = item.status === "ok" && item.kind === "local";
      const msg = hasFile
        ? "Удалить изображение с диска и из сообщения?"
        : "Убрать изображение из этого сообщения?";
      if (!window.confirm(msg)) {
        return;
      }
      btnDelete.disabled = true;
      try {
        await removeImageFromMessage(item.messageIndex, {deleteFile: hasFile, item});
        await refreshDialogue();
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        btnDelete.disabled = false;
      }
    });
    actions.append(btnDelete);
  }

  slot.append(actions);
  return slot;
};


const buildItemFromMessage = (message, messageIndex) => {
  const ref = String(message.image ?? "").trim();
  if (!ref) {
    return null;
  }
  return {
    messageIndex,
    author: message.author ?? "?",
    text: String(message.text ?? "").trim(),
    imagePrompt: String(message.imagePrompt ?? "").trim() || undefined,
    imageEditPrompt: String(message.imageEditPrompt ?? "").trim() || undefined,
    ref,
    kind: isImageUrl(ref) ? "url" : "local",
    status: "missing",
    previewUrl: null,
  };
};

/** Слот с imagePrompt, но без пути image — промпт задан, файл ещё не прикреплён */
const buildPendingImageItem = (message, messageIndex) => {
  const imagePrompt = String(message.imagePrompt ?? "").trim();
  if (!imagePrompt) {
    return null;
  }
  return {
    messageIndex,
    author: message.author ?? "?",
    text: String(message.text ?? "").trim(),
    imagePrompt,
    imageEditPrompt: String(message.imageEditPrompt ?? "").trim() || undefined,
    ref: `images/msg-${messageIndex + 1}.png`,
    kind: "local",
    status: "pending",
    previewUrl: null,
  };
};

const resolveImageItem = (message, messageIndex, scannedItem) =>
  enrichImageItem(message, messageIndex, scannedItem);

const renderDialogueMessage = (message, messageIndex, item, contactName) => {
  const row = document.createElement("article");
  const isMe = message.author === "me";
  const imageState =
    message.image?.trim() || message.imagePrompt?.trim()
      ? getMessageImageState(message, item)
      : null;

  row.className = `dialogue-msg dialogue-msg--${isMe ? "me" : "them"}${
    imageState?.needsImageFile ? " dialogue-msg--needs-image" : ""
  }`;
  row.dataset.messageIndex = String(messageIndex);

  const inner = document.createElement("div");
  inner.className = "dialogue-msg__inner";

  const head = document.createElement("div");
  head.className = "dialogue-msg__head";
  const who = document.createElement("span");
  who.className = "dialogue-msg__who";
  who.textContent = isMe ? "Я" : contactName?.trim() || "Собеседник";
  head.append(who);
  if (imageState?.needsImageFile) {
    const badge = document.createElement("span");
    badge.className = "dialogue-msg__needs-image-badge";
    badge.textContent = `№${messageIndex + 1} · нужно фото`;
    head.append(badge);
  }
  if (message.sentAt) {
    const time = document.createElement("span");
    time.className = "dialogue-msg__time";
    time.textContent = message.sentAt;
    head.append(time);
  }
  inner.append(head);

  const text = String(message.text ?? "").trim();
  if (text) {
    const bubble = document.createElement("div");
    bubble.className = "dialogue-msg__bubble";
    bubble.textContent = text;
    inner.append(bubble);
  }

  if (message.image?.trim() || message.imagePrompt?.trim()) {
    const resolved = resolveImageItem(message, messageIndex, item);
    if (resolved) {
      inner.append(renderImageControls(resolved));
    }
  } else {
    const addRow = document.createElement("div");
    addRow.className = "dialogue-msg__add-image";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-secondary btn-small";
    btnAdd.textContent = "+ Добавить изображение";
    btnAdd.addEventListener("click", () => {
      addImageToMessage(messageIndex);
      refreshDialogue();
    });
    addRow.append(btnAdd);
    inner.append(addRow);
  }

  row.append(inner);
  return row;
};

const renderDialogueEditor = (conversation, items) => {
  const activeId = document.activeElement?.id;
  const scrollTop = dialogueEditor.scrollTop;

  dialogueEditor.replaceChildren();

  if (!conversation?.messages?.length) {
    const empty = document.createElement("p");
    empty.className = "dialogue-editor__empty";
    empty.textContent = "Вставьте JSON с массивом messages — здесь появится диалог.";
    dialogueEditor.append(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "dialogue-editor__header";
  header.innerHTML = `<strong>${conversation.contactName ?? "Контакт"}</strong> · ${conversation.messages.length} сообщений`;
  dialogueEditor.append(header);

  const thread = document.createElement("div");
  thread.className = "dialogue-editor__thread";

  const itemsByIndex = new Map((items ?? []).map((item) => [item.messageIndex, item]));

  const needsImageIndexes = [];
  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i];
    if (!message.image?.trim() && !message.imagePrompt?.trim()) {
      continue;
    }
    const state = getMessageImageState(message, itemsByIndex.get(i));
    if (state.needsImageFile) {
      needsImageIndexes.push(i);
    }
  }

  if (needsImageIndexes.length > 0) {
    const summary = document.createElement("div");
    summary.className = "dialogue-editor__image-alert";
    const nums = needsImageIndexes.map((i) => i + 1).join(", ");
    summary.innerHTML = `<strong>${needsImageIndexes.length} кадр(ов) без изображения</strong><span>Сообщения №${nums} — ищите блоки с оранжевой рамкой и подписью «нужно фото».</span>`;
    const btnJump = document.createElement("button");
    btnJump.type = "button";
    btnJump.className = "btn btn-secondary btn-small";
    btnJump.textContent = "К первому";
    btnJump.addEventListener("click", () => {
      const first = dialogueEditor.querySelector(
        `[data-image-slot-index="${needsImageIndexes[0]}"]`,
      );
      first?.scrollIntoView({behavior: "smooth", block: "center"});
      first?.focus?.();
    });
    summary.append(btnJump);
    dialogueEditor.append(summary);
  }

  for (let i = 0; i < conversation.messages.length; i++) {
    thread.append(
      renderDialogueMessage(
        conversation.messages[i],
        i,
        itemsByIndex.get(i),
        conversation.contactName,
      ),
    );
  }

  dialogueEditor.append(thread);

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
    }
  }
  dialogueEditor.scrollTop = scrollTop;
};

const refreshDialogue = async () => {
  const json = jsonInput.value.trim();
  const conversation = parseConversationJson();

  if (!json || !conversation) {
    dialoguePanel.hidden = true;
    dialogueEditor.replaceChildren();
    return;
  }

  dialoguePanel.hidden = false;

  try {
    const res = await fetch("/api/images/scan", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({json, stylePrompt: getStylePrompt()}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка сканирования");
    }

    if (typeof data.klingConfigured === "boolean") {
      klingConfigured = data.klingConfigured;
    }
    if (typeof data.klingImageAvailable === "boolean") {
      klingImageAvailable = data.klingImageAvailable;
    }
    if (typeof data.klingBalanceHint === "string" && data.klingBalanceHint) {
      klingAccountHint = data.klingBalanceHint;
    } else if (data.klingHint) {
      klingAccountHint = data.klingHint;
    }
    if (typeof data.grokConfigured === "boolean") {
      grokConfigured = data.grokConfigured;
    }
    if (typeof data.grokModel === "string" && data.grokModel) {
      grokModel = data.grokModel;
    }
    if (typeof data.grokImageAvailable === "boolean") {
      grokImageAvailable = data.grokImageAvailable;
    }
    if (typeof data.grokImageModel === "string" && data.grokImageModel) {
      grokImageModel = data.grokImageModel;
    }

    updateImageProviderControls();
    syncTitleCardFieldsFromJson();
    renderDialogueEditor(conversation, data.items ?? []);
  } catch {
    renderDialogueEditor(conversation, []);
  }
};

const scheduleRefreshDialogue = () => {
  if (scanImagesTimer) {
    clearTimeout(scanImagesTimer);
  }
  scanImagesTimer = setTimeout(refreshDialogue, 500);
};

dialogueEditor.addEventListener("focusin", (e) => {
  const slot = e.target.closest("[data-image-slot-index]");
  if (slot) {
    lastFocusedImageSlotIndex = Number(slot.dataset.imageSlotIndex);
  }
});

dialogueEditor.addEventListener("click", (e) => {
  const slot = e.target.closest("[data-image-slot-index]");
  if (!slot) {
    return;
  }
  lastFocusedImageSlotIndex = Number(slot.dataset.imageSlotIndex);
  if (!e.target.closest("textarea, input, button, label, a")) {
    slot.focus();
  }
});

document.addEventListener("paste", async (e) => {
  if (tabPanelChat.hidden) {
    return;
  }
  if (!parseConversationJson()) {
    return;
  }

  const file = getClipboardImageFile(e.clipboardData);
  if (!file) {
    return;
  }

  const active = document.activeElement;
  if (
    active &&
    (active.tagName === "TEXTAREA" ||
      (active.tagName === "INPUT" && active.type !== "file"))
  ) {
    const types = e.clipboardData?.types ?? [];
    if (types.includes("text/plain") || types.includes("text/html")) {
      return;
    }
  }

  const slotEl = e.target.closest("[data-image-slot-index]");
  const messageIndex = slotEl
    ? Number(slotEl.dataset.imageSlotIndex)
    : lastFocusedImageSlotIndex;
  if (messageIndex == null || Number.isNaN(messageIndex)) {
    return;
  }

  const conversation = parseConversationJson();
  const message = conversation?.messages?.[messageIndex];
  if (!message?.image?.trim()) {
    return;
  }

  const pasteItem = buildItemFromMessage(message, messageIndex);
  if (!pasteItem) {
    return;
  }

  e.preventDefault();
  try {
    await uploadImageFileToMessage(pasteItem, file);
    await refreshDialogue();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
});

jsonInput.addEventListener("input", () => {
  syncTitleCardFieldsFromJson();
  scheduleRefreshDialogue();
});
stylePromptInput.addEventListener("input", scheduleRefreshDialogue);
btnRefreshDialogue.addEventListener("click", refreshDialogue);

for (const el of [introEnabled, endCardEnabled]) {
  el?.addEventListener("change", scheduleApplyTitleCards);
}
for (const el of [introTextInput, endCardTextInput]) {
  el?.addEventListener("input", scheduleApplyTitleCards);
  el?.addEventListener("blur", applyTitleCardFieldsToJson);
}

const statusLabels = {
  queued: "В очереди…",
  running: "Рендер идёт (это может занять несколько минут)…",
  done: "Готово!",
  copying: "Копирование MP4 на этот компьютер…",
  error: "Ошибка",
  cancelled: "Отменено",
};

const isRenderJobFinished = (job) => {
  if (job.status === "error" || job.status === "cancelled") {
    return true;
  }
  if (job.status !== "done") {
    return false;
  }
  if (job.target === "remote") {
    return job.localCopyStatus === "done" || job.localCopyStatus === "error";
  }
  return true;
};

const setBusy = (busy) => {
  btnRender.disabled = busy;
  btnExample.disabled = busy;
  if (btnStopRender) {
    btnStopRender.hidden = !busy;
    btnStopRender.disabled = !busy || !activeRenderJobId;
  }
};

const formatProgressLabel = (job) => {
  const percent = Math.round((job.progress ?? 0) * 100);
  const rendered = job.renderedFrames ?? 0;
  const total = job.totalFrames ?? 0;
  const framesPart = total > 0 ? ` · кадры ${rendered}/${total}` : "";
  if (job.status === "queued" && job.queuePosition > 0) {
    return `Ожидание в очереди: позиция ${job.queuePosition}`;
  }
  if (job.status === "running" && total === 0) {
    return "Подготовка проекта…";
  }
  // Кадры отрисованы, идёт однопоточная склейка — показываем фазу, а не немые проценты
  if (job.phase && total > 0 && rendered >= total) {
    return `${percent}% · ${job.phase}`;
  }
  return `${percent}%${framesPart}`;
};

const updateRenderProgress = (job) => {
  const copying = job.status === "done" && job.localCopyStatus === "copying";
  const active = job.status === "queued" || job.status === "running" || copying;
  if (renderProgressBlock) {
    renderProgressBlock.hidden = !active;
  }
  if (!renderProgressBlock || renderProgressBlock.hidden) {
    return;
  }

  const percent = Math.max(0, Math.min(100, Math.round((job.progress ?? 0) * 100)));
  if (renderProgressBar) {
    renderProgressBar.style.width = `${job.status === "done" ? 100 : percent}%`;
  }
  if (renderProgressTrack) {
    renderProgressTrack.setAttribute("aria-valuenow", String(job.status === "done" ? 100 : percent));
  }
  if (renderProgressLabel) {
    renderProgressLabel.textContent = copying
      ? statusLabels.copying
      : formatProgressLabel(job);
  }
};

const showRenderCommand = (data) => {
  if (data.renderCommand && renderCommandBlock && renderCommandEl) {
    renderCommandBlock.hidden = false;
    renderCommandEl.textContent = data.renderCommand;
  }
};

const showStatus = (job) => {
  statusPanel.hidden = false;
  statusText.className = "status-text";
  statusText.textContent =
    job.status === "queued" && job.queuePosition > 0
      ? `${statusLabels.queued} Позиция: ${job.queuePosition}`
      : statusLabels[job.status] ?? job.status;

  if (job.status === "error") {
    statusText.classList.add("status-text--error");
    if (job.error) {
      statusText.textContent = `${statusLabels.error}: ${job.error}`;
    }
  }

  if (job.status === "cancelled") {
    statusText.classList.add("status-text--error");
    statusText.textContent = job.error ?? statusLabels.cancelled;
  }

  if (job.status === "done" && job.localCopyStatus !== "copying") {
    statusText.classList.add("status-text--done");
  }

  if (job.status === "done" && job.localCopyStatus === "copying") {
    statusText.className = "status-text";
    statusText.textContent = statusLabels.copying;
  }

  statusLog.textContent = (job.logs ?? []).join("\n");
  showRenderCommand(job);
  updateRenderProgress(job);

  if (downloadBlock && downloadLink && pathsHint) {
    if (job.status === "done" && job.localCopyStatus === "done" && job.downloadUrl) {
      downloadBlock.hidden = false;
      downloadLink.href = job.downloadUrl;
      downloadLink.textContent =
        job.target === "remote"
          ? `Открыть ${job.outputPath ?? "out/video.mp4"}`
          : `Скачать ${job.outputPath ?? "video.mp4"}`;
      if (job.target === "remote") {
        downloadLink.removeAttribute("download");
      } else {
        downloadLink.setAttribute("download", job.outputFile ?? "video.mp4");
      }
      pathsHint.textContent = `JSON: ${job.inputPath ?? "—"} · MP4: ${job.outputPath ?? "—"} · concurrency: ${job.renderConcurrency ?? "—"}`;
    } else if (job.status === "done" && job.downloadUrl && job.localCopyStatus === "error") {
      downloadBlock.hidden = false;
      downloadLink.href = job.downloadUrl;
      downloadLink.textContent = `Скачать с воркера ${job.outputFile ?? "video.mp4"}`;
      downloadLink.setAttribute("download", job.outputFile ?? "video.mp4");
      pathsHint.textContent = `Локальная копия не удалась — файл остался на воркере. JSON: ${job.inputPath ?? "—"}`;
    } else if (job.status === "done" && job.localCopyStatus === "copying") {
      downloadBlock.hidden = true;
    } else if (job.inputPath || job.outputPath) {
      downloadBlock.hidden = false;
      downloadLink.href = job.downloadUrl ?? `/out/${job.outputFile ?? "video.mp4"}`;
      downloadLink.textContent = job.status === "done" ? `Открыть ${job.outputPath ?? "out/video.mp4"}` : "MP4 появится после рендера";
      if (job.status === "done") {
        downloadLink.removeAttribute("download");
      } else {
        downloadLink.setAttribute("download", job.outputFile ?? "video.mp4");
      }
      pathsHint.textContent = `JSON: ${job.inputPath ?? "—"} · MP4: ${job.outputPath ?? "—"} · concurrency: ${job.renderConcurrency ?? "—"}`;
    } else {
      downloadBlock.hidden = true;
    }
  }
};

const pollJob = (jobId) => {
  activeRenderJobId = jobId;
  setBusy(true);

  if (pollTimer) {
    clearInterval(pollTimer);
  }

  // Временные сетевые сбои (особенно при удалённом рендере на этапе склейки)
  // не должны ронять опрос — сдаёмся только после серии неудач подряд
  let consecutiveErrors = 0;
  const MAX_POLL_ERRORS = 12;

  const tick = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const job = await res.json();

      if (!res.ok) {
        throw new Error(job.error ?? "Не удалось получить статус");
      }

      consecutiveErrors = 0;
      showStatus(job);

      if (isRenderJobFinished(job)) {
        clearInterval(pollTimer);
        pollTimer = null;
        activeRenderJobId = null;
        setBusy(false);
        if (job.status === "done" && job.localCopyStatus === "done") {
          loadDialoguesList();
        }
      }
    } catch (err) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= MAX_POLL_ERRORS) {
        statusText.className = "status-text status-text--error";
        statusText.textContent = `Связь с рендером потеряна: ${
          err instanceof Error ? err.message : String(err)
        }`;
        clearInterval(pollTimer);
        pollTimer = null;
        activeRenderJobId = null;
        setBusy(false);
      } else {
        // не пугаем пользователя на разовых сбоях — продолжаем опрос
        statusText.className = "status-text";
        statusText.textContent = `Ожидание ответа от рендера… (попытка ${consecutiveErrors})`;
      }
    }
  };

  tick();
  pollTimer = setInterval(tick, 2000);
};

btnStopRender?.addEventListener("click", async () => {
  if (!activeRenderJobId) {
    return;
  }
  btnStopRender.disabled = true;
  try {
    const res = await fetch(`/api/jobs/${activeRenderJobId}/cancel`, {method: "POST"});
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось остановить рендер");
    }
    statusText.textContent = "Останавливаем…";
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
    btnStopRender.disabled = false;
  }
});

btnCopyRenderCommand?.addEventListener("click", async () => {
  const command = renderCommandEl?.textContent?.trim();
  if (!command) {
    return;
  }
  try {
    await navigator.clipboard.writeText(command);
    btnCopyRenderCommand.textContent = "Скопировано";
    setTimeout(() => {
      btnCopyRenderCommand.textContent = "Копировать команду";
    }, 2000);
  } catch {
    alert("Не удалось скопировать. Выделите команду вручную.");
  }
});

btnExample.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/example");
    const text = await res.text();
    if (!res.ok) {
      throw new Error("Не удалось загрузить пример");
    }
    jsonInput.value = text;
    currentDialogueId = null;
    dialogueTitleInput.value = "";
    updateProjectPathsHint();
    setDialogueSaveStatus("Пример загружен — сохраните как новый диалог");
    syncWallpaperFromJson();
    syncMusicFromJson();
    await refreshDialogue();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
});

btnRender.addEventListener("click", async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    alert("Вставьте JSON переписки");
    return;
  }

  setBusy(true);
  statusPanel.hidden = false;
  statusText.className = "status-text";
  statusText.textContent = "Сохранение JSON и запуск рендера…";
  statusLog.textContent = "";
  if (renderCommandBlock) {
    renderCommandBlock.hidden = true;
  }
  if (renderProgressBlock) {
    renderProgressBlock.hidden = false;
  }
  if (renderProgressBar) {
    renderProgressBar.style.width = "0%";
  }
  if (renderProgressLabel) {
    renderProgressLabel.textContent = "Запуск…";
  }
  downloadBlock.hidden = true;

  try {
    if (currentDialogueId) {
      try {
        await saveCurrentDialogue();
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
        setBusy(false);
        return;
      }
    }

    const res = await fetch("/api/render", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        json,
        name: dialogueTitleInput.value.trim() || undefined,
        wallpaper: getWallpaper(),
        music: getMusicId(),
        dialogueId: currentDialogueId ?? undefined,
        target: getRenderTarget(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка запроса");
    }

    showStatus({
      ...data,
      status: "queued",
      queuePosition: 0,
      progress: 0,
      renderedFrames: 0,
      encodedFrames: 0,
      totalFrames: 0,
      logs: data.logs ?? [],
    });
    pollJob(data.jobId);
  } catch (err) {
    statusText.className = "status-text status-text--error";
    statusText.textContent = err instanceof Error ? err.message : String(err);
    activeRenderJobId = null;
    setBusy(false);
  }
});

const applyApiStatusToEditor = (data) => {
  if (data?.kling) {
    klingConfigured = Boolean(data.kling.configured);
    klingImageAvailable = Boolean(data.kling.imageGenerationAvailable);
    if (typeof data.kling.balanceHint === "string" && data.kling.balanceHint) {
      klingAccountHint = data.kling.balanceHint;
    } else {
      klingAccountHint = data.kling.error ?? "";
    }
  }
  if (data?.grok) {
    grokConfigured = Boolean(data.grok.configured);
    grokImageAvailable = Boolean(data.grok.imageGenerationAvailable ?? data.grok.configured);
    if (typeof data.grok.model === "string" && data.grok.model) {
      grokModel = data.grok.model;
    }
    if (typeof data.grok.imageModel === "string" && data.grok.imageModel) {
      grokImageModel = data.grok.imageModel;
    }
  }
  updateImageProviderControls();
};

const appendApiStatusSection = (title, bodyEl) => {
  const section = document.createElement("section");
  section.className = "api-status-section";
  const heading = document.createElement("h3");
  heading.className = "api-status-section__title";
  heading.textContent = title;
  section.append(heading, bodyEl);
  return section;
};

const renderApiStatusPanel = (data) => {
  if (!apiStatusContent) {
    return;
  }
  apiStatusContent.replaceChildren();

  const kling = data?.kling;
  if (!kling?.configured) {
    const text = document.createElement("p");
    text.className = "api-status-section__text";
    text.textContent =
      "Не настроено. Задайте KLING_ACCESS_KEY и KLING_SECRET_KEY в docs/.env.";
    apiStatusContent.append(appendApiStatusSection("Kling", text));
  } else {
    const balance = document.createElement("pre");
    balance.className = "api-status-section__balance";
    if (kling.error) {
      balance.classList.add("api-status-section__balance--error");
      balance.textContent = kling.error;
    } else {
      balance.textContent = kling.balanceHint || "Нет данных о пакетах.";
    }
    apiStatusContent.append(appendApiStatusSection("Kling", balance));
  }

  const grok = data?.grok;
  const grokText = document.createElement("p");
  grokText.className = "api-status-section__text";
  if (!grok?.configured) {
    grokText.textContent = "Не настроено. Задайте XAI_API_KEY в docs/.env.";
  } else {
    const lines = [
      `LLM: ${grok.model ?? grokModel}`,
      `Изображения: ${grok.imageModel ?? grokImageModel}${
        grok.imageGenerationAvailable ? " (доступно)" : " (ключ есть, проверьте модель)"
      }`,
      "Остаток токенов и биллинг — только в кабинете xAI; API баланса в проекте нет.",
    ];
    grokText.textContent = lines.join("\n");
  }
  apiStatusContent.append(appendApiStatusSection("Grok (xAI)", grokText));
};

const loadApiStatus = async () => {
  if (!apiStatusContent) {
    return;
  }
  apiStatusContent.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "api-status-section__text";
  loading.textContent = "Загрузка…";
  apiStatusContent.append(loading);

  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить статус API");
    }
    applyApiStatusToEditor(data);
    renderApiStatusPanel(data);
  } catch (err) {
    apiStatusContent.replaceChildren();
    const errEl = document.createElement("p");
    errEl.className = "api-status-section__text";
    errEl.textContent = err instanceof Error ? err.message : String(err);
    apiStatusContent.append(errEl);
  }
};

btnRefreshApiStatus?.addEventListener("click", () => loadApiStatus());

const loadGrokStatus = async () => {
  try {
    const res = await fetch("/api/images/grok");
    const data = await res.json();
    applyApiStatusToEditor({grok: data});
  } catch {
    grokConfigured = false;
    grokImageAvailable = false;
    updateImageProviderControls();
  }
};

const loadKlingStatus = async () => {
  try {
    const res = await fetch("/api/images/kling");
    const data = await res.json();
    applyApiStatusToEditor({kling: data});
  } catch {
    klingConfigured = false;
    klingImageAvailable = false;
    klingAccountHint = "";
    updateImageProviderControls();
  }
};

loadMusicTracks();
loadRenderTargets();
loadKlingStatus();
loadGrokStatus();
loadStylePrompt();
loadLatestDialogueOnStartup();
