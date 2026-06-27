const jsonInput = document.getElementById("jsonInput");
const btnExample = document.getElementById("btnExample");
const btnRender = document.getElementById("btnRender");
const renderModal = document.getElementById("renderModal");
const btnRenderModalClose = document.getElementById("btnRenderModalClose");
const textGenModal = document.getElementById("textGenModal");
const textGenModalTitle = document.getElementById("textGenModalTitle");
const textGenModalStatus = document.getElementById("textGenModalStatus");
const textGenModalLog = document.getElementById("textGenModalLog");
const textGenModalSpinner = document.getElementById("textGenModalSpinner");
const btnTextGenModalClose = document.getElementById("btnTextGenModalClose");
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
const btnPublishYoutube = document.getElementById("btnPublishYoutube");
const youtubePrivacySelect = document.getElementById("youtubePrivacySelect");
const youtubePublishControl = document.getElementById("youtubePublishControl");
const youtubeLink = document.getElementById("youtubeLink");
const pathsHint = document.getElementById("pathsHint");
const wallpaperInputs = document.querySelectorAll('input[name="wallpaper"]');
const videoLayoutInputs = document.querySelectorAll('input[name="videoLayout"]');
const musicSelect = document.getElementById("musicSelect");
const renderTargetRow = document.getElementById("renderTargetRow");
const renderTargetSelect = document.getElementById("renderTargetSelect");
const introEnabled = document.getElementById("introEnabled");
const introTextInput = document.getElementById("introTextInput");
const endCardEnabled = document.getElementById("endCardEnabled");
const endCardTextInput = document.getElementById("endCardTextInput");
const messageFontSizeInput = document.getElementById("messageFontSizeInput");
const btnResetMessageFontSize = document.getElementById("btnResetMessageFontSize");
const DEFAULT_MESSAGE_FONT_SIZE = 53;
const MESSAGE_FONT_SIZE_MIN = 36;
const MESSAGE_FONT_SIZE_MAX = 80;
const dialoguePanel = document.getElementById("dialoguePanel");
const dialogueEditor = document.getElementById("dialogueEditor");
const conversationTimingPanel = document.getElementById("conversationTimingPanel");
const conversationTimingTotal = document.getElementById("conversationTimingTotal");
const timingSpeedInput = document.getElementById("timingSpeedInput");
const timingSpeedValue = document.getElementById("timingSpeedValue");
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
const dialogueStyleOption = document.getElementById("dialogueStyleOption");
const dialogueStyle = document.getElementById("dialogueStyle");
const dialogueMessageCount = document.getElementById("dialogueMessageCount");
const dialogueImageCount = document.getElementById("dialogueImageCount");
const dialogueLanguage = document.getElementById("dialogueLanguage");
const dialogueModel = document.getElementById("dialogueModel");
const dialogueModelOption = document.getElementById("dialogueModelOption");
const dialogueGenerateStatus = document.getElementById("dialogueGenerateStatus");
const dialogueRefineStatus = document.getElementById("dialogueRefineStatus");
const btnGenerateDialogue = document.getElementById("btnGenerateDialogue");
const btnCheckLogic = document.getElementById("btnCheckLogic");
const btnRegenerateEnding = document.getElementById("btnRegenerateEnding");
const preRenderChecklist = document.getElementById("preRenderChecklist");
const btnRefineDialogue = document.getElementById("btnRefineDialogue");
const btnGenerateImages = document.getElementById("btnGenerateImages");
const btnGenerateVoiceover = document.getElementById("btnGenerateVoiceover");
const imagesGenerateStatus = document.getElementById("imagesGenerateStatus");
const voiceoverGenerateStatus = document.getElementById("voiceoverGenerateStatus");
const voiceoverEnabled = document.getElementById("voiceoverEnabled");
const voiceoverThemVoice = document.getElementById("voiceoverThemVoice");
const voiceoverMeVoice = document.getElementById("voiceoverMeVoice");
const voiceoverEngineHint = document.getElementById("voiceoverEngineHint");
const dialoguePathsHint = document.getElementById("dialoguePathsHint");
const dialogueSaveStatus = document.getElementById("dialogueSaveStatus");
const btnSaveDialogue = document.getElementById("btnSaveDialogue");
const btnSaveDialoguePrompt = document.getElementById("btnSaveDialoguePrompt");
const dialoguePromptSaveStatus = document.getElementById("dialoguePromptSaveStatus");
const dialogueLogicStatus = document.getElementById("dialogueLogicStatus");
const btnNewDialogue = document.getElementById("btnNewDialogue");
const stylePromptInput = document.getElementById("stylePromptInput");
const btnSaveStylePrompt = document.getElementById("btnSaveStylePrompt");
const stylePromptStatus = document.getElementById("stylePromptStatus");
const storyStylePromptInput = document.getElementById("storyStylePromptInput");
const btnSaveStoryStylePrompt = document.getElementById("btnSaveStoryStylePrompt");
const storyStylePromptStatus = document.getElementById("storyStylePromptStatus");
const imageLightbox = document.getElementById("imageLightbox");
const lightboxImg = document.getElementById("lightboxImg");

let scanImagesTimer = null;
let pollTimer = null;
let activeRenderJobId = null;
let textGenBusy = false;
let openrouterConfigured = false;
let youtubeConfigured = false;
let lastPublishOutputFile = null;
let youtubePublishing = false;
let openrouterImageAvailable = false;
let openrouterTextModel = "openai/gpt-5.4";
let openrouterImageModel = "openai/gpt-5.4-image-2";

const canGenerateImages = () => openrouterImageAvailable;

const DEFAULT_DIALOGUE_STYLE = "fun";
const DIALOGUE_MODEL_STORAGE_KEY = "messanger.dialogueModel";
const DEFAULT_SHORTS_DIALOGUE_MODEL = "google/gemini-2.5-pro-preview";
const DEFAULT_SHORTS_MESSAGE_COUNT = 10;
const DEFAULT_SERIES_MESSAGE_COUNT = 20;
const SHORTS_STYLE_PRESETS = {
  fun: {messageCount: 10, imageCount: 0},
  mystic: {messageCount: 20, imageCount: 1},
  story: {messageCount: 12, imageCount: 0},
};
const SHORTS_PROMPT_STORAGE_KEY = "messanger.shortsPrompt";

const readLastShortsPrompt = () => localStorage.getItem(SHORTS_PROMPT_STORAGE_KEY) ?? "";

const saveLastShortsPrompt = (prompt) => {
  const trimmed = String(prompt ?? "").trim();
  if (!trimmed) {
    return;
  }
  localStorage.setItem(SHORTS_PROMPT_STORAGE_KEY, trimmed);
};

const TIMING_SPEED_STORAGE_KEY = "messanger.timingSpeed";
const MESSAGE_FONT_SIZE_STORAGE_KEY = "messanger.messageFontSize";
const DEFAULT_TIMING_SPEED = 1;
const TIMING_SPEED_UI_MIN = 0.5;
const TIMING_SPEED_UI_MAX = 2;

const clampTimingSpeed = (value) => {
  const normalized = Math.round(Number(value) * 10) / 10;
  if (!Number.isFinite(normalized)) {
    return DEFAULT_TIMING_SPEED;
  }
  return Math.min(TIMING_SPEED_UI_MAX, Math.max(TIMING_SPEED_UI_MIN, normalized));
};

const readLastTimingSpeed = () => {
  const raw = localStorage.getItem(TIMING_SPEED_STORAGE_KEY);
  if (raw == null || raw === "") {
    return DEFAULT_TIMING_SPEED;
  }
  return clampTimingSpeed(raw);
};

const saveLastTimingSpeed = (speed) => {
  localStorage.setItem(TIMING_SPEED_STORAGE_KEY, String(clampTimingSpeed(speed)));
};

const readLastMessageFontSize = () => {
  const raw = localStorage.getItem(MESSAGE_FONT_SIZE_STORAGE_KEY);
  if (raw == null || raw === "") {
    return DEFAULT_MESSAGE_FONT_SIZE;
  }
  const size = Number(raw);
  if (!Number.isFinite(size)) {
    return DEFAULT_MESSAGE_FONT_SIZE;
  }
  return Math.min(MESSAGE_FONT_SIZE_MAX, Math.max(MESSAGE_FONT_SIZE_MIN, Math.round(size)));
};

const saveLastMessageFontSize = (size) => {
  const clamped = Math.min(
    MESSAGE_FONT_SIZE_MAX,
    Math.max(MESSAGE_FONT_SIZE_MIN, Math.round(Number(size))),
  );
  if (!Number.isFinite(clamped)) {
    return;
  }
  localStorage.setItem(MESSAGE_FONT_SIZE_STORAGE_KEY, String(clamped));
};

const syncEditorPreferencesStorageFromConversation = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return;
  }
  if (parsed.timingSpeed !== undefined) {
    saveLastTimingSpeed(parsed.timingSpeed);
  }
  if (parsed.messageFontSize !== undefined) {
    saveLastMessageFontSize(parsed.messageFontSize);
  }
};

const prepareConversationForEditor = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const result = {...parsed};
  syncEditorPreferencesStorageFromConversation(result);
  if (result.timingSpeed === undefined) {
    const storedSpeed = readLastTimingSpeed();
    if (storedSpeed !== DEFAULT_TIMING_SPEED) {
      result.timingSpeed = storedSpeed;
    }
  }
  if (result.messageFontSize === undefined) {
    result.messageFontSize = readLastMessageFontSize();
  }
  return result;
};

