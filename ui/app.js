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
const tabBtnSeries = document.getElementById("tabBtnSeries");
const tabBtnShorts = document.getElementById("tabBtnShorts");
const tabBtnPrompt = document.getElementById("tabBtnPrompt");
const tabBtnApi = document.getElementById("tabBtnApi");
const tabPanelSeries = document.getElementById("tabPanelSeries");
const tabPanelShorts = document.getElementById("tabPanelShorts");
const tabPanelEditor = document.getElementById("tabPanelEditor");
const tabPanelPrompt = document.getElementById("tabPanelPrompt");
const tabPanelApi = document.getElementById("tabPanelApi");
const seriesFieldsRow = document.getElementById("seriesFieldsRow");
const seriesIdInput = document.getElementById("seriesIdInput");
const seriesUseContext = document.getElementById("seriesUseContext");
const seriesPartHint = document.getElementById("seriesPartHint");
const seriesTitleCardsRow = document.getElementById("seriesTitleCardsRow");
const dialoguePromptHint = document.getElementById("dialoguePromptHint");
const seriesListView = document.getElementById("seriesListView");
const seriesPartsView = document.getElementById("seriesPartsView");
const seriesDialoguesList = document.getElementById("seriesDialoguesList");
const seriesPartsList = document.getElementById("seriesPartsList");
const seriesPartsTitle = document.getElementById("seriesPartsTitle");
const shortsDialoguesList = document.getElementById("shortsDialoguesList");
const btnRefreshSeriesList = document.getElementById("btnRefreshSeriesList");
const btnRefreshSeriesParts = document.getElementById("btnRefreshSeriesParts");
const btnRefreshShortsList = document.getElementById("btnRefreshShortsList");
const btnNewSeries = document.getElementById("btnNewSeries");
const btnNewPartInSeries = document.getElementById("btnNewPartInSeries");
const btnBackToSeriesList = document.getElementById("btnBackToSeriesList");
const btnNewShort = document.getElementById("btnNewShort");
const btnBackToList = document.getElementById("btnBackToList");
const apiStatusContent = document.getElementById("apiStatusContent");
const btnRefreshApiStatus = document.getElementById("btnRefreshApiStatus");
const dialogueTitleInput = document.getElementById("dialogueTitleInput");
const dialoguePromptInput = document.getElementById("dialoguePromptInput");
const dialogueRefinePromptInput = document.getElementById("dialogueRefinePromptInput");
const dialogueTitleHint = document.getElementById("dialogueTitleHint");
const dialogueIncludeImages = document.getElementById("dialogueIncludeImages");
const dialogueGenerateStatus = document.getElementById("dialogueGenerateStatus");
const dialogueRefineStatus = document.getElementById("dialogueRefineStatus");
const btnGenerateDialogue = document.getElementById("btnGenerateDialogue");
const btnRefineDialogue = document.getElementById("btnRefineDialogue");
const btnGenerateImages = document.getElementById("btnGenerateImages");
const imagesGenerateStatus = document.getElementById("imagesGenerateStatus");
const dialoguePathsHint = document.getElementById("dialoguePathsHint");
const dialogueSaveStatus = document.getElementById("dialogueSaveStatus");
const btnSaveDialogue = document.getElementById("btnSaveDialogue");
const btnNewDialogue = document.getElementById("btnNewDialogue");
const stylePromptInput = document.getElementById("stylePromptInput");
const btnSaveStylePrompt = document.getElementById("btnSaveStylePrompt");
const stylePromptStatus = document.getElementById("stylePromptStatus");
const imageLightbox = document.getElementById("imageLightbox");
const lightboxImg = document.getElementById("lightboxImg");

let scanImagesTimer = null;
let pollTimer = null;
let activeRenderJobId = null;
let openrouterConfigured = false;
let openrouterImageAvailable = false;
let openrouterTextModel = "openai/gpt-5.4";
let openrouterImageModel = "openai/gpt-5.4-image-2";

const canGenerateImages = () => openrouterImageAvailable;

const getImageProviderUnavailableHint = () =>
  openrouterConfigured
    ? `OpenRouter (${openrouterImageModel}) недоступен`
    : "OpenRouter: задайте OPENROUTER_API_KEY в docs/.env";

const updateImageProviderControls = () => {
  for (const slot of document.querySelectorAll("[data-image-slot-index]")) {
    const available = canGenerateImages();
    const hasFile = slot.classList.contains("image-slot--ok");
    for (const btn of slot.querySelectorAll("[data-action='generate-image']")) {
      btn.disabled = !available;
      btn.textContent = hasFile ? "Перегенерировать" : "Сгенерировать";
      btn.title = available
        ? hasFile
          ? `Заменить картинку через OpenRouter (${openrouterImageModel})`
          : `Генерация через OpenRouter (${openrouterImageModel})`
        : getImageProviderUnavailableHint();
    }
    for (const btn of slot.querySelectorAll("[data-action='suggest-prompt']")) {
      btn.disabled = !openrouterConfigured;
      btn.title = openrouterConfigured
        ? "Собрать промпт по переписке (ChatGPT)"
        : "Задайте OPENROUTER_API_KEY в docs/.env";
    }
  }
};
let defaultMusicId = "romantic.mp3";
let currentDialogueId = null;
let editorKind = "series";
let editorVisible = false;
let activeMainTab = "series";
let selectedSeriesId = null;
let currentPartNumber = null;

const editorSnapshots = {
  series: null,
  shorts: null,
};
let currentDialogueOutputFile = null;

const getStylePrompt = () => stylePromptInput.value.trim();

const setDialogueSaveStatus = (text, isError = false) => {
  if (!dialogueSaveStatus) {
    return;
  }
  dialogueSaveStatus.textContent = text;
  dialogueSaveStatus.classList.toggle("editor-save-status--error", isError);
};