const formatTimingSpeedLabel = (speed) => `×${Number(speed).toFixed(1)}`;

const initEditorPreferenceControls = () => {
  const speed = readLastTimingSpeed();
  if (timingSpeedInput) {
    timingSpeedInput.value = String(speed);
  }
  if (timingSpeedValue) {
    timingSpeedValue.textContent = formatTimingSpeedLabel(speed);
  }
  if (messageFontSizeInput) {
    messageFontSizeInput.value = String(readLastMessageFontSize());
  }
};

const shortsStylesMeta = {
  fun: {label: "Весёлая", wallpaper: "default", music: "fun.mp3", layout: "chat"},
  mystic: {label: "Мистика", wallpaper: "dark", music: "mystic.mp3", layout: "chat"},
  story: {label: "Сюжет+чат", wallpaper: "dark", music: "mystic.mp3", layout: "storySplit"},
};

const getDialogueLanguage = () => (dialogueLanguage?.value === "en" ? "en" : "ru");

const normalizeDialogueStyle = (value) =>
  value && value in shortsStylesMeta ? value : DEFAULT_DIALOGUE_STYLE;

let dialogueModelsCatalog = {models: [], defaultId: ""};

const getDialogueModel = () => {
  const selected = dialogueModel?.value?.trim();
  if (selected) {
    return selected;
  }
  return dialogueModelsCatalog.defaultId || openrouterTextModel;
};

const findDialogueModelLabel = (modelId) => {
  const item = dialogueModelsCatalog.models.find((entry) => entry.id === modelId);
  return item?.label ?? modelId;
};

const getDefaultMessageCount = () =>
  editorKind === "shorts" ? DEFAULT_SHORTS_MESSAGE_COUNT : DEFAULT_SERIES_MESSAGE_COUNT;

const getDefaultDialogueModel = () =>
  editorKind === "shorts"
    ? DEFAULT_SHORTS_DIALOGUE_MODEL
    : dialogueModelsCatalog.defaultId || openrouterTextModel;

const populateDialogueModelOptions = (preferredId) => {
  if (!dialogueModel) {
    return;
  }
  const models = dialogueModelsCatalog.models ?? [];
  const envDefaultId = dialogueModelsCatalog.defaultId || openrouterTextModel;
  const kindDefaultId = getDefaultDialogueModel();
  const stored = localStorage.getItem(DIALOGUE_MODEL_STORAGE_KEY);
  const resolved =
    (preferredId && models.some((item) => item.id === preferredId) ? preferredId : null) ||
    (editorKind === "shorts" &&
    models.some((item) => item.id === DEFAULT_SHORTS_DIALOGUE_MODEL)
      ? DEFAULT_SHORTS_DIALOGUE_MODEL
      : null) ||
    (stored && models.some((item) => item.id === stored) ? stored : null) ||
    (models.some((item) => item.id === kindDefaultId) ? kindDefaultId : null) ||
    (models.some((item) => item.id === envDefaultId) ? envDefaultId : models[0]?.id) ||
    envDefaultId;

  dialogueModel.replaceChildren();
  for (const item of models) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.label || item.id;
    if (item.hint) {
      opt.title = item.hint;
    }
    dialogueModel.append(opt);
  }
  if (resolved && [...dialogueModel.options].some((opt) => opt.value === resolved)) {
    dialogueModel.value = resolved;
  }
  dialogueModel.disabled = !openrouterConfigured || models.length === 0;
};

const loadDialogueModels = async () => {
  try {
    const res = await fetch("/api/openrouter/dialogue-models");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить модели");
    }
    dialogueModelsCatalog = {
      models: Array.isArray(data.models) ? data.models : [],
      defaultId: data.defaultId ?? openrouterTextModel,
    };
    populateDialogueModelOptions();
  } catch (err) {
    if (dialogueModel) {
      dialogueModel.replaceChildren();
      const opt = document.createElement("option");
      opt.value = openrouterTextModel || "";
      opt.textContent = openrouterTextModel || "Ошибка загрузки";
      dialogueModel.append(opt);
      dialogueModel.disabled = true;
      dialogueModel.title = err instanceof Error ? err.message : String(err);
    }
  }
};

dialogueModel?.addEventListener("change", () => {
  if (dialogueModel?.value) {
    localStorage.setItem(DIALOGUE_MODEL_STORAGE_KEY, dialogueModel.value);
  }
});

dialoguePromptInput?.addEventListener("input", () => {
  if (editorKind === "shorts") {
    saveLastShortsPrompt(dialoguePromptInput.value);
  }
});

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
let editorImageDraftNamespace = `shorts-draft-${Date.now().toString(36)}`;
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
const getStoryStylePrompt = () => storyStylePromptInput?.value.trim() ?? "";

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
  if (dialogueStyleOption) {
    dialogueStyleOption.hidden = isSeries;
  }
  if (dialoguePromptHint) {
    dialoguePromptHint.textContent = isSeries
      ? "Генерация через ChatGPT (OpenRouter). Задание для части серии — например: «Часть 3: Даня палится современными словами…»"
      : "Ваше задание для Shorts. Стиль подмешивается на сервере автоматически.";
  }
  if (dialoguePromptInput) {
    dialoguePromptInput.placeholder = isSeries
      ? "Опишите часть истории, героев и финал сцены…"
      : "Опишите сюжет, героев и желаемый финал…";
  }
  if (dialogueTitleHint) {
    dialogueTitleHint.textContent = isSeries
      ? "Для сериала — латиница, например poka_v_sssr_part3"
      : "На русском; в базу и в json/out сохранится транслитом";
  }
  if (dialogueTitleInput) {
    dialogueTitleInput.placeholder = isSeries ? "poka_v_sssr_part3" : "Когда кот сел на клавиатуру";
  }
  if (preRenderChecklist && isSeries) {
    preRenderChecklist.hidden = true;
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
  updateLogicControls();
};