const syncEditorKindUi = () => {
  const isSeries = editorKind === "series";
  if (seriesFieldsRow) {
    seriesFieldsRow.hidden = !isSeries;
  }
  if (seriesTitleCardsRow) {
    seriesTitleCardsRow.hidden = !isSeries;
  }
  if (dialoguePromptHint) {
    dialoguePromptHint.textContent = isSeries
      ? "Генерация через ChatGPT (OpenRouter). Задание для части серии — например: «Часть 3: Даня палится современными словами…»"
      : "Генерация через ChatGPT (OpenRouter). Самостоятельная история для Shorts — длину и тон задайте в промпте.";
  }
  if (dialoguePromptInput) {
    dialoguePromptInput.placeholder = isSeries
      ? "Опишите часть истории, героев и финал сцены…"
      : "Опишите сюжет, героев, тон и сколько сообщений нужно…";
  }
  if (dialogueTitleHint) {
    dialogueTitleHint.textContent = isSeries
      ? "Для сериала — латиница, например poka_v_sssr_part3"
      : "На русском; в базу и в json/out сохранится транслитом";
  }
  if (dialogueTitleInput) {
    dialogueTitleInput.placeholder = isSeries ? "poka_v_sssr_part3" : "Когда кот сел на клавиатуру";
  }
  updateSeriesPartHint();
};

const updateSeriesPartHint = () => {
  if (!seriesPartHint) {
    return;
  }
  if (editorKind !== "series" || !currentPartNumber) {
    seriesPartHint.hidden = true;
    seriesPartHint.textContent = "";
    return;
  }
  seriesPartHint.hidden = false;
  seriesPartHint.textContent = `Часть ${currentPartNumber}`;
};

const resolveSeriesPartNumber = async () => {
  if (editorKind !== "series") {
    return null;
  }
  if (currentPartNumber) {
    return currentPartNumber;
  }
  const seriesId = seriesIdInput?.value.trim() ?? "";
  if (!seriesId) {
    return 1;
  }
  return getNextPartNumber(seriesId);
};

const resolveTitlePayload = () => {
  const raw = dialogueTitleInput.value.trim();
  if (!raw) {
    return {};
  }
  if (editorKind === "shorts") {
    return {
      title: slugifyProjectName(raw),
      titleDisplay: raw,
    };
  }
  return {
    title: raw,
    titleDisplay: raw,
  };
};

const updateRefineDialogueControls = () => {
  if (!btnRefineDialogue) {
    return;
  }
  const hasJson = Boolean(jsonInput.value.trim());
  btnRefineDialogue.disabled = !hasJson;
  btnRefineDialogue.title = hasJson
    ? "Отправить текущий диалог на доработку"
    : "Сначала нужен JSON переписки";
};

const canGenerateDialogue = () => openrouterConfigured;

const updateDialogueGenerateControls = () => {
  if (!dialogueGenerateStatus) {
    return;
  }
  if (!canGenerateDialogue()) {
    dialogueGenerateStatus.textContent =
      "Задайте OPENROUTER_API_KEY в docs/.env (ключ: openrouter.ai/keys), затем «Обновить» на вкладке API или перезапустите npm run ui";
    return;
  }
  const status = dialogueGenerateStatus.textContent;
  if (
    !status ||
    status.includes("не настроен") ||
    status.includes("OPENROUTER") ||
    status.includes("ChatGPT")
  ) {
    dialogueGenerateStatus.textContent = "";
  }
};
const captureEditorSnapshot = () => ({
  dialogueId: currentDialogueId,
  title: dialogueTitleInput.value,
  prompt: dialoguePromptInput?.value ?? "",
  json: jsonInput.value,
  outputFile: currentDialogueOutputFile,
  seriesId: seriesIdInput?.value ?? "",
  partNumber: currentPartNumber,
  seriesUseContext: seriesUseContext?.checked ?? true,
  wallpaper: getWallpaper(),
  music: getMusicId(),
});

const restoreEditorSnapshot = async (snapshot) => {
  currentDialogueId = snapshot?.dialogueId ?? null;
  currentDialogueOutputFile = snapshot?.outputFile ?? null;
  dialogueTitleInput.value = snapshot?.title ?? "";
  if (dialoguePromptInput) {
    dialoguePromptInput.value = snapshot?.prompt ?? "";
  }
  if (seriesIdInput) {
    seriesIdInput.value = snapshot?.seriesId || "usssr";
  }
  currentPartNumber = snapshot?.partNumber ?? null;
  updateSeriesPartHint();
  if (seriesUseContext) {
    seriesUseContext.checked = snapshot?.seriesUseContext !== false;
  }
  jsonInput.value = snapshot?.json ?? "";
  if (snapshot?.wallpaper) {
    setWallpaper(snapshot.wallpaper);
  }
  if (snapshot?.music) {
    setMusicId(snapshot.music);
  }
  updateProjectPathsHint();
  syncTitleCardFieldsFromJson();
  if (jsonInput.value.trim()) {
    await refreshDialogue();
    try {
      updateGenerateImagesControls(JSON.parse(jsonInput.value));
    } catch {
      updateGenerateImagesControls(null);
    }
  } else {
    dialoguePanel.hidden = true;
    dialogueEditor.replaceChildren();
    updateGenerateImagesControls(null);
  }
  setDialogueSaveStatus(
    currentDialogueId
      ? `Открыт диалог (${editorKind === "series" ? "сериал" : "shorts"})`
      : editorKind === "series"
        ? "Новая часть серии"
        : "Новый Shorts",
  );
  if (editorKind === "shorts" && jsonInput.value.trim()) {
    applyTitleCardFieldsToJson();
  }
};

const switchEditorKind = async (nextKind) => {
  const normalized = nextKind === "shorts" ? "shorts" : "series";
  if (normalized === editorKind) {
    return;
  }
  if (editorVisible) {
    editorSnapshots[editorKind] = captureEditorSnapshot();
  }
  editorKind = normalized;
  syncEditorKindUi();
  if (editorVisible) {
    await restoreEditorSnapshot(editorSnapshots[normalized]);
  }
};