const updateLogicControls = () => {
  if (!btnCheckLogic) {
    return;
  }
  const hasJson = Boolean(jsonInput.value.trim());
  const llmReady = canGenerateDialogue();
  btnCheckLogic.disabled = !hasJson || !llmReady;
  btnCheckLogic.title = !llmReady
    ? "Задайте OPENROUTER_API_KEY в docs/.env"
    : hasJson
      ? "Проверить и исправить логику диалога"
      : "Сначала нужен JSON переписки";
  if (btnRegenerateEnding) {
    btnRegenerateEnding.disabled = !hasJson || !llmReady || editorKind !== "shorts";
    btnRegenerateEnding.title = !llmReady
      ? "Задайте OPENROUTER_API_KEY в docs/.env"
      : hasJson
        ? "Переписать только последние 3 реплики"
        : "Сначала нужен JSON переписки";
  }
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

const resetWorkflowControls = () => {
  lastPublishOutputFile = null;
  if (downloadBlock) {
    downloadBlock.hidden = true;
  }
  if (youtubeLink) {
    youtubeLink.hidden = true;
  }
  if (dialogueGenerateStatus) {
    dialogueGenerateStatus.textContent = canGenerateDialogue()
      ? ""
      : "Задайте OPENROUTER_API_KEY в docs/.env (ключ: openrouter.ai/keys), затем «Обновить» на вкладке API или перезапустите npm run ui";
  }
  if (dialogueRefineStatus) {
    dialogueRefineStatus.textContent = "";
  }
  if (imagesGenerateStatus) {
    imagesGenerateStatus.textContent = "";
  }
  if (dialogueLogicStatus) {
    dialogueLogicStatus.textContent = "";
  }
  updateGenerateImagesControls(null);
  updateRefineDialogueControls();
  updateYoutubePublishControls();
};
const captureEditorSnapshot = () => ({
  dialogueId: currentDialogueId,
  title: dialogueTitleInput.value,
  prompt: dialoguePromptInput?.value ?? "",
  json: jsonInput.value,
  outputFile: currentDialogueOutputFile,
  dialogueStyle: normalizeDialogueStyle(dialogueStyle?.value),
  dialogueModel: getDialogueModel(),
  messageCount: Number(dialogueMessageCount?.value ?? getDefaultMessageCount()) || getDefaultMessageCount(),
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
    if (editorKind === "shorts" && !dialoguePromptInput.value.trim()) {
      dialoguePromptInput.value = readLastShortsPrompt();
    }
  }
  if (dialogueStyle) {
    dialogueStyle.value = normalizeDialogueStyle(snapshot?.dialogueStyle);
  }
  populateDialogueModelOptions(snapshot?.dialogueModel);
  if (dialogueMessageCount && snapshot?.messageCount) {
    dialogueMessageCount.value = String(snapshot.messageCount);
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
  if (editorKind === "shorts") {
    applyShortsStyleDefaults();
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
  const conversation = prepareConversationForEditor(dialogue.conversation ?? {});
  jsonInput.value = JSON.stringify(conversation, null, 2);
  dialogueTitleInput.value = dialogue.titleDisplay || dialogue.title || "";
  if (dialoguePromptInput) {
    const fromDb = dialogue.dialoguePrompt ?? "";
    if (editorKind === "shorts") {
      dialoguePromptInput.value = fromDb.trim() || readLastShortsPrompt();
      saveLastShortsPrompt(dialoguePromptInput.value);
    } else {
      dialoguePromptInput.value = fromDb;
    }
  }
  if (seriesIdInput) {
    seriesIdInput.value = dialogue.seriesId || "usssr";
  }
  currentPartNumber = dialogue.partNumber ?? null;
  updateSeriesPartHint();
  currentDialogueOutputFile = dialogue.outputFile ?? null;
  lastPublishOutputFile = null;
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
  syncMessageFontSizeFromJson();
  syncVoiceoverFromJson();
  if (editorKind === "shorts") {
    applyMessengerLocaleToJson();
  }
  showExistingOutputDownload();
};

const showExistingOutputDownload = () => {
  if (!downloadBlock || !downloadLink) {
    return;
  }
  if (!currentDialogueOutputFile || lastPublishOutputFile) {
    updateYoutubePublishControls();
    return;
  }
  downloadBlock.hidden = false;
  downloadLink.href = `/out/${currentDialogueOutputFile}`;
  downloadLink.textContent = `Открыть out/${currentDialogueOutputFile}`;
  downloadLink.removeAttribute("download");
  if (pathsHint) {
    pathsHint.textContent = `Готовый MP4: out/${currentDialogueOutputFile}`;
  }
  if (youtubeLink) {
    youtubeLink.hidden = true;
  }
  updateYoutubePublishControls();
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
  resetEditorImageDraftNamespace();
  dialogueTitleInput.value = "";
  if (dialoguePromptInput) {
    dialoguePromptInput.value =
      editorKind === "shorts" ? readLastShortsPrompt() : "";
  }
  if (dialoguePromptSaveStatus) {
    dialoguePromptSaveStatus.textContent = "";
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
  resetWorkflowControls();
  if (editorKind === "shorts") {
    applyShortsStyleDefaults();
    applyShortsGenDefaults();
  }
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

const loadStoryStylePrompt = async () => {
  try {
    const res = await fetch("/api/prompts/story-image-style");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить промпт сюжета");
    }
    if (storyStylePromptInput) {
      storyStylePromptInput.value = data.content ?? "";
    }
    if (storyStylePromptStatus) {
      storyStylePromptStatus.textContent =
        res.ok && data.content ? "Промпт сюжета загружен" : "";
    }
  } catch (err) {
    if (storyStylePromptStatus) {
      storyStylePromptStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  }
};

const saveStoryStylePrompt = async () => {
  const content = getStoryStylePrompt();
  if (!content) {
    storyStylePromptStatus.textContent = "Промпт не может быть пустым";
    return;
  }
  btnSaveStoryStylePrompt.disabled = true;
  storyStylePromptStatus.textContent = "Сохранение…";
  try {
    const res = await fetch("/api/prompts/story-image-style", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({content}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка сохранения");
    }
    storyStylePromptInput.value = data.content ?? content;
    storyStylePromptStatus.textContent =
      res.ok && data.content ? "Промпт сюжета сохранён" : "Сохранено";
  } catch (err) {
    storyStylePromptStatus.textContent = err instanceof Error ? err.message : String(err);
  } finally {
    btnSaveStoryStylePrompt.disabled = false;
  }
};

btnSaveStoryStylePrompt?.addEventListener("click", saveStoryStylePrompt);

const loadShortsStyles = async () => {
  try {
    const res = await fetch("/api/shorts/styles");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить стили Shorts");
    }
    if (data.styles && typeof data.styles === "object") {
      Object.assign(shortsStylesMeta, data.styles);
      populateDialogueStyleOptions();
    }
  } catch {
    populateDialogueStyleOptions();
  }
};

const updatePreRenderChecklistUI = (result) => {
  if (!preRenderChecklist) {
    return;
  }
  preRenderChecklist.replaceChildren();
  const lines = [...(result?.warnings ?? []), ...(result?.tips ?? [])];
  if (lines.length === 0) {
    preRenderChecklist.hidden = true;
    return;
  }
  for (const line of lines) {
    const p = document.createElement("p");
    p.className = (result?.warnings ?? []).includes(line)
      ? "pre-render-checklist__warn"
      : "pre-render-checklist__tip";
    p.textContent = line;
    preRenderChecklist.append(p);
  }
  preRenderChecklist.hidden = editorKind !== "shorts";
};

const prepareJsonForRender = () => {
  applyMessengerLocaleToJson();
  applyMessageFontSizeToJson();
  const json = jsonInput.value.trim();
  if (!json) {
    return "";
  }
  try {
    const parsed = prepareConversationForEditor(JSON.parse(json));
    const speed = clampTimingSpeed(timingSpeedInput?.value ?? readLastTimingSpeed());
    saveLastTimingSpeed(speed);
    if (speed === DEFAULT_TIMING_SPEED) {
      delete parsed.timingSpeed;
    } else {
      parsed.timingSpeed = speed;
    }
    if ("hookText" in parsed) {
      delete parsed.hookText;
    }
    jsonInput.value = JSON.stringify(parsed, null, 2);
    return jsonInput.value.trim();
  } catch {
    return json;
  }
};

const applyGeneratedDialogue = async (data) => {
  const conversation = prepareConversationForEditor(data.conversation);
  jsonInput.value = JSON.stringify(conversation, null, 2);
  applyMessengerLocaleToJson();
  if (editorKind === "shorts" && data.displayTitle) {
    dialogueTitleInput.value = data.displayTitle;
    updateProjectPathsHint();
  }
  syncTitleCardFieldsFromJson();
  await refreshDialogue();
  updateGenerateImagesControls(data.conversation);
  updateRefineDialogueControls();
};

const runPreRenderCheck = async (json, displayTitle) => {
  if (editorKind !== "shorts") {
    return true;
  }
  try {
    const res = await fetch("/api/shorts/pre-render-check", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({json, displayTitle}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "check");
    }
    updatePreRenderChecklistUI(data);
    if (Array.isArray(data.warnings) && data.warnings.length > 0) {
      const proceed = window.confirm(
        `Перед рендером:\n\n${data.warnings.map((w) => `• ${w}`).join("\n")}\n\nВсё равно собрать видео?`,
      );
      return proceed;
    }
    return true;
  } catch {
    return true;
  }
};

const saveDialoguePromptOnly = async () => {
  const prompt = dialoguePromptInput?.value.trim() ?? "";
  if (!prompt) {
    if (dialoguePromptSaveStatus) {
      dialoguePromptSaveStatus.textContent = "Промпт не может быть пустым";
    }
    return;
  }

  const json = jsonInput.value.trim();
  if (!currentDialogueId) {
    if (!json) {
      if (dialoguePromptSaveStatus) {
        dialoguePromptSaveStatus.textContent = "Сначала вставьте JSON и сохраните диалог целиком";
      }
      return;
    }
    if (dialoguePromptSaveStatus) {
      dialoguePromptSaveStatus.textContent = "Сохранение…";
    }
    try {
      await saveCurrentDialogue();
      if (dialoguePromptSaveStatus) {
        dialoguePromptSaveStatus.textContent = "Промпт сохранён вместе с диалогом";
      }
    } catch (err) {
      if (dialoguePromptSaveStatus) {
        dialoguePromptSaveStatus.textContent = err instanceof Error ? err.message : String(err);
      }
    }
    return;
  }

  if (!json) {
    if (dialoguePromptSaveStatus) {
      dialoguePromptSaveStatus.textContent = "Нужен JSON переписки для сохранения";
    }
    return;
  }

  if (btnSaveDialoguePrompt) {
    btnSaveDialoguePrompt.disabled = true;
  }
  if (dialoguePromptSaveStatus) {
    dialoguePromptSaveStatus.textContent = "Сохранение…";
  }
  try {
    const res = await fetch(`/api/dialogues/${currentDialogueId}`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ...resolveTitlePayload(),
        json,
        wallpaper: getWallpaper(),
        music: getMusicId(),
        dialoguePrompt: prompt,
        kind: editorKind,
        seriesId: editorKind === "series" ? (seriesIdInput?.value.trim() ?? "") : "",
        partNumber: editorKind === "series" ? currentPartNumber : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка сохранения промпта");
    }
    editorSnapshots[editorKind] = captureEditorSnapshot();
    if (dialoguePromptSaveStatus) {
      dialoguePromptSaveStatus.textContent = `Сохранено ${formatDate(data.updatedAt)}`;
    }
  } catch (err) {
    if (dialoguePromptSaveStatus) {
      dialoguePromptSaveStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (btnSaveDialoguePrompt) {
      btnSaveDialoguePrompt.disabled = false;
    }
  }
};

btnSaveDialoguePrompt?.addEventListener("click", saveDialoguePromptOnly);

const getWallpaper = () => {
  const checked = document.querySelector('input[name="wallpaper"]:checked');
  return checked?.value === "dark" ? "dark" : "default";
};

const setWallpaper = (mode) => {
  for (const input of wallpaperInputs) {
    input.checked = input.value === mode;
  }
};

const getVideoLayout = () => {
  const checked = [...videoLayoutInputs].find((input) => input.checked);
  return checked?.value === "storySplit" ? "storySplit" : "chat";
};

const setVideoLayout = (layout) => {
  const value = layout === "storySplit" ? "storySplit" : "chat";
  for (const input of videoLayoutInputs) {
    input.checked = input.value === value;
  }
};

const applyVideoLayoutToJson = (layout = getVideoLayout()) => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  if (layout === "storySplit") {
    parsed.layout = "storySplit";
    if (!parsed.story) {
      parsed.story = {};
    }
    if (!parsed.story.opening) {
      parsed.story.opening = {};
    }
    if (!parsed.story.opening.animation) {
      parsed.story.opening.animation = "parallax";
    }
    if (Array.isArray(parsed.messages)) {
      for (const message of parsed.messages) {
        delete message.image;
        delete message.imagePrompt;
        delete message.imageEditPrompt;
      }
    }
  } else {
    parsed.layout = "chat";
    delete parsed.story;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
  updateGenerateImagesControls(parsed);
};

const syncVideoLayoutFromJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  setVideoLayout(parsed.layout === "storySplit" ? "storySplit" : "chat");
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

const syncMessageFontSizeFromJson = () => {
  if (!messageFontSizeInput) {
    return;
  }
  const parsed = parseConversationJson();
  const value =
    typeof parsed?.messageFontSize === "number" && !Number.isNaN(parsed.messageFontSize)
      ? parsed.messageFontSize
      : readLastMessageFontSize();
  messageFontSizeInput.value = String(value);
};

const applyMessageFontSizeToJson = () => {
  if (!messageFontSizeInput) {
    return;
  }
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const raw = messageFontSizeInput.value.trim();
  if (!raw) {
    delete parsed.messageFontSize;
    saveLastMessageFontSize(DEFAULT_MESSAGE_FONT_SIZE);
  } else {
    const size = Number(raw);
    if (Number.isNaN(size)) {
      return;
    }
    const clamped = Math.min(MESSAGE_FONT_SIZE_MAX, Math.max(MESSAGE_FONT_SIZE_MIN, Math.round(size)));
    parsed.messageFontSize = clamped;
    messageFontSizeInput.value = String(clamped);
    saveLastMessageFontSize(clamped);
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
};

  jsonInput.value = JSON.stringify(parsed, null, 2);
};

const syncVoiceoverFromJson = () => {
  const parsed = parseConversationJson();
  const voiceover = parsed?.voiceover ?? {};
  if (voiceoverEnabled) {
    voiceoverEnabled.checked = Boolean(voiceover.enabled);
  }
  if (voiceoverThemVoice) {
    voiceoverThemVoice.value = voiceover.themVoice === "male" ? "male" : "female";
  }
  if (voiceoverMeVoice) {
    voiceoverMeVoice.value = voiceover.meVoice === "female" ? "female" : "male";
  }
};

const applyVoiceoverToJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const enabled = Boolean(voiceoverEnabled?.checked);
  if (!enabled) {
    if (parsed.voiceover) {
      parsed.voiceover = {...parsed.voiceover, enabled: false};
    }
  } else {
    parsed.voiceover = {
      ...(parsed.voiceover ?? {}),
      enabled: true,
      provider: parsed.voiceover?.provider ?? "silero",
      themVoice: voiceoverThemVoice?.value === "male" ? "male" : "female",
      meVoice: voiceoverMeVoice?.value === "female" ? "female" : "male",
    };
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
  updateGenerateVoiceoverControls(parsed);
};

const countPendingVoiceover = (conversation) => {
  if (!conversation?.messages?.length) {
    return 0;
  }
  const enabled = Boolean(conversation.voiceover?.enabled);
  if (!enabled) {
    return 0;
  }
  let pending = 0;
  for (const message of conversation.messages) {
    const text = String(message.text ?? "").trim();
    if (!text) {
      continue;
    }
    if (!String(message.voiceAudio ?? "").trim()) {
      pending += 1;
    }
  }
  return pending;
};

const updateGenerateVoiceoverControls = (conversation = null) => {
  if (!btnGenerateVoiceover) {
    return;
  }
  const parsed = conversation ?? parseConversationJson();
  const pending = countPendingVoiceover(parsed);
  const enabled = Boolean(parsed?.voiceover?.enabled);
  btnGenerateVoiceover.disabled = !enabled || pending === 0;
  if (!enabled) {
    btnGenerateVoiceover.title = "Включите озвучку в левой колонке";
  } else if (pending === 0) {
    btnGenerateVoiceover.title = "Все реплики с текстом уже озвучены";
  } else {
    btnGenerateVoiceover.title = `Озвучить ${pending} реплик${pending === 1 ? "у" : pending < 5 ? "и" : ""} (локально)`;
  }
};

const loadVoiceoverEngineStatus = async () => {
  if (!voiceoverEngineHint) {
    return;
  }
  try {
    const res = await fetch("/api/voiceover/status");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "status");
    }
    if (data.silero?.ok) {
      voiceoverEngineHint.textContent =
        "Движок Silero готов: естественный русский, мужской и женский голоса (aidar, xenia…).";
    } else if (data.recommended === "mms") {
      voiceoverEngineHint.textContent =
        `Silero не установлен — будет запасной MMS (один голос). ${data.installHint ?? ""}`;
    } else {
      voiceoverEngineHint.textContent = data.installHint ?? "Проверьте scripts/tts/requirements.txt";
    }
  } catch {
    voiceoverEngineHint.textContent =
      "Локальная озвучка: pip3 install -r scripts/tts/requirements.txt";
  }
};

const generateMissingVoiceover = async () => {
  applyVoiceoverToJson();
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала нужен JSON переписки");
  }
  const res = await fetch("/api/voiceover/generate-missing", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      audioNamespace: resolveEditorImageNamespace(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка озвучки");
  }
  if (data.conversation) {
    jsonInput.value = JSON.stringify(data.conversation, null, 2);
    syncVoiceoverFromJson();
    await refreshDialogue();
    updateGenerateImagesControls(data.conversation);
    updateGenerateVoiceoverControls(data.conversation);
  }
  return data;
};

const getMusicId = () => musicSelect.value;

const setMusicId = (id) => {
  if ([...musicSelect.options].some((o) => o.value === id)) {
    musicSelect.value = id;
  }
};

const getShortsStyleMeta = () => {
  if (editorKind !== "shorts") {
    return null;
  }
  return shortsStylesMeta[normalizeDialogueStyle(dialogueStyle?.value)] ?? null;
};

const populateDialogueStyleOptions = () => {
  if (!dialogueStyle) {
    return;
  }
  const current = normalizeDialogueStyle(dialogueStyle.value);
  dialogueStyle.replaceChildren();
  for (const [id, meta] of Object.entries(shortsStylesMeta)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = meta.label ?? id;
    dialogueStyle.append(opt);
  }
  dialogueStyle.value = current in shortsStylesMeta ? current : DEFAULT_DIALOGUE_STYLE;
};

const applyShortsStyleDefaults = () => {
  const style = normalizeDialogueStyle(dialogueStyle?.value);
  const preset = SHORTS_STYLE_PRESETS[style] ?? SHORTS_STYLE_PRESETS.fun;
  if (dialogueMessageCount) {
    dialogueMessageCount.value = String(preset.messageCount);
  }
  if (dialogueImageCount) {
    dialogueImageCount.value = String(preset.imageCount);
  }
  const meta = getShortsStyleMeta();
  if (!meta) {
    return;
  }
  if (meta.wallpaper) {
    setWallpaper(meta.wallpaper);
  }
  if (meta.music) {
    setMusicId(meta.music);
  }
  if (meta.layout) {
    setVideoLayout(meta.layout);
    applyVideoLayoutToJson(meta.layout);
  }
};

const applyShortsGenDefaults = () => {
  if (dialogueMessageCount) {
    dialogueMessageCount.value = String(DEFAULT_SHORTS_MESSAGE_COUNT);
  }
  populateDialogueModelOptions(DEFAULT_SHORTS_DIALOGUE_MODEL);
};

dialogueStyle?.addEventListener("change", () => {
  applyShortsStyleDefaults();
});

dialogueLanguage?.addEventListener("change", () => {
  if (editorKind === "shorts" && jsonInput.value.trim()) {
    applyMessengerLocaleToJson();
  }
});

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
    applyShortsStyleDefaults();
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

const resetEditorImageDraftNamespace = () => {
  editorImageDraftNamespace = `shorts-draft-${Date.now().toString(36)}`;
};

const resolveEditorImageNamespace = () => {
  const raw = dialogueTitleInput?.value?.trim() || currentDialogueId || editorImageDraftNamespace;
  const slug = slugifyProjectName(raw);
  return slug === "render" ? editorImageDraftNamespace : slug;
};

const buildEditorImageRef = (messageIndex) =>
  `images/${resolveEditorImageNamespace()}/msg-${messageIndex + 1}.png`;

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

const buildEditorStoryRef = (messageIndex) =>
  `images/${resolveEditorImageNamespace()}/story-msg-${messageIndex + 1}.png`;

const buildEditorStoryOpeningRef = () =>
  `images/${resolveEditorImageNamespace()}/story-opening.png`;

const setJsonStoryImage = (messageIndex, publicPath) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages) || !parsed.messages[messageIndex]) {
      return;
    }
    parsed.messages[messageIndex].storyImage = publicPath;
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const setJsonStoryImagePrompt = (messageIndex, storyImagePrompt) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!Array.isArray(parsed.messages) || !parsed.messages[messageIndex]) {
      return;
    }
    const trimmed = String(storyImagePrompt ?? "").trim();
    if (trimmed) {
      parsed.messages[messageIndex].storyImagePrompt = trimmed;
    } else {
      delete parsed.messages[messageIndex].storyImagePrompt;
    }
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const setJsonStoryOpeningImage = (publicPath) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!parsed.story) {
      parsed.story = {};
    }
    if (!parsed.story.opening) {
      parsed.story.opening = {};
    }
    parsed.story.opening.image = publicPath;
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const setJsonStoryOpeningPrompt = (imagePrompt) => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!parsed.story) {
      parsed.story = {};
    }
    if (!parsed.story.opening) {
      parsed.story.opening = {};
    }
    const trimmed = String(imagePrompt ?? "").trim();
    if (trimmed) {
      parsed.story.opening.imagePrompt = trimmed;
    } else {
      delete parsed.story.opening.imagePrompt;
    }
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch {
    /* ignore */
  }
};