const updateContentViewVisibility = () => {
  const isContentTab = activeMainTab === "series" || activeMainTab === "shorts";
  if (tabPanelSeries) {
    tabPanelSeries.hidden = !isContentTab || editorVisible || activeMainTab !== "series";
    tabPanelSeries.classList.toggle(
      "tab-panel--active",
      isContentTab && !editorVisible && activeMainTab === "series",
    );
  }
  if (tabPanelShorts) {
    tabPanelShorts.hidden = !isContentTab || editorVisible || activeMainTab !== "shorts";
    tabPanelShorts.classList.toggle(
      "tab-panel--active",
      isContentTab && !editorVisible && activeMainTab === "shorts",
    );
  }
  if (tabPanelEditor) {
    tabPanelEditor.hidden = !isContentTab || !editorVisible;
    tabPanelEditor.classList.toggle("tab-panel--active", isContentTab && editorVisible);
  }
  if (tabPanelPrompt) {
    tabPanelPrompt.hidden = activeMainTab !== "prompt";
    tabPanelPrompt.classList.toggle("tab-panel--active", activeMainTab === "prompt");
  }
  if (tabPanelApi) {
    tabPanelApi.hidden = activeMainTab !== "api";
    tabPanelApi.classList.toggle("tab-panel--active", activeMainTab === "api");
  }
};

const showEditorView = async () => {
  editorVisible = true;
  updateContentViewVisibility();
};

const updateSeriesBrowseVisibility = () => {
  const inPartsView = Boolean(selectedSeriesId);
  if (seriesListView) {
    seriesListView.hidden = inPartsView;
  }
  if (seriesPartsView) {
    seriesPartsView.hidden = !inPartsView;
  }
  if (btnBackToList) {
    btnBackToList.textContent =
      editorKind === "series" && selectedSeriesId ? "← К частям" : "← К списку";
  }
};

const showSeriesListView = async () => {
  selectedSeriesId = null;
  updateSeriesBrowseVisibility();
  await loadDialoguesList("series");
};

const showSeriesPartsView = async (seriesId) => {
  const normalized = String(seriesId ?? "").trim();
  if (!normalized) {
    await showSeriesListView();
    return;
  }
  selectedSeriesId = normalized;
  if (seriesPartsTitle) {
    seriesPartsTitle.textContent = normalized;
  }
  updateSeriesBrowseVisibility();
  await loadSeriesParts(normalized);
};

const showBrowseView = async (kind = editorKind) => {
  if (editorVisible) {
    editorSnapshots[editorKind] = captureEditorSnapshot();
  }
  editorKind = kind === "shorts" ? "shorts" : "series";
  syncEditorKindUi();
  editorVisible = false;
  updateContentViewVisibility();
  if (editorKind === "series") {
    if (selectedSeriesId) {
      await showSeriesPartsView(selectedSeriesId);
    } else {
      await showSeriesListView();
    }
  } else {
    selectedSeriesId = null;
    await loadDialoguesList("shorts");
  }
};

const setActiveTab = async (tabId, {skipEditorSwitch = false} = {}) => {
  const isContentTab = tabId === "series" || tabId === "shorts";
  activeMainTab = tabId;

  if (isContentTab) {
    if (tabId !== editorKind && !skipEditorSwitch) {
      if (editorVisible) {
        await switchEditorKind(tabId);
      } else {
        editorKind = tabId;
        syncEditorKindUi();
        await loadDialoguesList(editorKind);
      }
    } else if (tabId !== editorKind && skipEditorSwitch) {
      editorKind = tabId;
      syncEditorKindUi();
    } else if (!editorVisible) {
      if (editorKind === "series") {
        if (selectedSeriesId) {
          await showSeriesPartsView(selectedSeriesId);
        } else {
          await showSeriesListView();
        }
      } else {
        await loadDialoguesList("shorts");
      }
    }
  }

  updateContentViewVisibility();
  if (editorKind === "series" && !editorVisible) {
    updateSeriesBrowseVisibility();
  }

  const buttons = {
    series: tabBtnSeries,
    shorts: tabBtnShorts,
    prompt: tabBtnPrompt,
    api: tabBtnApi,
  };

  for (const [id, button] of Object.entries(buttons)) {
    if (!button) {
      continue;
    }
    const active = isContentTab ? id === editorKind : id === tabId;
    button.classList.toggle("tabs__btn--active", active);
    button.setAttribute("aria-selected", String(active));
  }

  if (tabId === "api") {
    loadApiStatus();
  }
};

tabBtnSeries?.addEventListener("click", () => {
  if (!editorVisible) {
    selectedSeriesId = null;
    updateSeriesBrowseVisibility();
  }
  setActiveTab("series");
});
tabBtnShorts?.addEventListener("click", () => setActiveTab("shorts"));
tabBtnPrompt.addEventListener("click", () => setActiveTab("prompt"));
tabBtnApi.addEventListener("click", () => setActiveTab("api"));

syncEditorKindUi();

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
  dialogueTitleInput.value = dialogue.titleDisplay || dialogue.title || "";
  if (dialoguePromptInput) {
    dialoguePromptInput.value = dialogue.dialoguePrompt ?? "";
  }
  if (seriesIdInput) {
    seriesIdInput.value = dialogue.seriesId || "usssr";
  }
  currentPartNumber = dialogue.partNumber ?? null;
  updateSeriesPartHint();
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
  editorKind = data.kind === "series" ? "series" : "shorts";
  activeMainTab = editorKind;
  if (editorKind === "series" && data.seriesId) {
    selectedSeriesId = data.seriesId.trim();
  }
  syncEditorKindUi();
  currentDialogueId = data.id;
  applyDialogueToEditor(data);
  if (editorKind === "shorts") {
    applyTitleCardFieldsToJson();
  }
  editorSnapshots[editorKind] = captureEditorSnapshot();
  editorVisible = true;
  updateSeriesBrowseVisibility();
  await setActiveTab(editorKind, {skipEditorSwitch: true});
  await refreshDialogue();
};