const storyImagePromptSaveTimers = new Map();
const storyOpeningPromptSaveTimer = {id: null};

const imagePromptSaveTimers = new Map();
const imageEditPromptSaveTimers = new Map();

const isImageUrl = (ref) => /^https?:\/\//i.test(String(ref ?? "").trim());

/** Убирает LLM-плейсхолдеры в квадратных скобках из текста сообщения. */
const sanitizeMessageText = (text) =>
  String(text ?? "")
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeConversationTexts = (conversation) => {
  if (!conversation?.messages?.length) {
    return false;
  }
  let changed = false;
  for (const message of conversation.messages) {
    const cleaned = sanitizeMessageText(message.text);
    if (cleaned !== String(message.text ?? "")) {
      message.text = cleaned;
      changed = true;
    }
  }
  return changed;
};

let messageTimingPreview = null;

const setTimingSpeedInJson = (speed) => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const normalized = clampTimingSpeed(speed);
  saveLastTimingSpeed(normalized);
  if (parsed.timing) {
    delete parsed.timing;
  }
  for (const message of parsed.messages ?? []) {
    delete message.pauseBeforeMs;
    delete message.typingMs;
    delete message.postRevealMs;
  }
  if (normalized === DEFAULT_TIMING_SPEED) {
    delete parsed.timingSpeed;
  } else {
    parsed.timingSpeed = normalized;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
  scheduleRefreshDialogue();
};

timingSpeedInput?.addEventListener("input", () => {
  const speed = Number(timingSpeedInput.value);
  if (timingSpeedValue) {
    timingSpeedValue.textContent = formatTimingSpeedLabel(speed);
  }
  setTimingSpeedInJson(speed);
});

const renderConversationTimingPanel = (conversation, timingPreview) => {
  if (!conversationTimingPanel) {
    return;
  }

  if (!conversation?.messages?.length) {
    conversationTimingPanel.hidden = true;
    return;
  }

  conversationTimingPanel.hidden = false;

  const speed = conversation.timingSpeed ?? readLastTimingSpeed();
  if (timingSpeedInput && document.activeElement !== timingSpeedInput) {
    timingSpeedInput.value = String(speed);
  }
  if (timingSpeedValue && document.activeElement !== timingSpeedInput) {
    timingSpeedValue.textContent = formatTimingSpeedLabel(speed);
  }

  if (conversationTimingTotal) {
    const videoSec =
      timingPreview?.totalVideoMs != null
        ? (timingPreview.totalVideoMs / 1000).toFixed(1)
        : null;
    const msgSec =
      timingPreview?.totalMessagesMs != null
        ? (timingPreview.totalMessagesMs / 1000).toFixed(1)
        : null;
    if (videoSec != null && msgSec != null) {
      conversationTimingTotal.textContent = `Весь ролик: ~${videoSec} с · переписка ~${msgSec} с`;
    } else if (msgSec != null) {
      conversationTimingTotal.textContent = `Переписка в ролике: ~${msgSec} с`;
    } else {
      conversationTimingTotal.textContent = "";
    }
  }
};

const setMessageTextInJson = (messageIndex, newText) => {
  const parsed = parseConversationJson();
  if (!parsed?.messages?.[messageIndex]) {
    return;
  }
  parsed.messages[messageIndex].text = newText;
  jsonInput.value = JSON.stringify(parsed, null, 2);
  updateLogicControls();
  updateGenerateImagesControls(parsed);
};

const autoResizeMessageTextarea = (textarea) => {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
};

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

const applyMessengerLocaleToJson = () => {
  if (editorKind !== "shorts") {
    return;
  }
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const isEn = getDialogueLanguage() === "en";
  parsed.locale = isEn ? "en" : "ru";
  parsed.contactStatus = isEn ? "online" : "в сети";
  parsed.contactStatusTyping = isEn ? "typing..." : "печатает...";
  if (isEn) {
    if (!parsed.myName || parsed.myName === "Я" || parsed.myName === "Алиса") {
      parsed.myName = "Me";
    }
  } else if (parsed.myName === "Me") {
    parsed.myName = "Я";
  }
  if (parsed.outro?.enabled) {
    parsed.outro = {
      ...(parsed.outro ?? {}),
      enabled: true,
      text: parsed.outro?.text ?? (isEn ? "Subscribe :)" : "Подпишись :)"),
      pauseBeforeMs: parsed.outro?.pauseBeforeMs ?? 700,
      durationMs: parsed.outro?.durationMs ?? 2800,
    };
  } else {
    delete parsed.outro;
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
    parsed.messages[messageIndex].image = buildEditorImageRef(messageIndex);
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
  const targetRef = item.kind === "local" && item.hasImagePath ? item.ref : buildEditorImageRef(item.messageIndex);
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

const renderStoryImageSlot = ({messageIndex, message, title}) => {
  const slot = document.createElement("div");
  slot.className = "image-slot image-slot--story";
  slot.dataset.storySlotIndex = String(messageIndex ?? "opening");

  const head = document.createElement("div");
  head.className = "image-slot__head";
  head.innerHTML = `<strong>${title}</strong>`;
  slot.append(head);

  const promptInput = document.createElement("textarea");
  promptInput.className = "image-slot__prompt textarea";
  promptInput.rows = 3;
  promptInput.placeholder = "Описание кадра сюжета для верхней панели…";
  const promptValue =
    messageIndex == null
      ? String(message?.story?.opening?.imagePrompt ?? "").trim()
      : String(message?.storyImagePrompt ?? "").trim();
  promptInput.value = promptValue;
  promptInput.addEventListener("input", () => {
    const timerKey = messageIndex == null ? "opening" : messageIndex;
    if (messageIndex == null) {
      if (storyOpeningPromptSaveTimer.id) {
        clearTimeout(storyOpeningPromptSaveTimer.id);
      }
      storyOpeningPromptSaveTimer.id = setTimeout(() => {
        storyOpeningPromptSaveTimer.id = null;
        setJsonStoryOpeningPrompt(promptInput.value);
        updateGenerateImagesControls();
      }, 400);
    } else {
      if (storyImagePromptSaveTimers.has(timerKey)) {
        clearTimeout(storyImagePromptSaveTimers.get(timerKey));
      }
      storyImagePromptSaveTimers.set(
        timerKey,
        setTimeout(() => {
          storyImagePromptSaveTimers.delete(timerKey);
          setJsonStoryImagePrompt(messageIndex, promptInput.value);
          updateGenerateImagesControls();
        }, 400),
      );
    }
  });
  slot.append(promptInput);

  const imagePath =
    messageIndex == null
      ? String(message?.story?.opening?.image ?? "").trim()
      : String(message?.storyImage ?? "").trim();

  if (imagePath) {
    const preview = document.createElement("img");
    preview.className = "image-slot__preview";
    preview.alt = title;
    preview.loading = "lazy";
    preview.src = `/${imagePath.replace(/^\/+/, "")}`;
    preview.addEventListener("click", () => openImageLightbox(preview.src));
    slot.append(preview);
  }

  const actions = document.createElement("div");
  actions.className = "image-slot__actions";

  const btnGenerate = document.createElement("button");
  btnGenerate.type = "button";
  btnGenerate.className = "btn btn-primary btn-small";
  btnGenerate.textContent = "Сгенерировать";
  btnGenerate.disabled = !canGenerateImages();
  btnGenerate.addEventListener("click", async () => {
    btnGenerate.disabled = true;
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          json: jsonInput.value,
          messageIndex: messageIndex ?? undefined,
          imageKind: messageIndex == null ? "story-opening" : "story",
          prompt: promptInput.value.trim() || undefined,
          targetRef:
            messageIndex == null ? buildEditorStoryOpeningRef() : buildEditorStoryRef(messageIndex),
          aspectRatio: "5:4",
          stylePrompt: getStoryStylePrompt(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Ошибка генерации");
      }
      if (messageIndex == null) {
        setJsonStoryOpeningImage(data.publicPath);
      } else {
        setJsonStoryImage(messageIndex, data.publicPath);
      }
      if (data.imagePrompt) {
        promptInput.value = data.imagePrompt;
        if (messageIndex == null) {
          setJsonStoryOpeningPrompt(data.imagePrompt);
        } else {
          setJsonStoryImagePrompt(messageIndex, data.imagePrompt);
        }
      }
      await refreshDialogue();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      btnGenerate.disabled = !canGenerateImages();
    }
  });
  actions.append(btnGenerate);

  if (messageIndex != null) {
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-secondary btn-small";
    btnAdd.textContent = "+ Сюжетный кадр";
    btnAdd.hidden = Boolean(promptValue);
    btnAdd.addEventListener("click", () => {
      setJsonStoryImagePrompt(messageIndex, "Рисованный кадр сцены в момент этой реплики.");
      refreshDialogue();
    });
    actions.append(btnAdd);
  }

  slot.append(actions);
  return slot;
};

const renderStoryOpeningPanel = (conversation) => {
  const panel = document.createElement("section");
  panel.className = "dialogue-editor__story-opening";
  const title = document.createElement("h3");
  title.className = "dialogue-editor__story-title";
  title.textContent = "Opening scene (полный экран до чата)";
  panel.append(title);
  panel.append(
    renderStoryImageSlot({
      messageIndex: null,
      message: conversation,
      title: "story.opening",
    }),
  );
  return panel;
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
  ref.textContent = item.hasImagePath ? item.ref : buildEditorImageRef(item.messageIndex);
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
    ref: buildEditorImageRef(messageIndex),
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
      await runTextGenTask({
        title: `Реплика №${messageIndex + 1}`,
        runningLabel: "ChatGPT переписывает сообщение…",
        task: () => regenerateMessageFromIndex(messageIndex),
        onSuccess: (data) => formatRegenerateMessageResult(data, messageIndex),
      });
    } catch {
      // ошибка уже в модальном окне
    } finally {
      btnRegen.disabled = !openrouterConfigured;
      btnRegen.title = prevTitle;
    }
  });
  head.append(btnRegen);

  inner.append(head);

  const bubble = document.createElement("div");
  bubble.className = "dialogue-msg__bubble dialogue-msg__bubble--edit";
  const textarea = document.createElement("textarea");
  textarea.className = "dialogue-msg__bubble-text";
  textarea.rows = 2;
  textarea.value = messageText;
  textarea.placeholder = "Текст сообщения…";
  textarea.dataset.messageTextIndex = String(messageIndex);
  textarea.addEventListener("input", () => {
    autoResizeMessageTextarea(textarea);
    setMessageTextInJson(messageIndex, textarea.value);
  });
  textarea.addEventListener("blur", () => {
    const cleaned = sanitizeMessageText(textarea.value);
    if (cleaned !== textarea.value) {
      textarea.value = cleaned;
      setMessageTextInJson(messageIndex, cleaned);
    }
    autoResizeMessageTextarea(textarea);
  });
  bubble.append(textarea);
  inner.append(bubble);
  requestAnimationFrame(() => autoResizeMessageTextarea(textarea));

  const conversation = parseConversationJson();
  const isStorySplit = conversation?.layout === "storySplit";

  if (!isStorySplit) {
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
  }

  if (isStorySplit) {
    if (message.storyImage?.trim() || message.storyImagePrompt?.trim()) {
      inner.append(
        renderStoryImageSlot({
          messageIndex,
          message,
          title: `Сюжет сверху · №${messageIndex + 1}`,
        }),
      );
    } else {
      const addStoryRow = document.createElement("div");
      addStoryRow.className = "dialogue-msg__add-image";
      const btnAddStory = document.createElement("button");
      btnAddStory.type = "button";
      btnAddStory.className = "btn btn-secondary btn-small";
      btnAddStory.textContent = "+ Сюжетный кадр сверху";
      btnAddStory.addEventListener("click", () => {
        setJsonStoryImagePrompt(
          messageIndex,
          "Рисованный кадр сцены в момент этой реплики.",
        );
        refreshDialogue();
      });
      addStoryRow.append(btnAddStory);
      inner.append(addStoryRow);
    }
  }

  row.append(inner);
  return row;
};