const saveCurrentDialogue = async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    setDialogueSaveStatus("Нет JSON для сохранения", true);
    return null;
  }

  const payload = {
    ...resolveTitlePayload(),
    json,
    wallpaper: getWallpaper(),
    music: getMusicId(),
    dialoguePrompt: dialoguePromptInput?.value.trim() ?? "",
    kind: editorKind,
    seriesId: editorKind === "series" ? (seriesIdInput?.value.trim() ?? "") : "",
    partNumber: editorKind === "series" ? (currentPartNumber ?? (await resolveSeriesPartNumber())) : null,
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
  dialogueTitleInput.value = data.titleDisplay || data.title || dialogueTitleInput.value;
  if (data.partNumber) {
    currentPartNumber = data.partNumber;
    updateSeriesPartHint();
  }
  updateProjectPathsHint();
  editorSnapshots[editorKind] = captureEditorSnapshot();
  setDialogueSaveStatus(`Сохранено ${formatDate(data.updatedAt)}`);
  return data;
};

const newDialogue = async ({openEditor = false} = {}) => {
  currentDialogueId = null;
  currentDialogueOutputFile = null;
  dialogueTitleInput.value = "";
  if (dialoguePromptInput) {
    dialoguePromptInput.value = "";
  }
  currentPartNumber = null;
  updateSeriesPartHint();
  if (seriesIdInput && editorKind === "series") {
    seriesIdInput.value = "usssr";
  }
  updateProjectPathsHint();
  jsonInput.value = "";
  setDialogueSaveStatus(
    editorKind === "series"
      ? "Новая часть серии — вставьте JSON или сгенерируйте диалог"
      : "Новый Shorts — вставьте JSON или сгенерируйте диалог",
  );
  dialoguePanel.hidden = true;
  dialogueEditor.replaceChildren();
  editorSnapshots[editorKind] = captureEditorSnapshot();
  if (openEditor) {
    activeMainTab = editorKind;
    editorVisible = true;
    updateContentViewVisibility();
    await setActiveTab(editorKind, {skipEditorSwitch: true});
  }
};

const renderDialogueListItem = (item) => {
  const card = document.createElement("article");
  card.className = "dialogue-library-card";

  const head = document.createElement("div");
  head.className = "dialogue-library-card__head";
  const title = document.createElement("h3");
  title.className = "dialogue-library-card__title";
  title.textContent = item.titleDisplay || item.title || item.contactName || "Без названия";
  const badge = document.createElement("span");
  badge.className = "dialogue-library-card__badge";
  if (item.kind === "series" && item.partNumber) {
    badge.textContent = `ч.${item.partNumber}`;
  } else if (item.kind === "series") {
    badge.textContent = "сериал";
  }
  title.append(badge);
  head.append(title);

  const meta = document.createElement("p");
  meta.className = "dialogue-library-card__meta";
  let prefix = "";
  if (item.kind === "series" && item.partNumber) {
    prefix = selectedSeriesId
      ? `часть ${item.partNumber} · `
      : `${item.seriesId || "—"}${item.partNumber ? ` · часть ${item.partNumber}` : ""} · `;
  } else if (item.kind === "series" && item.seriesId && !selectedSeriesId) {
    prefix = `${item.seriesId} · `;
  }
  meta.textContent = `${prefix}${item.contactName || "—"} · ${item.messageCount ?? 0} сообщ. · ${formatDate(item.updatedAt)}`;

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
        if (item.kind === "series" && selectedSeriesId) {
          editorVisible = false;
          updateContentViewVisibility();
          await showSeriesPartsView(selectedSeriesId);
        } else {
          await showBrowseView(item.kind === "series" ? "series" : "shorts");
        }
      } else if (item.kind === "series" && selectedSeriesId) {
        await loadSeriesParts(selectedSeriesId);
      } else {
        await loadDialoguesList(item.kind === "series" ? "series" : "shorts");
      }
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

const fetchDialoguesList = async (kind) => {
  const normalizedKind = kind === "series" || kind === "shorts" ? kind : "series";
  const res = await fetch(`/api/dialogues?kind=${encodeURIComponent(normalizedKind)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка загрузки списка");
  }
  return data.dialogues ?? [];
};

const getBrowseListElement = (kind) =>
  kind === "shorts" ? shortsDialoguesList : seriesDialoguesList;

const groupSeriesDialogues = (dialogues) => {
  const groups = new Map();
  for (const item of dialogues) {
    const key = item.seriesId?.trim() || "Без ID серии";
    if (!groups.has(key)) {
      groups.set(key, {seriesId: key, parts: [], lastUpdated: 0});
    }
    const group = groups.get(key);
    group.parts.push(item);
    group.lastUpdated = Math.max(group.lastUpdated, item.updatedAt ?? 0);
  }
  return [...groups.values()].sort((a, b) => a.seriesId.localeCompare(b.seriesId, "ru"));
};

const renderEmptyList = (container, kind, context = "list") => {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "dialogues-list__empty";
  if (kind === "series" && context === "parts") {
    empty.textContent = "В этой серии пока нет частей. Нажмите «Новая часть».";
  } else if (kind === "series") {
    empty.textContent = "Пока нет серий. Нажмите «Новый сериал».";
  } else {
    empty.textContent = "Пока нет Shorts. Нажмите «Новый Shorts».";
  }
  container.append(empty);
};

const renderSeriesRow = (group) => {
  const row = document.createElement("article");
  row.className = "series-row";

  const main = document.createElement("div");
  main.className = "series-row__main";

  const title = document.createElement("span");
  title.className = "series-row__title";
  title.textContent = group.seriesId;

  const meta = document.createElement("span");
  meta.className = "series-row__meta";
  const partCount = group.parts.length;
  const partLabel =
    partCount === 1 ? "1 часть" : partCount < 5 ? `${partCount} части` : `${partCount} частей`;
  meta.textContent = `${partLabel} · обновлено ${formatDate(group.lastUpdated)}`;

  main.append(title, meta);

  const btnOpen = document.createElement("button");
  btnOpen.type = "button";
  btnOpen.className = "btn btn-primary btn-small";
  btnOpen.textContent = "Открыть";
  btnOpen.addEventListener("click", async (event) => {
    event.stopPropagation();
    await showSeriesPartsView(group.seriesId);
  });

  row.append(main, btnOpen);
  row.addEventListener("click", async () => {
    await showSeriesPartsView(group.seriesId);
  });

  return row;
};

const renderShortsDialoguesList = (dialogues) => {
  const container = shortsDialoguesList;
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!dialogues.length) {
    renderEmptyList(container, "shorts");
    return;
  }
  for (const item of dialogues) {
    container.append(renderDialogueListItem(item));
  }
};

const renderSeriesDialoguesList = (dialogues) => {
  const container = seriesDialoguesList;
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!dialogues.length) {
    renderEmptyList(container, "series");
    return;
  }

  for (const group of groupSeriesDialogues(dialogues)) {
    container.append(renderSeriesRow(group));
  }
};

const renderSeriesPartsList = (dialogues) => {
  const container = seriesPartsList;
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!dialogues.length) {
    renderEmptyList(container, "series", "parts");
    return;
  }

  const sortedParts = [...dialogues].sort(
    (a, b) => (a.partNumber ?? Number.MAX_SAFE_INTEGER) - (b.partNumber ?? Number.MAX_SAFE_INTEGER),
  );
  for (const item of sortedParts) {
    container.append(renderDialogueListItem(item));
  }
};

const loadSeriesParts = async (seriesId) => {
  if (!seriesPartsList) {
    return;
  }
  try {
    const dialogues = await fetchDialoguesList("series");
    const parts = dialogues.filter((item) => (item.seriesId?.trim() || "Без ID серии") === seriesId);
    renderSeriesPartsList(parts);
  } catch (err) {
    seriesPartsList.replaceChildren();
    const errEl = document.createElement("p");
    errEl.className = "dialogues-list__empty";
    errEl.textContent = err instanceof Error ? err.message : String(err);
    seriesPartsList.append(errEl);
  }
};

const renderDialoguesList = (dialogues, kind) => {
  if (kind === "shorts") {
    renderShortsDialoguesList(dialogues);
    return;
  }
  if (selectedSeriesId) {
    const parts = dialogues.filter(
      (item) => (item.seriesId?.trim() || "Без ID серии") === selectedSeriesId,
    );
    renderSeriesPartsList(parts);
    return;
  }
  renderSeriesDialoguesList(dialogues);
};

const loadDialoguesList = async (kind = editorKind) => {
  if (kind === "series" && selectedSeriesId) {
    await loadSeriesParts(selectedSeriesId);
    return;
  }

  const container = getBrowseListElement(kind);
  try {
    const dialogues = await fetchDialoguesList(kind);
    renderDialoguesList(dialogues, kind);
  } catch (err) {
    if (!container) {
      return;
    }
    container.replaceChildren();
    const errEl = document.createElement("p");
    errEl.className = "dialogues-list__empty";
    errEl.textContent = err instanceof Error ? err.message : String(err);
    container.append(errEl);
  }
};

const loadBrowseOnStartup = async () => {
  try {
    await showSeriesListView();
    await loadDialoguesList("shorts");
  } catch {
    /* пустой список */
  }
  updateContentViewVisibility();
  updateSeriesBrowseVisibility();
  updateRefineDialogueControls();
};

const getNextPartNumber = async (seriesId) => {
  const dialogues = await fetchDialoguesList("series");
  const parts = dialogues.filter((item) => item.seriesId?.trim() === seriesId);
  const maxPart = parts.reduce((max, item) => Math.max(max, item.partNumber ?? 0), 0);
  return maxPart + 1;
};

const openNewSeriesEditor = async () => {
  editorKind = "series";
  selectedSeriesId = null;
  syncEditorKindUi();
  await newDialogue({openEditor: true});
  if (seriesIdInput) {
    seriesIdInput.value = "";
  }
  currentPartNumber = 1;
  updateSeriesPartHint();
};

const openNewPartInSeriesEditor = async () => {
  if (!selectedSeriesId) {
    await openNewSeriesEditor();
    return;
  }
  editorKind = "series";
  syncEditorKindUi();
  await newDialogue({openEditor: true});
  if (seriesIdInput) {
    seriesIdInput.value = selectedSeriesId;
  }
  currentPartNumber = await getNextPartNumber(selectedSeriesId);
  updateSeriesPartHint();
};

btnSaveDialogue.addEventListener("click", async () => {
  btnSaveDialogue.disabled = true;
  try {
    const data = await saveCurrentDialogue();
    if (data?.kind === "series" && data.seriesId) {
      selectedSeriesId = data.seriesId.trim();
      updateSeriesBrowseVisibility();
    }
    await loadDialoguesList(editorKind);
  } catch (err) {
    setDialogueSaveStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    btnSaveDialogue.disabled = false;
  }
});

btnNewDialogue.addEventListener("click", () => {
  newDialogue();
});
btnBackToList?.addEventListener("click", async () => {
  if (editorKind === "series" && selectedSeriesId) {
    if (editorVisible) {
      editorSnapshots.series = captureEditorSnapshot();
    }
    editorVisible = false;
    updateContentViewVisibility();
    updateSeriesBrowseVisibility();
    await showSeriesPartsView(selectedSeriesId);
    return;
  }
  await showBrowseView(editorKind);
});
btnBackToSeriesList?.addEventListener("click", () => {
  showSeriesListView();
});
btnRefreshSeriesList?.addEventListener("click", () => showSeriesListView());
btnRefreshSeriesParts?.addEventListener("click", () => {
  if (selectedSeriesId) {
    loadSeriesParts(selectedSeriesId);
  }
});
btnRefreshShortsList?.addEventListener("click", () => loadDialoguesList("shorts"));
btnNewSeries?.addEventListener("click", () => {
  openNewSeriesEditor();
});
btnNewPartInSeries?.addEventListener("click", () => {
  openNewPartInSeriesEditor();
});
btnNewShort?.addEventListener("click", async () => {
  editorKind = "shorts";
  syncEditorKindUi();
  await newDialogue({openEditor: true});
});

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
      "Сохранено. Для старых кадров — сгенерируйте промпт заново или очистите промпт кадра.";
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
  if (editorKind !== "series") {
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

  if (editorKind !== "series") {
    delete parsed.intro;
    delete parsed.endCard;
    jsonInput.value = JSON.stringify(parsed, null, 2);
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

const suggestImagePrompt = async (item, {force = false} = {}) => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала вставьте JSON переписки");
  }
  if (!openrouterConfigured) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env");
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
    throw new Error(data.error ?? "Ошибка генерации промпта");
  }
  if (data.imagePrompt) {
    setJsonImagePrompt(item.messageIndex, data.imagePrompt);
  }
  return data;
};

const generateFrameImage = async (item) => {
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

  const promptBlock = document.createElement("div");
  promptBlock.className = "image-slot__prompt-edit image-card__prompt-edit";

  const promptLabel = document.createElement("label");
  promptLabel.className = "image-card__prompt-label";
  promptLabel.textContent = "Промпт для этого кадра";

  const promptInput = document.createElement("textarea");
  promptInput.className = "image-card__prompt-input";
  promptInput.rows = 3;
  promptInput.placeholder = "Описание сцены для генерации…";
  promptInput.value = item.imagePrompt ?? "";
  promptInput.addEventListener("input", () => {
    const idx = item.messageIndex;
    if (imagePromptSaveTimers.has(idx)) {
      clearTimeout(imagePromptSaveTimers.get(idx));
    }
    imagePromptSaveTimers.set(
      idx,
      setTimeout(() => {
        setJsonImagePrompt(idx, promptInput.value);
        imagePromptSaveTimers.delete(idx);
      }, 400),
    );
  });

  const promptActions = document.createElement("div");
  promptActions.className = "image-card__prompt-edit-actions";

  const btnSuggest = document.createElement("button");
  btnSuggest.type = "button";
  btnSuggest.className = "btn btn-secondary btn-small";
  btnSuggest.dataset.action = "suggest-prompt";
  btnSuggest.textContent = "Промпт от ChatGPT";
  btnSuggest.addEventListener("click", async () => {
    btnSuggest.disabled = true;
    const status = promptBlock.querySelector(".image-slot__gen-status");
    if (status) {
      status.textContent = "Сбор промпта…";
    }
    try {
      await suggestImagePrompt(item, {force: true});
      const parsed = parseConversationJson();
      const nextPrompt = parsed?.messages?.[item.messageIndex]?.imagePrompt ?? "";
      promptInput.value = nextPrompt;
      if (status) {
        status.textContent = "Промпт обновлён";
      }
    } catch (err) {
      if (status) {
        status.textContent = err instanceof Error ? err.message : String(err);
      }
    } finally {
      updateImageProviderControls();
    }
  });

  const btnGenerate = document.createElement("button");
  btnGenerate.type = "button";
  btnGenerate.className = "btn btn-primary btn-small";
  btnGenerate.dataset.action = "generate-image";
  btnGenerate.dataset.generateLabel = "primary";
  btnGenerate.textContent =
    item.status === "ok" && item.previewUrl ? "Перегенерировать" : "Сгенерировать";
  btnGenerate.addEventListener("click", async () => {
    const hasFile = item.status === "ok" && item.previewUrl;
    if (
      hasFile &&
      !window.confirm("Перегенерировать изображение? Текущий файл будет заменён.")
    ) {
      return;
    }
    btnGenerate.disabled = true;
    const status = promptBlock.querySelector(".image-slot__gen-status");
    if (status) {
      status.textContent = "Генерация…";
    }
    try {
      await generateFrameImage(item);
      await refreshDialogue();
      if (status) {
        status.textContent = hasFile ? "Изображение заменено" : "Готово";
      }
    } catch (err) {
      if (status) {
        status.textContent = err instanceof Error ? err.message : String(err);
      }
    } finally {
      updateImageProviderControls();
    }
  });

  const genStatus = document.createElement("span");
  genStatus.className = "image-slot__gen-status style-prompt-status";
  genStatus.setAttribute("aria-live", "polite");

  promptActions.append(btnSuggest, btnGenerate, genStatus);
  promptBlock.append(promptLabel, promptInput, promptActions);
  slot.append(promptBlock);

  if (item.status === "ok" && item.previewUrl) {
    const correctionBlock = document.createElement("div");
    correctionBlock.className = "image-slot__correction-edit image-card__correction-edit";

    const editLabel = document.createElement("label");
    editLabel.className = "image-card__prompt-label";
    editLabel.textContent = "Правки к кадру";

    const editInput = document.createElement("textarea");
    editInput.className = "image-card__prompt-input";
    editInput.rows = 2;
    editInput.placeholder = "Что изменить на уже готовом фото…";
    editInput.value = item.imageEditPrompt ?? "";
    editInput.addEventListener("input", () => {
      const idx = item.messageIndex;
      if (imageEditPromptSaveTimers.has(idx)) {
        clearTimeout(imageEditPromptSaveTimers.get(idx));
      }
      imageEditPromptSaveTimers.set(
        idx,
        setTimeout(() => {
          setJsonImageEditPrompt(idx, editInput.value);
          imageEditPromptSaveTimers.delete(idx);
        }, 400),
      );
    });

    const editActions = document.createElement("div");
    editActions.className = "image-card__prompt-edit-actions";

    const btnCorrect = document.createElement("button");
    btnCorrect.type = "button";
    btnCorrect.className = "btn btn-secondary btn-small";
    btnCorrect.textContent = "Применить правки";
    btnCorrect.addEventListener("click", async () => {
      btnCorrect.disabled = true;
      if (genStatus) {
        genStatus.textContent = "Правка изображения…";
      }
      try {
        await correctFrameImage(item, editInput.value);
        await refreshDialogue();
        if (genStatus) {
          genStatus.textContent = "Правки применены";
        }
      } catch (err) {
        if (genStatus) {
          genStatus.textContent = err instanceof Error ? err.message : String(err);
        }
      } finally {
        btnCorrect.disabled = false;
        updateImageProviderControls();
      }
    });

    editActions.append(btnCorrect);
    correctionBlock.append(editLabel, editInput, editActions);
    slot.append(correctionBlock);
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

  const messageText = String(message.text ?? "").trim();
  if (messageText) {
    const btnRegen = document.createElement("button");
    btnRegen.type = "button";
    btnRegen.className = "dialogue-msg__regen btn btn-secondary btn-small";
    btnRegen.textContent = "↻";
    btnRegen.title = "Переписать реплику (ChatGPT)";
    btnRegen.disabled = !openrouterConfigured;
    btnRegen.addEventListener("click", async () => {
      btnRegen.disabled = true;
      const prevTitle = btnRegen.title;
      btnRegen.title = "Переписываю…";
      try {
        await regenerateMessageFromIndex(messageIndex);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        btnRegen.disabled = !openrouterConfigured;
        btnRegen.title = prevTitle;
      }
    });
    head.append(btnRegen);
  }

  inner.append(head);

  const text = messageText;
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
    updateGenerateImagesControls(null);
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

    if (typeof data.openrouterConfigured === "boolean") {
      openrouterConfigured = data.openrouterConfigured;
    }
    if (typeof data.openrouterImageAvailable === "boolean") {
      openrouterImageAvailable = data.openrouterImageAvailable;
    }

    updateImageProviderControls();
    syncTitleCardFieldsFromJson();
    renderDialogueEditor(conversation, data.items ?? []);
    updateGenerateImagesControls(conversation);
  } catch {
    renderDialogueEditor(conversation, []);
    updateGenerateImagesControls(conversation);
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
  if (tabPanelEditor.hidden) {
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
  updateGenerateImagesControls();
  updateRefineDialogueControls();
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

  const withCacheBust = (url, token) => {
    if (!url || url.startsWith("/api/")) {
      return url;
    }
    if (url.includes("v=")) {
      return url;
    }
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${token ?? Date.now()}`;
  };

  if (downloadBlock && downloadLink && pathsHint) {
    if (job.status === "done" && job.localCopyStatus === "done" && job.downloadUrl) {
      downloadBlock.hidden = false;
      downloadLink.href = withCacheBust(job.downloadUrl, job.finishedAt);
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
      downloadLink.href = withCacheBust(
        job.downloadUrl ?? `/out/${job.outputFile ?? "video.mp4"}`,
        job.finishedAt,
      );
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
          loadDialoguesList(editorKind);
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

const countPendingImages = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return messages.filter((message) => {
    const hasPrompt = Boolean(String(message.imagePrompt ?? "").trim());
    const hasImage = Boolean(String(message.image ?? "").trim());
    return hasPrompt && !hasImage;
  }).length;
};

const updateGenerateImagesControls = (conversation = null) => {
  if (!btnGenerateImages) {
    return;
  }

  const parsed = conversation ?? parseConversationJson();
  const pending = countPendingImages(parsed);
  const canGenerate = openrouterImageAvailable && pending > 0;

  btnGenerateImages.disabled = !canGenerate;
  if (!openrouterImageAvailable) {
    btnGenerateImages.title = "Задайте OPENROUTER_API_KEY в .env";
  } else if (pending === 0) {
    btnGenerateImages.title = parsed
      ? "Нет сообщений с imagePrompt без прикреплённого image"
      : "Сначала добавьте JSON переписки";
  } else {
    btnGenerateImages.title = `Сгенерировать ${pending} изображени${pending === 1 ? "е" : pending < 5 ? "я" : "й"}`;
  }
};

const clearShortsJsonBeforeGenerate = () => {
  if (!jsonInput.value.trim()) {
    return;
  }
  jsonInput.value = "";
  dialoguePanel.hidden = true;
  dialogueEditor.replaceChildren();
  updateGenerateImagesControls(null);
  updateRefineDialogueControls();
};

const generateDialogueFromPrompt = async () => {
  const prompt = dialoguePromptInput?.value.trim() ?? "";
  if (!prompt) {
    throw new Error("Введите промпт диалога");
  }
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  if (editorKind === "shorts") {
    clearShortsJsonBeforeGenerate();
  }

  const includeImages = dialogueIncludeImages?.checked !== false;
  const body = {
    prompt,
    includeImages,
    mode: editorKind,
  };

  if (editorKind === "series") {
    body.seriesId = seriesIdInput?.value.trim() ?? "";
    body.partNumber = currentPartNumber ?? (await resolveSeriesPartNumber());
    body.useSeriesContext = seriesUseContext?.checked !== false;
  }

  const res = await fetch("/api/dialogues/generate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка генерации диалога");
  }

  jsonInput.value = JSON.stringify(data.conversation, null, 2);
  if (editorKind === "shorts" && data.displayTitle) {
    dialogueTitleInput.value = data.displayTitle;
    updateProjectPathsHint();
  }
  syncTitleCardFieldsFromJson();
  await refreshDialogue();
  updateGenerateImagesControls(data.conversation);
  updateRefineDialogueControls();
  return data;
};

const regenerateMessageFromIndex = async (messageIndex) => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала нужен JSON переписки");
  }
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  const body = {
    json,
    messageIndex,
    mode: editorKind,
  };
  if (editorKind === "series") {
    body.seriesId = seriesIdInput?.value.trim() ?? "";
  }

  const res = await fetch("/api/dialogues/regenerate-message", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка переписывания реплики");
  }

  jsonInput.value = JSON.stringify(data.conversation, null, 2);
  await refreshDialogue();
  updateGenerateImagesControls(data.conversation);
  return data;
};