const renderDialogueEditor = (conversation, items, timingPreview) => {
  const activeId = document.activeElement?.id;
  const activeTextIndex = document.activeElement?.dataset?.messageTextIndex;
  const scrollTop = dialogueEditor.scrollTop;

  dialogueEditor.replaceChildren();
  renderConversationTimingPanel(conversation, timingPreview);

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
  if (conversation.layout !== "storySplit") {
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

  if (conversation.layout === "storySplit") {
    dialogueEditor.append(renderStoryOpeningPanel(conversation));
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
  } else if (activeTextIndex != null) {
    const el = dialogueEditor.querySelector(
      `[data-message-text-index="${activeTextIndex}"]`,
    );
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  }
  dialogueEditor.scrollTop = scrollTop;
};

const refreshDialogue = async () => {
  let json = jsonInput.value.trim();
  let conversation = parseConversationJson();

  if (!json || !conversation) {
    dialoguePanel.hidden = true;
    dialogueEditor.replaceChildren();
    renderConversationTimingPanel(null, null);
    updateGenerateImagesControls(null);
    return;
  }

  if (sanitizeConversationTexts(conversation)) {
    jsonInput.value = JSON.stringify(conversation, null, 2);
    json = jsonInput.value.trim();
    conversation = parseConversationJson();
  }

  const prepared = prepareConversationForEditor(conversation);
  const preparedJson = JSON.stringify(prepared, null, 2);
  if (preparedJson !== jsonInput.value) {
    jsonInput.value = preparedJson;
    json = preparedJson;
    conversation = prepared;
  }

  dialoguePanel.hidden = false;

  try {
    const [scanRes, timingRes] = await Promise.all([
      fetch("/api/images/scan", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({json, stylePrompt: getStylePrompt()}),
      }),
      fetch("/api/conversation/timing-preview", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({json}),
      }),
    ]);
    const data = await scanRes.json();
    if (!scanRes.ok) {
      throw new Error(data.error ?? "Ошибка сканирования");
    }

    if (timingRes.ok) {
      messageTimingPreview = await timingRes.json();
    } else {
      messageTimingPreview = null;
    }

    if (typeof data.openrouterConfigured === "boolean") {
      openrouterConfigured = data.openrouterConfigured;
    }
    if (typeof data.openrouterImageAvailable === "boolean") {
      openrouterImageAvailable = data.openrouterImageAvailable;
    }

    updateImageProviderControls();
    syncTitleCardFieldsFromJson();
    syncVideoLayoutFromJson();
    syncMessageFontSizeFromJson();
    syncVoiceoverFromJson();
    renderDialogueEditor(conversation, data.items ?? [], messageTimingPreview);
    updateGenerateImagesControls(conversation);
    updateGenerateVoiceoverControls(conversation);
  } catch {
    renderDialogueEditor(conversation, [], messageTimingPreview);
    updateGenerateImagesControls(conversation);
    updateGenerateVoiceoverControls(conversation);
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
  syncVideoLayoutFromJson();
  syncMessageFontSizeFromJson();
  updateGenerateImagesControls();
  updateRefineDialogueControls();
  scheduleRefreshDialogue();
});

messageFontSizeInput?.addEventListener("change", () => {
  applyMessageFontSizeToJson();
});

messageFontSizeInput?.addEventListener("blur", () => {
  applyMessageFontSizeToJson();
});

btnResetMessageFontSize?.addEventListener("click", () => {
  if (messageFontSizeInput) {
    messageFontSizeInput.value = "";
  }
  applyMessageFontSizeToJson();
});

for (const input of videoLayoutInputs) {
  input.addEventListener("change", () => {
    applyVideoLayoutToJson(getVideoLayout());
    scheduleRefreshDialogue();
  });
}
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

const syncWorkflowModalBodyClass = () => {
  const anyOpen =
    (renderModal && !renderModal.hidden) || (textGenModal && !textGenModal.hidden);
  document.body.classList.toggle("workflow-modal-open", Boolean(anyOpen));
};

const openRenderModal = () => {
  if (!renderModal) {
    return;
  }
  renderModal.hidden = false;
  renderModal.setAttribute("aria-hidden", "false");
  syncWorkflowModalBodyClass();
};

const closeRenderModal = ({force = false} = {}) => {
  if (!renderModal) {
    return;
  }
  if (!force && activeRenderJobId) {
    return;
  }
  renderModal.hidden = true;
  renderModal.setAttribute("aria-hidden", "true");
  syncWorkflowModalBodyClass();
};

const openTextGenModal = (title) => {
  if (!textGenModal) {
    return;
  }
  if (textGenModalTitle) {
    textGenModalTitle.textContent = title;
  }
  if (textGenModalStatus) {
    textGenModalStatus.className = "workflow-modal__status status-text";
    textGenModalStatus.textContent = "";
  }
  if (textGenModalLog) {
    textGenModalLog.textContent = "";
  }
  if (textGenModalSpinner) {
    textGenModalSpinner.hidden = false;
    textGenModalSpinner.setAttribute("aria-hidden", "false");
  }
  if (btnTextGenModalClose) {
    btnTextGenModalClose.hidden = true;
  }
  textGenModal.hidden = false;
  textGenModal.setAttribute("aria-hidden", "false");
  syncWorkflowModalBodyClass();
};

const closeTextGenModal = () => {
  if (!textGenModal || textGenBusy) {
    return;
  }
  textGenModal.hidden = true;
  textGenModal.setAttribute("aria-hidden", "true");
  if (textGenModalSpinner) {
    textGenModalSpinner.hidden = true;
    textGenModalSpinner.setAttribute("aria-hidden", "true");
  }
  syncWorkflowModalBodyClass();
};

const isTextGenModalOpen = () => textGenModal && !textGenModal.hidden;

const runTextGenTask = async ({title, runningLabel, task, onSuccess}) => {
  openTextGenModal(title);
  textGenBusy = true;
  if (textGenModalStatus) {
    textGenModalStatus.textContent = runningLabel;
  }
  try {
    const data = await task();
    const result = onSuccess(data);
    if (textGenModalStatus) {
      textGenModalStatus.className = "workflow-modal__status status-text status-text--done";
      textGenModalStatus.textContent = result.title ?? "Готово";
    }
    if (textGenModalLog && result.log) {
      textGenModalLog.textContent = result.log;
    }
    return data;
  } catch (err) {
    if (textGenModalStatus) {
      textGenModalStatus.className = "workflow-modal__status status-text status-text--error";
      textGenModalStatus.textContent = err instanceof Error ? err.message : String(err);
    }
    throw err;
  } finally {
    textGenBusy = false;
    if (textGenModalSpinner) {
      textGenModalSpinner.hidden = true;
      textGenModalSpinner.setAttribute("aria-hidden", "true");
    }
    if (btnTextGenModalClose) {
      btnTextGenModalClose.hidden = false;
    }
  }
};

for (const el of document.querySelectorAll("[data-text-gen-modal-dismiss]")) {
  el.addEventListener("click", () => {
    if (textGenBusy) {
      return;
    }
    closeTextGenModal();
  });
}

const updateRenderModalActions = (job) => {
  const busy =
    job &&
    (job.status === "queued" ||
      job.status === "running" ||
      (job.status === "done" && job.localCopyStatus === "copying"));
  if (btnStopRender) {
    btnStopRender.hidden = !busy;
    btnStopRender.disabled = !busy || !activeRenderJobId;
  }
  if (btnRenderModalClose) {
    btnRenderModalClose.hidden = Boolean(busy);
  }
};

const isRenderModalOpen = () => renderModal && !renderModal.hidden;

for (const el of document.querySelectorAll("[data-render-modal-dismiss]")) {
  el.addEventListener("click", () => {
    if (activeRenderJobId) {
      const ok = confirm("Рендер ещё идёт. Закрыть окно? Прогресс можно смотреть снова — нажмите «Собрать видео».");
      if (!ok) {
        return;
      }
      closeRenderModal({force: true});
      return;
    }
    closeRenderModal({force: true});
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (isRenderModalOpen() && !activeRenderJobId) {
    closeRenderModal({force: true});
    return;
  }
  if (isTextGenModalOpen() && !textGenBusy) {
    closeTextGenModal();
  }
});

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
  openRenderModal();
  updateRenderModalActions(job);
  statusText.className = "status-text workflow-modal__status";
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
    if (
      job.status === "done" &&
      job.downloadUrl &&
      (job.target !== "remote" || job.localCopyStatus === "done")
    ) {
      syncPublishOutputFromJob(job);
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
      syncPublishOutputFromJob(job);
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
    updateYoutubePublishControls();
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
        updateRenderModalActions(job);
        if (job.status === "done" && job.localCopyStatus === "done") {
          loadDialoguesList(editorKind);
        }
        if (job.status === "done") {
          loadOpenRouterStatus();
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
        updateRenderModalActions({status: "error"});
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
    const parsed = prepareConversationForEditor(JSON.parse(text));
    jsonInput.value = JSON.stringify(parsed, null, 2);
    currentDialogueId = null;
    dialogueTitleInput.value = "";
    updateProjectPathsHint();
    setDialogueSaveStatus("Пример загружен — сохраните как новый диалог");
    syncWallpaperFromJson();
    syncVideoLayoutFromJson();
    syncMessageFontSizeFromJson();
    syncMusicFromJson();
    await refreshDialogue();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
});

btnRender.addEventListener("click", async () => {
  const json = prepareJsonForRender();
  if (!json) {
    alert("Вставьте JSON переписки");
    return;
  }

  const displayTitle = dialogueTitleInput?.value?.trim() ?? "";
  const proceed = await runPreRenderCheck(json, displayTitle);
  if (!proceed) {
    return;
  }

  setBusy(true);
  openRenderModal();
  statusText.className = "status-text workflow-modal__status";
  statusText.textContent = "Сохранение JSON и запуск рендера…";
  statusLog.textContent = "";
  if (renderCommandBlock) {
    renderCommandBlock.hidden = true;
  }
  if (renderProgressBlock) {
    renderProgressBlock.hidden = false;
  }
  if (btnRenderModalClose) {
    btnRenderModalClose.hidden = true;
  }
  if (renderProgressBar) {
    renderProgressBar.style.width = "0%";
  }
  if (renderProgressLabel) {
    renderProgressLabel.textContent = "Запуск…";
  }
  downloadBlock.hidden = true;
  lastPublishOutputFile = null;
  if (youtubeLink) {
    youtubeLink.hidden = true;
  }
  updateYoutubePublishControls();

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
    statusText.className = "status-text status-text--error workflow-modal__status";
    statusText.textContent = err instanceof Error ? err.message : String(err);
    activeRenderJobId = null;
    setBusy(false);
    updateRenderModalActions({status: "error"});
  }
});

const countPendingImages = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  if (conversation?.layout === "storySplit") {
    let pending = messages.filter((message) => {
      const hasPrompt = Boolean(String(message.storyImagePrompt ?? "").trim());
      const hasImage = Boolean(String(message.storyImage ?? "").trim());
      return hasPrompt && !hasImage;
    }).length;
    const openingPrompt = Boolean(String(conversation?.story?.opening?.imagePrompt ?? "").trim());
    const openingImage = Boolean(String(conversation?.story?.opening?.image ?? "").trim());
    if (openingPrompt && !openingImage) {
      pending += 1;
    }
    return pending;
  }

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
  currentDialogueId = null;
  currentDialogueOutputFile = null;
  dialogueTitleInput.value = "";
  resetEditorImageDraftNamespace();
  updateProjectPathsHint();
  if (!jsonInput.value.trim()) {
    return;
  }
  jsonInput.value = "";
  dialoguePanel.hidden = true;
  dialogueEditor.replaceChildren();
  updateGenerateImagesControls(null);
  updateRefineDialogueControls();
};

const getDialogueGenOptions = () => ({
  messageCount: Number(dialogueMessageCount?.value ?? getDefaultMessageCount()) || getDefaultMessageCount(),
  imageCount: Number(dialogueImageCount?.value ?? 0) || 0,
  language: getDialogueLanguage(),
  model: getDialogueModel(),
});

const formatDialogueGenSummary = ({messageCount, imageCount, language, model}) => {
  const lang = language === "en" ? "EN" : "RU";
  const photos = imageCount > 0 ? `, фото ≤${imageCount}` : ", без фото";
  const meta = getShortsStyleMeta();
  const style = meta ? `, ${meta.label}` : "";
  const modelLabel = model ? `, ${findDialogueModelLabel(model)}` : "";
  return `≤${messageCount} сообщ.${photos}, ${lang}${style}${modelLabel}`;
};

const generateDialogueFromPrompt = async () => {
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  if (editorKind === "shorts") {
    clearShortsJsonBeforeGenerate();
    applyShortsStyleDefaults();
  }

  const prompt = dialoguePromptInput?.value.trim() ?? "";
  if (!prompt) {
    throw new Error("Введите промпт диалога");
  }

  const body = {
    prompt,
    ...getDialogueGenOptions(),
    mode: editorKind,
  };

  if (editorKind === "shorts") {
    body.dialogueStyle = normalizeDialogueStyle(dialogueStyle?.value);
    body.includeImages = Number(dialogueImageCount?.value ?? 0) > 0;
    body.imageCount = Number(dialogueImageCount?.value ?? 0) || 0;
  }

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
  applyMessengerLocaleToJson();
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

const checkDialogueLogicFromPrompt = async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала нужен JSON переписки");
  }
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  const body = {
    prompt: dialoguePromptInput?.value.trim() ?? "",
    json,
    ...getDialogueGenOptions(),
    mode: editorKind,
    includeImages: Number(dialogueImageCount?.value ?? 0) > 0,
    imageCount: Number(dialogueImageCount?.value ?? 0) || 0,
  };
  if (editorKind === "series") {
    body.seriesId = seriesIdInput?.value.trim() ?? "";
  }

  const res = await fetch("/api/dialogues/logic", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка проверки логики");
  }

  const merged = {...JSON.parse(json), ...data.conversation};
  if (data.displayTitle) {
    merged.displayTitle = data.displayTitle;
  }
  jsonInput.value = JSON.stringify(merged, null, 2);
  applyMessengerLocaleToJson();
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
    model: getDialogueModel(),
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

  const body = {
    refinePrompt,
    json,
    ...getDialogueGenOptions(),
    mode: editorKind,
  };
  if (editorKind === "shorts") {
    body.dialogueStyle = normalizeDialogueStyle(dialogueStyle?.value);
  }
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
  applyMessengerLocaleToJson();
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