const refineDialogueFromPrompt = async () => {
  const refinePrompt = dialogueRefinePromptInput?.value.trim() ?? "";
  if (!refinePrompt) {
    throw new Error("Введите, что доработать в тексте");
  }
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала нужен JSON переписки");
  }
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  const includeImages = dialogueIncludeImages?.checked !== false;
  const body = {
    refinePrompt,
    json,
    includeImages,
    mode: editorKind,
  };
  if (editorKind === "series") {
    body.seriesId = seriesIdInput?.value.trim() ?? "";
  }

  const res = await fetch("/api/dialogues/refine", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка доработки диалога");
  }

  jsonInput.value = JSON.stringify(data.conversation, null, 2);
  if (editorKind === "shorts" && data.displayTitle) {
    dialogueTitleInput.value = data.displayTitle;
    updateProjectPathsHint();
  }
  syncTitleCardFieldsFromJson();
  await refreshDialogue();
  updateGenerateImagesControls(data.conversation);
  updateRefineDialogueControls();
  return data;
};

const generateMissingImages = async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала добавьте JSON переписки");
  }
  if (!openrouterImageAvailable) {
    throw new Error("OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)");
  }

  const res = await fetch("/api/images/generate-missing", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      stylePrompt: getStylePrompt(),
      provider: "openrouter",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка генерации изображений");
  }

  jsonInput.value = JSON.stringify(data.conversation, null, 2);
  await refreshDialogue();
  updateGenerateImagesControls(data.conversation);
  return data;
};

btnGenerateDialogue?.addEventListener("click", async () => {
  btnGenerateDialogue.disabled = true;
  if (dialogueGenerateStatus) {
    dialogueGenerateStatus.textContent = "Генерация диалога…";
  }
  try {
    const data = await generateDialogueFromPrompt();
    if (dialogueGenerateStatus) {
      const mode = dialogueIncludeImages?.checked !== false ? "с фото" : "только текст";
      const context =
        editorKind === "series" && data.contextMessageCount
          ? `, контекст: ${data.contextMessageCount} сообщ.`
          : "";
      const via = data.provider === "openrouter" ? "ChatGPT · " : "";
      const messages =
        typeof data.messageCount === "number"
          ? `, ${data.messageCount} сообщ.`
          : data.expandedFrom
            ? `, ${data.expandedFrom}→${data.messageCount ?? "?"} сообщ.`
            : "";
      dialogueGenerateStatus.textContent = `Готово (${via}${data.model}, ${mode}${context}${messages}, попыток: ${data.attempts})${
        editorKind === "shorts" && data.displayTitle ? ` · «${data.displayTitle}»` : ""
      }`;
    }
  } catch (err) {
    if (dialogueGenerateStatus) {
      dialogueGenerateStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  } finally {
    btnGenerateDialogue.disabled = false;
  }
});

btnRefineDialogue?.addEventListener("click", async () => {
  btnRefineDialogue.disabled = true;
  if (dialogueRefineStatus) {
    dialogueRefineStatus.textContent = "Доработка текста…";
  }
  try {
    const data = await refineDialogueFromPrompt();
    if (dialogueRefineStatus) {
      dialogueRefineStatus.textContent = `Готово (${data.model}, попыток: ${data.attempts})`;
    }
  } catch (err) {
    if (dialogueRefineStatus) {
      dialogueRefineStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  } finally {
    updateRefineDialogueControls();
  }
});

btnGenerateImages?.addEventListener("click", async () => {
  btnGenerateImages.disabled = true;
  if (imagesGenerateStatus) {
    imagesGenerateStatus.textContent = "Генерация изображений…";
  }
  try {
    const data = await generateMissingImages();
    const count = Array.isArray(data.logs) ? data.logs.length : 0;
    if (imagesGenerateStatus) {
      imagesGenerateStatus.textContent =
        count > 0 ? `Готово: ${count} изображени${count === 1 ? "е" : count < 5 ? "я" : "й"}` : "Нечего генерировать";
    }
  } catch (err) {
    if (imagesGenerateStatus) {
      imagesGenerateStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  } finally {
    updateGenerateImagesControls();
  }
});

const applyApiStatusToEditor = (data) => {
  if (data?.openrouter) {
    openrouterConfigured = Boolean(data.openrouter.configured);
    openrouterImageAvailable = Boolean(
      data.openrouter.imageGenerationAvailable ?? data.openrouter.configured,
    );
    if (typeof data.openrouter.textModel === "string" && data.openrouter.textModel) {
      openrouterTextModel = data.openrouter.textModel;
    }
    if (typeof data.openrouter.imageModel === "string" && data.openrouter.imageModel) {
      openrouterImageModel = data.openrouter.imageModel;
    }
  }
  updateImageProviderControls();
  updateGenerateImagesControls();
  updateDialogueGenerateControls();
  updateMessageRegenControls();
};

const updateMessageRegenControls = () => {
  const available = openrouterConfigured;
  for (const btn of document.querySelectorAll(".dialogue-msg__regen")) {
    btn.disabled = !available;
    btn.title = available
      ? "Переписать реплику (ChatGPT)"
      : "Задайте OPENROUTER_API_KEY в docs/.env";
  }
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

  const openrouter = data?.openrouter;
  const openrouterText = document.createElement("p");
  openrouterText.className = "api-status-section__text";
  if (!openrouter?.configured) {
    openrouterText.textContent = "Не настроено. Задайте OPENROUTER_API_KEY в .env.";
  } else {
    openrouterText.textContent = [
      `Текст: ${openrouter.textModel ?? openrouterTextModel}`,
      `Изображения: ${openrouter.imageModel ?? openrouterImageModel}${
        openrouter.imageGenerationAvailable ? " (доступно)" : ""
      }`,
    ].join("\n");
  }
  apiStatusContent.append(appendApiStatusSection("OpenRouter (ChatGPT)", openrouterText));
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

loadMusicTracks();
loadRenderTargets();
const loadOpenRouterStatus = async () => {
  try {
    const res = await fetch("/api/images/openrouter");
    const data = await res.json();
    applyApiStatusToEditor({openrouter: data});
  } catch {
    openrouterConfigured = false;
    openrouterImageAvailable = false;
    updateImageProviderControls();
    updateMessageRegenControls();
  }
};

loadOpenRouterStatus();
loadStylePrompt();
loadBrowseOnStartup();