const regenerateEndingFromPrompt = async () => {
  const json = jsonInput.value.trim();
  if (!json) {
    throw new Error("Сначала нужен JSON переписки");
  }
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  const res = await fetch("/api/dialogues/regenerate-ending", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json,
      displayTitle: dialogueTitleInput?.value?.trim() ?? "",
      tailCount: 3,
      messageCount: Number(dialogueMessageCount?.value ?? getDefaultMessageCount()),
      imageCount: Number(dialogueImageCount?.value ?? 0),
      language: getDialogueLanguage(),
      dialogueStyle: normalizeDialogueStyle(dialogueStyle?.value),
      model: getDialogueModel(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось перегенерировать финал");
  }
  applyGeneratedDialogue(data);
  return data;
};

const formatGenerateDialogueResult = (data) => {
  const mode = formatDialogueGenSummary(getDialogueGenOptions());
  const via = data.provider === "openrouter" ? "ChatGPT · " : "";
  const lines = [`Модель: ${via}${data.model}`, `Параметры: ${mode}`];
  if (editorKind === "series" && data.contextMessageCount) {
    lines.push(`Контекст серии: ${data.contextMessageCount} сообщ.`);
  }
  if (typeof data.messageCount === "number") {
    lines.push(`Сообщений: ${data.messageCount}`);
  } else if (data.expandedFrom) {
    lines.push(`Сообщений: ${data.expandedFrom} → ${data.messageCount ?? "?"}`);
  }
  lines.push(`Попыток: ${data.attempts ?? "?"}`);
  if (editorKind === "shorts" && data.displayTitle) {
    lines.push(`Название: «${data.displayTitle}»`);
  }
  return {title: "Диалог готов", log: lines.join("\n")};
};

const formatLogicCheckResult = (data) => ({
  title: data.logicRevised ? "Логика исправлена" : "Логика в порядке",
  log: `Модель: ${data.model}\nПопыток: ${data.attempts ?? "?"}${
    data.logicRevised ? "\nВ JSON внесены правки." : "\nПравки не потребовались."
  }`,
});

const formatRegenerateEndingResult = (data) => ({
  title: "Финал обновлён",
  log: `Модель: ${data.model}\nПопыток: ${data.attempts ?? "?"}`,
});

const formatRefineDialogueResult = (data) => ({
  title: "Текст доработан",
  log: `Модель: ${data.model}\nПопыток: ${data.attempts ?? "?"}`,
});

const formatRegenerateMessageResult = (data, messageIndex) => ({
  title: `Реплика №${messageIndex + 1} обновлена`,
  log: `Модель: ${data.model}\nПопыток: ${data.attempts ?? "?"}`,
});

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
      storyStylePrompt: getStoryStylePrompt(),
      provider: "openrouter",
      imageNamespace: resolveEditorImageNamespace(),
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
    dialogueGenerateStatus.textContent = "";
  }
  try {
    await runTextGenTask({
      title: "Генерация диалога",
      runningLabel: "ChatGPT пишет переписку… Обычно 30–90 секунд.",
      task: generateDialogueFromPrompt,
      onSuccess: formatGenerateDialogueResult,
    });
  } catch {
    // ошибка в модальном окне
  } finally {
    btnGenerateDialogue.disabled = false;
  }
});

btnCheckLogic?.addEventListener("click", async () => {
  btnCheckLogic.disabled = true;
  if (dialogueLogicStatus) {
    dialogueLogicStatus.textContent = "";
  }
  try {
    await runTextGenTask({
      title: "Проверка логики",
      runningLabel: "ChatGPT проверяет связность и факты…",
      task: checkDialogueLogicFromPrompt,
      onSuccess: formatLogicCheckResult,
    });
  } catch {
    // ошибка в модальном окне
  } finally {
    updateLogicControls();
  }
});

btnRegenerateEnding?.addEventListener("click", async () => {
  btnRegenerateEnding.disabled = true;
  if (dialogueLogicStatus) {
    dialogueLogicStatus.textContent = "";
  }
  try {
    await runTextGenTask({
      title: "Перегенерация финала",
      runningLabel: "ChatGPT переписывает концовку…",
      task: regenerateEndingFromPrompt,
      onSuccess: formatRegenerateEndingResult,
    });
  } catch {
    // ошибка в модальном окне
  } finally {
    updateLogicControls();
  }
});

btnRefineDialogue?.addEventListener("click", async () => {
  btnRefineDialogue.disabled = true;
  if (dialogueRefineStatus) {
    dialogueRefineStatus.textContent = "";
  }
  try {
    await runTextGenTask({
      title: "Доработка текста",
      runningLabel: "ChatGPT правит диалог по вашему заданию…",
      task: refineDialogueFromPrompt,
      onSuccess: formatRefineDialogueResult,
    });
  } catch {
    // ошибка в модальном окне
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
    updateGenerateVoiceoverControls();
  }
});

btnGenerateVoiceover?.addEventListener("click", async () => {
  btnGenerateVoiceover.disabled = true;
  if (voiceoverGenerateStatus) {
    voiceoverGenerateStatus.textContent = "Озвучка… (локально, может занять минуту)";
  }
  try {
    const data = await generateMissingVoiceover();
    const lines = Array.isArray(data.logs) ? data.logs : [];
    if (voiceoverGenerateStatus) {
      voiceoverGenerateStatus.textContent = lines[lines.length - 1] ?? "Готово";
    }
  } catch (err) {
    if (voiceoverGenerateStatus) {
      voiceoverGenerateStatus.textContent = err instanceof Error ? err.message : String(err);
    }
  } finally {
    updateGenerateVoiceoverControls();
  }
});

for (const el of [voiceoverEnabled, voiceoverThemVoice, voiceoverMeVoice]) {
  el?.addEventListener("change", () => {
    applyVoiceoverToJson();
    scheduleRefreshDialogue();
  });
}

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
  if (data?.youtube) {
    youtubeConfigured = Boolean(data.youtube.configured);
  }
  updateImageProviderControls();
  updateGenerateImagesControls();
  updateGenerateVoiceoverControls();
  updateDialogueGenerateControls();
  updateMessageRegenControls();
  updateLogicControls();
  populateDialogueModelOptions();
  updateYoutubePublishControls();
};

const outputFileFromJob = (job) => {
  if (job?.outputFile) {
    return job.outputFile;
  }
  const path = job?.outputPath ?? "";
  const match = String(path).match(/([^/]+\.mp4)$/i);
  return match ? match[1] : null;
};

const syncPublishOutputFromJob = (job) => {
  if (job?.status !== "done") {
    return;
  }
  if (job.target === "remote" && job.localCopyStatus === "error") {
    return;
  }
  const file = outputFileFromJob(job);
  if (file) {
    lastPublishOutputFile = file;
    if (job.dialogueId && job.dialogueId === currentDialogueId) {
      currentDialogueOutputFile = file;
    }
  }
};

const getPublishOutputFile = () => lastPublishOutputFile || currentDialogueOutputFile || null;

const updateYoutubePublishControls = () => {
  if (!btnPublishYoutube) {
    return;
  }
  const outputFile = getPublishOutputFile();
  const canPublish = youtubeConfigured && Boolean(outputFile) && !youtubePublishing;
  btnPublishYoutube.disabled = !canPublish;
  btnPublishYoutube.title = !youtubeConfigured
    ? "YouTube не настроен — задайте YOUTUBE_* в docs/.env и обновите страницу"
    : !outputFile
      ? "Сначала соберите видео"
      : youtubePublishing
        ? "Загрузка на YouTube…"
        : `Загрузить out/${outputFile} на YouTube`;
  if (youtubePrivacySelect) {
    youtubePrivacySelect.disabled = youtubePublishing || !youtubeConfigured || !outputFile;
  }
  if (youtubePublishControl) {
    const isReady = youtubeConfigured && Boolean(outputFile);
    youtubePublishControl.classList.toggle("publish-split--active", isReady);
  }
};

const publishToYoutube = async () => {
  const outputFile = getPublishOutputFile();
  if (!outputFile) {
    alert("Нет готового MP4. Сначала соберите видео.");
    return;
  }
  if (!youtubeConfigured) {
    alert("YouTube не настроен — задайте ключи в docs/.env");
    return;
  }

  const title = dialogueTitleInput?.value?.trim() || undefined;
  const privacyStatus = youtubePrivacySelect?.value || "public";

  youtubePublishing = true;
  updateYoutubePublishControls();
  btnPublishYoutube.textContent = "Загрузка…";
  if (youtubeLink) {
    youtubeLink.hidden = true;
  }

  try {
    const res = await fetch("/api/youtube/publish", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        outputFile,
        dialogueId: currentDialogueId ?? undefined,
        title,
        privacyStatus,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось опубликовать");
    }

    if (youtubeLink && data.url) {
      youtubeLink.hidden = false;
      youtubeLink.href = data.url;
      youtubeLink.textContent = `Открыть на YouTube: ${data.title ?? "ролик"}`;
    }
    statusText.className = "status-text status-text--done";
    statusText.textContent = `Опубликовано на YouTube (${privacyStatus})`;
    setDialogueSaveStatus(`Опубликовано на YouTube (${privacyStatus})`);
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  } finally {
    youtubePublishing = false;
    btnPublishYoutube.textContent = "Опубликовать на YouTube";
    updateYoutubePublishControls();
  }
};

btnPublishYoutube?.addEventListener("click", () => publishToYoutube());

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

  const youtube = data?.youtube;
  const youtubeText = document.createElement("p");
  youtubeText.className = "api-status-section__text";
  youtubeText.textContent = youtube?.configured
    ? "Настроено. Кнопка «Опубликовать на YouTube» доступна после сборки MP4."
    : "Не настроено. Задайте YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET и YOUTUBE_REFRESH_TOKEN в docs/.env.";
  apiStatusContent.append(appendApiStatusSection("YouTube", youtubeText));
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
    const res = await fetch("/api/status");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "status");
    }
    applyApiStatusToEditor(data);
  } catch {
    openrouterConfigured = false;
    openrouterImageAvailable = false;
    youtubeConfigured = false;
    updateImageProviderControls();
    updateMessageRegenControls();
    updateLogicControls();
    updateYoutubePublishControls();
  }
};

loadOpenRouterStatus().then(() => loadDialogueModels());
loadStylePrompt();
loadStoryStylePrompt();
loadShortsStyles();
loadVoiceoverEngineStatus();
initEditorPreferenceControls();
loadBrowseOnStartup();
