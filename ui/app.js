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
const downloadLinks = document.getElementById("downloadLinks");
const pathsHint = document.getElementById("pathsHint");
const wallpaperInputs = document.querySelectorAll('input[name="wallpaper"]');
const wallpaperRow = document.getElementById("wallpaperRow");
const wallpaperOverlayHint = document.getElementById("wallpaperOverlayHint");
const videoLayoutInputs = document.querySelectorAll('input[name="videoLayout"]');
const dialogueGenMessageCountRow = document.getElementById("dialogueGenMessageCountRow");
const dialogueGenImageCountRow = document.getElementById("dialogueGenImageCountRow");
const videoTextModeRow = document.getElementById("videoTextModeRow");
const videoTextModeInputs = document.querySelectorAll('input[name="videoTextMode"]');
const layoutRow = document.getElementById("layoutRow");
const imagesGenerateRow = document.getElementById("imagesGenerateRow");
const storyAnimationRow = document.getElementById("storyAnimationRow");
const storyAnimationInputs = document.querySelectorAll('input[name="storyAnimation"]');
const musicSelect = document.getElementById("musicSelect");
const btnPreviewMusic = document.getElementById("btnPreviewMusic");
const btnOpenMusicCatalog = document.getElementById("btnOpenMusicCatalog");
const musicCatalogModal = document.getElementById("musicCatalogModal");
const musicCatalogList = document.getElementById("musicCatalogList");
const musicCatalogLicense = document.getElementById("musicCatalogLicense");
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
const editorSidebar = document.getElementById("editorSidebar");
const editorCanvas = document.getElementById("editorCanvas");
const btnToggleSidebar = document.getElementById("btnToggleSidebar");
const btnRevealSidebar = document.getElementById("btnRevealSidebar");
const dialogueCanvasTitle = document.getElementById("dialogueCanvasTitle");
const conversationTimingPanel = document.getElementById("conversationTimingPanel");
const conversationTimingTotal = document.getElementById("conversationTimingTotal");
const timingSpeedInput = document.getElementById("timingSpeedInput");
const timingSpeedValue = document.getElementById("timingSpeedValue");
const btnRefreshDialogue = document.getElementById("btnRefreshDialogue");
const tabBtnSeries = document.getElementById("tabBtnSeries");
const tabBtnShorts = document.getElementById("tabBtnShorts");
const tabBtnVideo = document.getElementById("tabBtnVideo");
const tabBtnPrompt = document.getElementById("tabBtnPrompt");
const tabBtnApi = document.getElementById("tabBtnApi");
const tabPanelSeries = document.getElementById("tabPanelSeries");
const tabPanelShorts = document.getElementById("tabPanelShorts");
const tabPanelVideo = document.getElementById("tabPanelVideo");
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
const videoDialoguesList = document.getElementById("videoDialoguesList");
const btnRefreshSeriesList = document.getElementById("btnRefreshSeriesList");
const btnRefreshSeriesParts = document.getElementById("btnRefreshSeriesParts");
const btnRefreshShortsList = document.getElementById("btnRefreshShortsList");
const btnRefreshVideoList = document.getElementById("btnRefreshVideoList");
const btnNewSeries = document.getElementById("btnNewSeries");
const btnNewPartInSeries = document.getElementById("btnNewPartInSeries");
const btnBackToSeriesList = document.getElementById("btnBackToSeriesList");
const btnNewShort = document.getElementById("btnNewShort");
const btnNewVideo = document.getElementById("btnNewVideo");
const btnBackToList = document.getElementById("btnBackToList");
const apiStatusContent = document.getElementById("apiStatusContent");
const btnRefreshApiStatus = document.getElementById("btnRefreshApiStatus");
const dialogueTitleInput = document.getElementById("dialogueTitleInput");
const dialoguePromptInput = document.getElementById("dialoguePromptInput");
const dialogueRefinePromptInput = document.getElementById("dialogueRefinePromptInput");
const dialogueTitleHint = document.getElementById("dialogueTitleHint");
const dialogueMessageCount = document.getElementById("dialogueMessageCount");
const dialogueImageCount = document.getElementById("dialogueImageCount");
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
const imagesGenerateStatus = document.getElementById("imagesGenerateStatus");
const previewCoverPreview = document.getElementById("previewCoverPreview");
const voiceoverEnabled = document.getElementById("voiceoverEnabled");
const meVoiceSelect = document.getElementById("meVoiceSelect");
const themVoiceSelect = document.getElementById("themVoiceSelect");
const meVoiceLabel = document.getElementById("meVoiceLabel");
const themVoiceLabel = document.getElementById("themVoiceLabel");
const voiceGenderControls = document.getElementById("voiceGenderControls");
const btnRegenVoices = document.getElementById("btnRegenVoices");
const btnPreviewMeVoice = document.getElementById("btnPreviewMeVoice");
const btnPreviewThemVoice = document.getElementById("btnPreviewThemVoice");
const btnOpenVoiceCatalog = document.getElementById("btnOpenVoiceCatalog");
const voiceCatalogModal = document.getElementById("voiceCatalogModal");
const voiceCatalogList = document.getElementById("voiceCatalogList");
const voiceCatalogStatus = document.getElementById("voiceCatalogStatus");
const episodesEnabled = document.getElementById("episodesEnabled");
const episodesControls = document.getElementById("episodesControls");
const episodeCountSelect = document.getElementById("episodeCountSelect");
const episodesSplitHint = document.getElementById("episodesSplitHint");
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
let openrouterImageAvailable = false;
let openrouterTextModel = "openai/gpt-5.4";
let openrouterImageModel = "google/gemini-2.5-flash-image";
let openrouterStoryImageModel = "google/gemini-2.5-flash-image";
let openrouterTtsProfile = "young-emotional-v2";

const canGenerateImages = () => openrouterImageAvailable;

const DIALOGUE_MODEL_STORAGE_KEY = "messanger.dialogueModel";
const DEFAULT_SHORTS_MESSAGE_COUNT = 10;
const DEFAULT_SERIES_MESSAGE_COUNT = 20;
const DEFAULT_SHORTS_DIALOGUE_MODEL = "google/gemini-2.5-pro-preview";

const VIDEO_LAYOUT_LABELS = {
  chat: "чат",
  storySplit: "split",
  storyOverlay: "overlay",
};
const VIDEO_TEXT_MODE_LABELS = {
  chat: "переписка",
  narration: "повествование",
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

const getDialogueLanguage = () => "ru";

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

const normalizeEditorKind = (kind) => {
  if (kind === "series") {
    return "series";
  }
  if (kind === "video") {
    return "video";
  }
  return "shorts";
};

const getDefaultMessageCount = () =>
  editorKind === "series" ? DEFAULT_SERIES_MESSAGE_COUNT : DEFAULT_SHORTS_MESSAGE_COUNT;

const getDialogueMessageCount = () =>
  Number(dialogueMessageCount?.value ?? getDefaultMessageCount()) || getDefaultMessageCount();

const getDialogueImageCount = () => Number(dialogueImageCount?.value ?? 0) || 0;

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
  for (const slot of document.querySelectorAll("[data-story-slot-index]")) {
    const available = canGenerateImages();
    const hasFile = Boolean(slot.querySelector(".image-slot__preview"));
    for (const btn of slot.querySelectorAll("[data-action='generate-story-image']")) {
      btn.disabled = !available;
      btn.textContent = hasFile ? "Перегенерировать" : "Сгенерировать";
      btn.title = available
        ? hasFile
          ? `Заменить story-кадр через OpenRouter (${openrouterStoryImageModel})`
          : `Генерация story-кадра через OpenRouter (${openrouterStoryImageModel})`
        : getImageProviderUnavailableHint();
    }
  }
};
let defaultMusicId = "romantic-beautiful-dream.mp3";
/** @type {Array<{id:string,label:string,previewUrl?:string,license?:string,licenseUrl?:string,category?:string}>} */
let musicTrackCatalog = [];
let musicLicenseInfo = null;
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
  video: null,
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
  const isVideo = editorKind === "video";
  const isShorts = editorKind === "shorts";
  if (seriesFieldsRow) {
    seriesFieldsRow.hidden = !isSeries;
  }
  if (seriesTitleCardsRow) {
    seriesTitleCardsRow.hidden = !isSeries;
  }
  if (layoutRow) {
    layoutRow.hidden = isVideo;
  }
  if (videoTextModeRow) {
    videoTextModeRow.hidden = !isVideo;
  }
  if (dialogueGenMessageCountRow) {
    dialogueGenMessageCountRow.hidden = isVideo;
  }
  if (dialogueGenImageCountRow) {
    dialogueGenImageCountRow.hidden = isVideo;
  }
  if (dialoguePromptHint) {
    dialoguePromptHint.textContent = isSeries
      ? "Генерация через ChatGPT (OpenRouter). Задание для части серии — например: «Часть 3: Даня палится современными словами…»"
      : isVideo
        ? "Задание для горизонтального ролика: сюжет, тон и финал. Режим «переписка» или «повествование» — ниже."
        : "Задание для Shorts: тон, жанр и сюжет — в вашем тексте. Формат видео и число фото — ниже.";
  }
  if (dialoguePromptInput) {
    dialoguePromptInput.placeholder = isSeries
      ? "Опишите часть истории, героев и финал сцены…"
      : isVideo
        ? "Опишите сюжет, героев и желаемый финал…"
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
  if (preRenderChecklist && (isSeries || isVideo)) {
    preRenderChecklist.hidden = true;
  }
  updateSeriesPartHint();
  updateStoryAnimationControls();
  updateWallpaperControls();
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
  if (editorKind === "video") {
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
  const conversation = parseConversationJson();
  const hasDialogue = Boolean(conversation?.messages?.length);
  const llmReady = canGenerateDialogue();
  btnRefineDialogue.disabled = !hasDialogue || !llmReady;
  if (!llmReady) {
    btnRefineDialogue.title = "Задайте OPENROUTER_API_KEY в docs/.env";
  } else if (!hasDialogue) {
    btnRefineDialogue.title = "Сначала откройте или сгенерируйте диалог с messages";
  } else {
    btnRefineDialogue.title = "Отправить текущий диалог на доработку";
  }
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
  if (downloadBlock) {
    downloadBlock.hidden = true;
  }
  if (downloadLinks) {
    downloadLinks.replaceChildren();
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
};
const captureEditorSnapshot = () => ({
  dialogueId: currentDialogueId,
  title: dialogueTitleInput.value,
  prompt: dialoguePromptInput?.value ?? "",
  json: jsonInput.value,
  outputFile: currentDialogueOutputFile,
  dialogueModel: getDialogueModel(),
  messageCount: getDialogueMessageCount(),
  imageCount: getDialogueImageCount(),
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
  populateDialogueModelOptions(snapshot?.dialogueModel);
  if (dialogueMessageCount && snapshot?.messageCount) {
    dialogueMessageCount.value = String(snapshot.messageCount);
  }
  if (dialogueImageCount && snapshot?.imageCount !== undefined) {
    dialogueImageCount.value = String(snapshot.imageCount);
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
  const normalized = normalizeEditorKind(nextKind);
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
  const isContentTab =
    activeMainTab === "series" || activeMainTab === "shorts" || activeMainTab === "video";
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
  if (tabPanelVideo) {
    tabPanelVideo.hidden = !isContentTab || editorVisible || activeMainTab !== "video";
    tabPanelVideo.classList.toggle(
      "tab-panel--active",
      isContentTab && !editorVisible && activeMainTab === "video",
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
  editorKind = normalizeEditorKind(kind);
  activeMainTab = editorKind;
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
    await loadDialoguesList(editorKind);
  }
};

const updateTabButtonStates = (tabId, isContentTab) => {
  const buttons = {
    series: tabBtnSeries,
    shorts: tabBtnShorts,
    video: tabBtnVideo,
    prompt: tabBtnPrompt,
    api: tabBtnApi,
  };

  for (const [id, button] of Object.entries(buttons)) {
    if (!button) {
      continue;
    }
    const active = isContentTab
      ? id === (editorVisible ? editorKind : activeMainTab)
      : id === tabId;
    button.classList.toggle("tabs__btn--active", active);
    button.setAttribute("aria-selected", String(active));
  }
};

const refreshBrowseList = async (kind = editorKind) => {
  if (kind === "series") {
    if (selectedSeriesId) {
      await loadSeriesParts(selectedSeriesId);
      return;
    }
    await showSeriesListView();
    return;
  }
  await loadDialoguesList(kind);
};

const setActiveTab = async (tabId, {skipEditorSwitch = false} = {}) => {
  const isContentTab = tabId === "series" || tabId === "shorts" || tabId === "video";
  activeMainTab = tabId;

  try {
    if (isContentTab) {
      if (tabId !== editorKind && !skipEditorSwitch) {
        if (editorVisible) {
          await switchEditorKind(tabId);
        } else {
          editorKind = normalizeEditorKind(tabId);
          syncEditorKindUi();
        }
      } else if (tabId !== editorKind && skipEditorSwitch) {
        editorKind = normalizeEditorKind(tabId);
        syncEditorKindUi();
      }
    }
  } finally {
    updateContentViewVisibility();
    updateTabButtonStates(tabId, isContentTab);
    if (editorKind === "series" && !editorVisible) {
      updateSeriesBrowseVisibility();
    }
  }

  if (isContentTab && !editorVisible) {
    try {
      await refreshBrowseList(editorKind);
    } catch (err) {
      console.error(err);
    }
  }

  if (tabId === "api") {
    loadApiStatus();
  }
  if (tabId === "prompt") {
    loadStylePrompt();
    loadStoryStylePrompt();
  }
};

tabBtnSeries?.addEventListener("click", () => {
  if (!editorVisible) {
    selectedSeriesId = null;
    updateSeriesBrowseVisibility();
  }
  setActiveTab("series");
});
tabBtnShorts?.addEventListener("click", () => {
  void setActiveTab("shorts");
});
tabBtnVideo?.addEventListener("click", () => {
  void setActiveTab("video");
});
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
  const conversation = prepareConversationForEditor(dialogue.conversation ?? {});
  jsonInput.value = JSON.stringify(conversation, null, 2);
  dialogueTitleInput.value = dialogue.titleDisplay || dialogue.title || "";
  if (dialoguePromptInput) {
    const fromDb = dialogue.dialoguePrompt ?? "";
    if (editorKind === "shorts" || editorKind === "video") {
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
  syncVideoLayoutFromJson();
  syncVideoTextModeFromJson();
  syncStoryAnimationFromJson();
  syncMessageFontSizeFromJson();
  syncVoiceoverFromJson();
  syncEpisodesFromJson();
  updateWallpaperControls();
  if (editorKind === "shorts" || editorKind === "video") {
    applyMessengerLocaleToJson();
  }
  showExistingOutputDownload();
  updateRefineDialogueControls();
};

const showExistingOutputDownload = () => {
  if (!downloadBlock || !downloadLinks) {
    return;
  }
  if (!currentDialogueOutputFile) {
    return;
  }
  downloadBlock.hidden = false;
  downloadLinks.replaceChildren();
  const link = document.createElement("a");
  link.className = "download-link";
  link.href = `/out/${currentDialogueOutputFile}`;
  link.textContent = `Открыть out/${currentDialogueOutputFile}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  downloadLinks.append(link);
  if (pathsHint) {
    pathsHint.textContent = `Готовый MP4: out/${currentDialogueOutputFile}`;
  }
};

const withCacheBustUrl = (url, token) => {
  if (!url || url.startsWith("/api/")) {
    return url;
  }
  if (url.includes("v=")) {
    return url;
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${token ?? Date.now()}`;
};

const outputFileFromJob = (job) => {
  if (job?.outputFile) {
    return job.outputFile;
  }
  const path = job?.outputPath ?? "";
  const match = String(path).match(/([^/]+\.mp4)$/i);
  return match ? match[1] : null;
};

const syncOutputFromJob = (job) => {
  if (job?.status !== "done") {
    return;
  }
  if (job.target === "remote" && job.localCopyStatus === "error") {
    return;
  }
  const file = outputFileFromJob(job);
  if (file && job.dialogueId && job.dialogueId === currentDialogueId) {
    currentDialogueOutputFile = file;
  }
};

const renderJobDownloadLinks = (job, withCacheBust) => {
  if (!downloadLinks) {
    return;
  }
  downloadLinks.replaceChildren();
  const outputs =
    Array.isArray(job.episodeOutputs) && job.episodeOutputs.length > 0
      ? job.episodeOutputs
      : job.downloadUrl
        ? [
            {
              episode: 1,
              outputFile: job.outputFile,
              outputPath: job.outputPath,
              downloadUrl: job.downloadUrl,
              finishedAt: job.finishedAt,
            },
          ]
        : [];

  for (const item of outputs) {
    const link = document.createElement("a");
    link.className = "download-link";
    link.href = withCacheBust(item.downloadUrl, item.finishedAt ?? job.finishedAt);
    const label = outputs.length > 1 ? `Эпизод ${item.episode}: ` : "";
    link.textContent =
      job.target === "remote"
        ? `${label}Открыть ${item.outputPath ?? item.outputFile ?? "video.mp4"}`
        : `${label}Скачать ${item.outputPath ?? item.outputFile ?? "video.mp4"}`;
    if (job.target === "remote" || job.status === "done") {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.removeAttribute("download");
    } else if (item.outputFile) {
      link.setAttribute("download", item.outputFile);
    }
    downloadLinks.append(link);
  }
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
  editorKind = normalizeEditorKind(data.kind);
  activeMainTab = editorKind;
  if (editorKind === "series" && data.seriesId) {
    selectedSeriesId = data.seriesId.trim();
  }
  syncEditorKindUi();
  currentDialogueId = data.id;
  applyDialogueToEditor(data);
  if (editorKind === "shorts" || editorKind === "video") {
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

  let messageCountBefore = 0;
  try {
    const parsedBefore = JSON.parse(json);
    messageCountBefore = Array.isArray(parsedBefore?.messages) ? parsedBefore.messages.length : 0;
  } catch {
    /* parse error surfaces from API */
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
  if (data.conversation) {
    jsonInput.value = JSON.stringify(data.conversation, null, 2);
    await refreshDialogue();
    updateGenerateImagesControls(data.conversation);
  }
  if (data.partNumber) {
    currentPartNumber = data.partNumber;
    updateSeriesPartHint();
  }
  updateProjectPathsHint();
  editorSnapshots[editorKind] = captureEditorSnapshot();
  const messageCountAfter = Array.isArray(data.conversation?.messages)
    ? data.conversation.messages.length
    : messageCountBefore;
  const prunedCount = Math.max(0, messageCountBefore - messageCountAfter);
  const prunedNote =
    prunedCount > 0
      ? ` · убрано ${prunedCount} пуст${prunedCount === 1 ? "ое" : prunedCount < 5 ? "ых" : ""} сообщ.`
      : "";
  setDialogueSaveStatus(`Сохранено ${formatDate(data.updatedAt)}${prunedNote}`);
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
      : editorKind === "video"
        ? "Новый Video — вставьте JSON или сгенерируйте сценарий"
        : "Новый Shorts — вставьте JSON или сгенерируйте диалог",
  );
  dialoguePanel.hidden = true;
  dialogueEditor.replaceChildren();
  resetWorkflowControls();
  if (editorKind === "shorts") {
    applyShortsGenDefaults();
    setVideoLayout("storyOverlay");
  }
  if (editorKind === "video") {
    applyShortsGenDefaults();
    setVideoTextMode("narration");
    applyVideoLayoutToJson("video");
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
          await showBrowseView(normalizeEditorKind(item.kind));
        }
      } else if (item.kind === "series" && selectedSeriesId) {
        await loadSeriesParts(selectedSeriesId);
      } else {
        await loadDialoguesList(normalizeEditorKind(item.kind));
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
  const normalizedKind = normalizeEditorKind(kind);
  const res = await fetch(`/api/dialogues?kind=${encodeURIComponent(normalizedKind)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка загрузки списка");
  }
  return data.dialogues ?? [];
};

const getBrowseListElement = (kind) => {
  if (kind === "shorts") {
    return shortsDialoguesList;
  }
  if (kind === "video") {
    return videoDialoguesList;
  }
  return seriesDialoguesList;
};

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
  } else if (kind === "video") {
    empty.textContent = "Пока нет Video. Нажмите «Новый Video».";
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

const renderVideoDialoguesList = (dialogues) => {
  const container = videoDialoguesList;
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!dialogues.length) {
    renderEmptyList(container, "video");
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
  if (kind === "video") {
    renderVideoDialoguesList(dialogues);
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
btnRefreshVideoList?.addEventListener("click", () => loadDialoguesList("video"));
btnNewSeries?.addEventListener("click", () => {
  openNewSeriesEditor();
});
btnNewPartInSeries?.addEventListener("click", () => {
  openNewPartInSeriesEditor();
});
btnNewShort?.addEventListener("click", async () => {
  try {
    editorKind = "shorts";
    syncEditorKindUi();
    editorVisible = true;
    activeMainTab = "shorts";
    updateContentViewVisibility();
    await newDialogue({openEditor: true});
  } catch (err) {
    console.error(err);
    alert(err instanceof Error ? err.message : String(err));
  }
});
btnNewVideo?.addEventListener("click", async () => {
  try {
    editorKind = "video";
    syncEditorKindUi();
    editorVisible = true;
    activeMainTab = "video";
    updateContentViewVisibility();
    await newDialogue({openEditor: true});
  } catch (err) {
    console.error(err);
    alert(err instanceof Error ? err.message : String(err));
  }
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

const computeEqualEpisodeSplits = (messageCount, episodeCount) => {
  if (episodeCount <= 1 || messageCount <= 1) {
    return [];
  }
  const splits = [];
  for (let part = 1; part < episodeCount; part += 1) {
    const end = Math.floor((part * messageCount) / episodeCount) - 1;
    const prev = splits[splits.length - 1] ?? -1;
    splits.push(Math.max(prev + 1, Math.min(end, messageCount - 2)));
  }
  return splits;
};

const formatEpisodeSplitHint = (parsed) => {
  const messages = parsed?.messages ?? [];
  const episodes = parsed?.episodes;
  if (!episodes?.enabled || !messages.length) {
    return "";
  }
  const splits = episodes.splitAfter ?? [];
  if (!splits.length) {
    return "Укажите границы эпизодов";
  }
  const parts = [];
  let start = 0;
  for (let i = 0; i < splits.length; i += 1) {
    const end = splits[i];
    parts.push(`${start + 1}–${end + 1}`);
    start = end + 1;
  }
  parts.push(`${start + 1}–${messages.length}`);
  return `Эпизоды: ${parts.join(", ")}`;
};

const syncEpisodesFromJson = () => {
  const parsed = parseConversationJson();
  const episodes = parsed?.episodes ?? {};
  const enabled = Boolean(episodes.enabled);
  if (episodesEnabled) {
    episodesEnabled.checked = enabled;
  }
  if (episodesControls) {
    episodesControls.hidden = !enabled;
  }
  if (episodeCountSelect && enabled) {
    const count = (episodes.splitAfter?.length ?? 0) + 1;
    episodeCountSelect.value = String(Math.max(2, Math.min(6, count)));
  }
  if (episodesSplitHint) {
    episodesSplitHint.textContent = enabled ? formatEpisodeSplitHint(parsed) : "";
  }
};

const applyEpisodesToJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const enabled = Boolean(episodesEnabled?.checked);
  const messageCount = parsed.messages?.length ?? 0;
  if (!enabled || messageCount < 2) {
    delete parsed.episodes;
    jsonInput.value = JSON.stringify(parsed, null, 2);
    if (episodesControls) {
      episodesControls.hidden = true;
    }
    if (episodesSplitHint) {
      episodesSplitHint.textContent = "";
    }
    return;
  }
  const episodeCount = Math.max(2, Math.min(6, Number(episodeCountSelect?.value) || 2));
  const splitAfter = computeEqualEpisodeSplits(messageCount, episodeCount);
  parsed.episodes = {enabled: true, splitAfter};
  jsonInput.value = JSON.stringify(parsed, null, 2);
  if (episodesControls) {
    episodesControls.hidden = false;
  }
  if (episodesSplitHint) {
    episodesSplitHint.textContent = formatEpisodeSplitHint(parsed);
  }
};

const applyMusicToJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  const musicId = getMusicId();
  if (!parsed.music) {
    parsed.music = {};
  }
  if (musicId === "none") {
    parsed.music.enabled = false;
  } else if (musicId === "auto") {
    parsed.music.enabled = true;
    delete parsed.music.src;
    delete parsed.music.autoProfile;
  } else if (musicId) {
    parsed.music.enabled = true;
    parsed.music.src = `music/${musicId}`;
    delete parsed.music.autoProfile;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
};

const prepareJsonForRender = () => {
  applyMessengerLocaleToJson();
  applyMessageFontSizeToJson();
  applyVoiceoverToJson();
  applyEpisodesToJson();
  applyMusicToJson();
  applyStoryAnimationToJson();
  const json = jsonInput.value.trim();
  if (!json) {
    return "";
  }
  try {
    const parsed = prepareConversationForEditor(JSON.parse(json));
    stripWallpaperForStoryOverlay(parsed);
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
  if ((editorKind === "shorts" || editorKind === "video") && data.displayTitle) {
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

const isWallpaperRelevantForLayout = () => {
  if (editorKind === "video") {
    const parsed = parseConversationJson();
    if (parsed?.layout === "video") {
      return parsed.video?.textMode === "chat";
    }
    return getVideoTextMode() === "chat";
  }
  return getVideoLayout() !== "storyOverlay";
};

const updateWallpaperControls = () => {
  const active = isWallpaperRelevantForLayout();
  wallpaperRow?.classList.toggle("wallpaper-row--inactive", !active);
  wallpaperOverlayHint?.toggleAttribute("hidden", active);
  for (const input of wallpaperInputs) {
    input.disabled = !active;
  }
};

const stripWallpaperForStoryOverlay = (parsed) => {
  if (parsed?.layout === "storyOverlay") {
    delete parsed.wallpaper;
  }
  return parsed;
};

const resolveWallpaperPayload = () =>
  isWallpaperRelevantForLayout() ? getWallpaper() : undefined;

const STORY_ANIMATION_UI_VALUES = new Set(["kenburns", "depthParallax", "video", "video-parallax"]);

const normalizeStoryAnimationForUi = (animation) => {
  if (STORY_ANIMATION_UI_VALUES.has(animation)) {
    return animation;
  }
  if (animation === "parallax") {
    return "depthParallax";
  }
  return "depthParallax";
};

const getStoryAnimation = () => {
  const checked = [...storyAnimationInputs].find((input) => input.checked);
  const value = checked?.value;
  return STORY_ANIMATION_UI_VALUES.has(value) ? value : "depthParallax";
};

const setStoryAnimation = (animation) => {
  const value = normalizeStoryAnimationForUi(animation);
  for (const input of storyAnimationInputs) {
    input.checked = input.value === value;
  }
};

const updateStoryAnimationControls = () => {
  const storyLayout = getVideoLayout() !== "chat";
  storyAnimationRow?.toggleAttribute("hidden", !storyLayout);
};

const applyStoryAnimationToJson = () => {
  if (getVideoLayout() === "chat") {
    return;
  }
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  if (!parsed.story) {
    parsed.story = {};
  }
  if (!parsed.story.opening) {
    parsed.story.opening = {};
  }
  parsed.story.opening.animation = getStoryAnimation();
  if (typeof parsed.story.motionLoopSec !== "number") {
    parsed.story.motionLoopSec = 3;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
};

const syncStoryAnimationFromJson = () => {
  const parsed = parseConversationJson();
  if (!parsed || !isStoryVisualLayout(parsed)) {
    setStoryAnimation("depthParallax");
    return;
  }
  const raw = parsed.story?.opening?.animation;
  const uiValue = normalizeStoryAnimationForUi(raw ?? "depthParallax");
  setStoryAnimation(uiValue);
  // legacy LLM/схема: animation "parallax" → в UI depthParallax
  if (raw === "parallax") {
    if (!parsed.story) {
      parsed.story = {};
    }
    if (!parsed.story.opening) {
      parsed.story.opening = {};
    }
    parsed.story.opening.animation = uiValue;
    jsonInput.value = JSON.stringify(parsed, null, 2);
  }
  updateStoryAnimationControls();
};

const isStoryVisualLayout = (conversation) =>
  conversation?.layout === "storySplit" || conversation?.layout === "storyOverlay";

const getVideoLayout = () => {
  const checked = [...videoLayoutInputs].find((input) => input.checked);
  const value = checked?.value;
  if (value === "storySplit" || value === "storyOverlay") {
    return value;
  }
  return "chat";
};

const setVideoLayout = (layout) => {
  const value =
    layout === "storySplit" || layout === "storyOverlay" ? layout : "chat";
  for (const input of videoLayoutInputs) {
    input.checked = input.value === value;
  }
};

const getVideoTextMode = () => {
  const checked = [...videoTextModeInputs].find((input) => input.checked);
  return checked?.value === "chat" ? "chat" : "narration";
};

const setVideoTextMode = (textMode) => {
  const value = textMode === "chat" ? "chat" : "narration";
  for (const input of videoTextModeInputs) {
    input.checked = input.value === value;
  }
};

const stripVideoOnlyAssets = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  delete parsed.story;
  delete parsed.hookText;
  if (Array.isArray(parsed.messages)) {
    for (const message of parsed.messages) {
      delete message.image;
      delete message.imagePrompt;
      delete message.imageEditPrompt;
      delete message.storyImage;
      delete message.storyImagePrompt;
      delete message.storyVideo;
      delete message.storyVideoDurationMs;
      delete message.storyVideoProfile;
      delete message.storyVideoLoop;
      delete message.storySfx;
    }
  }
  return parsed;
};

const applyVideoTextModeToJson = (textMode = getVideoTextMode()) => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  parsed.layout = "video";
  parsed.video = {textMode: textMode === "chat" ? "chat" : "narration"};
  stripVideoOnlyAssets(parsed);
  jsonInput.value = JSON.stringify(parsed, null, 2);
  updateGenerateImagesControls(parsed);
  updateWallpaperControls();
};

const syncVideoTextModeFromJson = () => {
  const parsed = parseConversationJson();
  if (!parsed || parsed.layout !== "video") {
    setVideoTextMode("narration");
    return;
  }
  setVideoTextMode(parsed.video?.textMode === "chat" ? "chat" : "narration");
};

const applyVideoLayoutToJson = (layout = getVideoLayout()) => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  if (layout === "video" || editorKind === "video") {
    parsed.layout = "video";
    parsed.video = {textMode: getVideoTextMode()};
    stripVideoOnlyAssets(parsed);
    jsonInput.value = JSON.stringify(parsed, null, 2);
    updateGenerateImagesControls(parsed);
    updateWallpaperControls();
    return;
  }
  if (layout === "storySplit" || layout === "storyOverlay") {
    parsed.layout = layout;
    if (!parsed.story) {
      parsed.story = {};
    }
    if (!parsed.story.opening) {
      parsed.story.opening = {};
    }
    if (!parsed.story.opening.animation) {
      parsed.story.opening.animation = "depthParallax";
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
  stripWallpaperForStoryOverlay(parsed);
  jsonInput.value = JSON.stringify(parsed, null, 2);
  updateGenerateImagesControls(parsed);
  updateWallpaperControls();
  updateStoryAnimationControls();
  syncStoryAnimationFromJson();
};

const syncVideoLayoutFromJson = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  if (parsed.layout === "video") {
    syncVideoTextModeFromJson();
    updateWallpaperControls();
    return;
  }
  setVideoLayout(
    parsed.layout === "storySplit"
      ? "storySplit"
      : parsed.layout === "storyOverlay"
        ? "storyOverlay"
        : parsed.layout === "chat"
          ? "chat"
          : "storyOverlay",
  );
  updateWallpaperControls();
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

const syncVoiceoverFromJson = () => {
  const parsed = parseConversationJson();
  const voiceover = parsed?.voiceover ?? {};
  if (voiceoverEnabled) {
    voiceoverEnabled.checked = Boolean(voiceover.enabled);
  }
  const contactName = parsed?.contactName?.trim();
  if (meVoiceLabel) {
    meVoiceLabel.textContent = "Голос (я)";
  }
  if (themVoiceLabel) {
    themVoiceLabel.textContent = contactName ? `Голос (${contactName})` : "Голос (собеседник)";
  }
  if (meVoiceSelect) {
    meVoiceSelect.value = resolveVoiceSelectValue(voiceover.meVoice, "male");
  }
  if (themVoiceSelect) {
    themVoiceSelect.value = resolveVoiceSelectValue(voiceover.themVoice, "female");
  }
  if (voiceGenderControls) {
    voiceGenderControls.hidden = !voiceover.enabled;
  }
};

/** Каталог Gemini TTS — подгружается из /api/status, есть запасной список */
let geminiVoiceCatalog = [
  {id: "Puck", hint: "бодрый", gender: "male"},
  {id: "Charon", hint: "информативный", gender: "male"},
  {id: "Fenrir", hint: "эмоциональный", gender: "male"},
  {id: "Achird", hint: "дружелюбный", gender: "male"},
  {id: "Leda", hint: "молодой", gender: "female"},
  {id: "Kore", hint: "твёрдый", gender: "female"},
  {id: "Aoede", hint: "лёгкий", gender: "female"},
  {id: "Achernar", hint: "мягкий", gender: "female"},
];

const resolveVoiceSelectValue = (stored, fallbackGender) => {
  const raw = String(stored ?? "").trim();
  if (raw === "male" || raw === "female") {
    const defaults =
      openrouterTtsDefaults[raw] ??
      (raw === "male" ? openrouterTtsDefaults.male : openrouterTtsDefaults.female);
    return defaults ?? (raw === "male" ? "Puck" : "Leda");
  }
  if (raw && geminiVoiceCatalog.some((v) => v.id === raw)) {
    return raw;
  }
  return fallbackGender === "male"
    ? openrouterTtsDefaults.male ?? "Puck"
    : openrouterTtsDefaults.female ?? "Leda";
};

let openrouterTtsDefaults = {male: "Puck", female: "Leda"};

const formatVoiceOptionLabel = (voice) => {
  const gender =
    voice.gender === "male" ? "м" : voice.gender === "female" ? "ж" : "";
  return gender ? `${voice.id} — ${voice.hint} (${gender})` : `${voice.id} — ${voice.hint}`;
};

const populateVoiceSelects = (catalog = geminiVoiceCatalog) => {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    return;
  }
  geminiVoiceCatalog = catalog;
  for (const select of [meVoiceSelect, themVoiceSelect]) {
    if (!select) {
      continue;
    }
    const prev = select.value;
    select.replaceChildren();
    const maleGroup = document.createElement("optgroup");
    maleGroup.label = "Мужские";
    const femaleGroup = document.createElement("optgroup");
    femaleGroup.label = "Женские";
    for (const voice of catalog) {
      const opt = document.createElement("option");
      opt.value = voice.id;
      opt.textContent = formatVoiceOptionLabel(voice);
      if (voice.gender === "male") {
        maleGroup.append(opt);
      } else {
        femaleGroup.append(opt);
      }
    }
    if (maleGroup.childElementCount > 0) {
      select.append(maleGroup);
    }
    if (femaleGroup.childElementCount > 0) {
      select.append(femaleGroup);
    }
    if (prev && [...select.options].some((o) => o.value === prev)) {
      select.value = prev;
    }
  }
  syncVoiceoverFromJson();
};

/** @type {HTMLAudioElement | null} */
let activeVoicePreviewAudio = null;
/** @type {string | null} */
let activeVoicePreviewId = null;
const voicePreviewUrlCache = new Map();

const stopVoicePreview = () => {
  if (activeVoicePreviewAudio) {
    activeVoicePreviewAudio.pause();
    activeVoicePreviewAudio = null;
  }
  activeVoicePreviewId = null;
  for (const btn of document.querySelectorAll(".voice-preview-btn--playing, .voice-catalog__play--playing")) {
    btn.classList.remove("voice-preview-btn--playing", "voice-catalog__play--playing");
  }
  for (const row of document.querySelectorAll(".voice-catalog__row--playing")) {
    row.classList.remove("voice-catalog__row--playing");
  }
};

const fetchVoicePreviewUrl = async (voiceId) => {
  const id = String(voiceId ?? "").trim();
  if (!id) {
    throw new Error("Голос не выбран");
  }
  if (voicePreviewUrlCache.has(id)) {
    return voicePreviewUrlCache.get(id);
  }
  const res = await fetch("/api/voiceover/preview", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({voice: id}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось сгенерировать превью");
  }
  const url = data.previewUrl?.startsWith("/") ? data.previewUrl : `/${data.previewUrl ?? ""}`;
  voicePreviewUrlCache.set(id, url);
  return url;
};

const playVoicePreview = async (voiceId, {triggerBtn = null, rowEl = null} = {}) => {
  const id = String(voiceId ?? "").trim();
  if (!id) {
    return;
  }
  if (!openrouterConfigured) {
    alert("Нужен OPENROUTER_API_KEY в docs/.env для прослушивания голосов");
    return;
  }

  if (activeVoicePreviewId === id && activeVoicePreviewAudio && !activeVoicePreviewAudio.paused) {
    stopVoicePreview();
    return;
  }

  stopVoicePreview();
  triggerBtn?.classList.add("voice-preview-btn--playing", "voice-catalog__play--playing");
  rowEl?.classList.add("voice-catalog__row--playing");
  if (triggerBtn) {
    triggerBtn.classList.add("voice-preview-btn--loading");
  }
  if (voiceCatalogStatus) {
    voiceCatalogStatus.textContent = `Готовлю образец «${id}»…`;
    voiceCatalogStatus.className = "workflow-modal__status status-text";
  }

  try {
    const url = await fetchVoicePreviewUrl(id);
    const audio = new Audio(url);
    activeVoicePreviewAudio = audio;
    activeVoicePreviewId = id;
    audio.addEventListener("ended", () => stopVoicePreview());
    audio.addEventListener("error", () => stopVoicePreview());
    await audio.play();
    if (voiceCatalogStatus) {
      voiceCatalogStatus.textContent = `Сейчас играет: ${id}`;
      voiceCatalogStatus.className = "workflow-modal__status status-text status-text--done";
    }
  } catch (err) {
    stopVoicePreview();
    const message = err instanceof Error ? err.message : String(err);
    if (voiceCatalogStatus) {
      voiceCatalogStatus.textContent = message;
      voiceCatalogStatus.className = "workflow-modal__status status-text status-text--error";
    } else {
      alert(message);
    }
  } finally {
    triggerBtn?.classList.remove("voice-preview-btn--loading");
  }
};

const assignVoiceToCharacter = (voiceId, character) => {
  const id = String(voiceId ?? "").trim();
  if (!id) {
    return;
  }
  if (character === "me" && meVoiceSelect) {
    meVoiceSelect.value = id;
  } else if (character === "them" && themVoiceSelect) {
    themVoiceSelect.value = id;
  }
  onVoiceGenderChange();
  renderVoiceCatalog();
};

const renderVoiceCatalog = () => {
  if (!voiceCatalogList) {
    return;
  }
  voiceCatalogList.replaceChildren();
  const meVoice = meVoiceSelect?.value ?? "";
  const themVoice = themVoiceSelect?.value ?? "";

  for (const [gender, title] of [
    ["male", "Мужские"],
    ["female", "Женские"],
  ]) {
    const voices = geminiVoiceCatalog.filter((v) => v.gender === gender);
    if (voices.length === 0) {
      continue;
    }
    const section = document.createElement("section");
    section.className = "voice-catalog__group";
    const heading = document.createElement("h3");
    heading.className = "voice-catalog__group-title";
    heading.textContent = title;
    section.append(heading);

    const list = document.createElement("div");
    list.className = "voice-catalog__list";

    for (const voice of voices) {
      const row = document.createElement("div");
      row.className = "voice-catalog__row";
      if (voice.id === meVoice) {
        row.classList.add("voice-catalog__row--active-me");
      }
      if (voice.id === themVoice) {
        row.classList.add("voice-catalog__row--active-them");
      }

      const btnPlay = document.createElement("button");
      btnPlay.type = "button";
      btnPlay.className = "btn btn-secondary btn-small voice-catalog__play";
      btnPlay.textContent = "▶";
      btnPlay.title = `Прослушать ${voice.id}`;
      btnPlay.addEventListener("click", () => {
        playVoicePreview(voice.id, {triggerBtn: btnPlay, rowEl: row});
      });

      const meta = document.createElement("div");
      meta.className = "voice-catalog__meta";
      meta.innerHTML = `<div class="voice-catalog__name">${voice.id}</div><div class="voice-catalog__hint">${voice.hint}</div>`;

      const pick = document.createElement("div");
      pick.className = "voice-catalog__pick";
      const btnMe = document.createElement("button");
      btnMe.type = "button";
      btnMe.className = "btn btn-secondary btn-small voice-catalog__pick-btn";
      btnMe.textContent = "Я";
      btnMe.disabled = voice.id === meVoice;
      btnMe.addEventListener("click", () => assignVoiceToCharacter(voice.id, "me"));

      const btnThem = document.createElement("button");
      btnThem.type = "button";
      btnThem.className = "btn btn-secondary btn-small voice-catalog__pick-btn";
      btnThem.textContent = "Собес.";
      btnThem.disabled = voice.id === themVoice;
      btnThem.addEventListener("click", () => assignVoiceToCharacter(voice.id, "them"));

      pick.append(btnMe, btnThem);
      row.append(btnPlay, meta, pick);
      list.append(row);
    }

    section.append(list);
    voiceCatalogList.append(section);
  }
};

const setVoiceCatalogModalOpen = (open) => {
  if (!voiceCatalogModal) {
    return;
  }
  voiceCatalogModal.hidden = !open;
  voiceCatalogModal.setAttribute("aria-hidden", open ? "false" : "true");
  syncWorkflowModalBodyClass();
  if (open) {
    renderVoiceCatalog();
    if (voiceCatalogStatus) {
      voiceCatalogStatus.textContent = openrouterConfigured
        ? "Первое прослушивание может занять несколько секунд — образец кэшируется."
        : "Нужен OPENROUTER_API_KEY в docs/.env";
      voiceCatalogStatus.className = "workflow-modal__status status-text";
    }
  } else {
    stopVoicePreview();
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
    const meVoice = meVoiceSelect?.value?.trim();
    const themVoice = themVoiceSelect?.value?.trim();
    parsed.voiceover = {
      ...(parsed.voiceover ?? {}),
      enabled: true,
      provider: "openrouter",
      themVoice:
        themVoice && geminiVoiceCatalog.some((v) => v.id === themVoice)
          ? themVoice
          : resolveVoiceSelectValue(parsed.voiceover?.themVoice, "female"),
      meVoice:
        meVoice && geminiVoiceCatalog.some((v) => v.id === meVoice)
          ? meVoice
          : resolveVoiceSelectValue(parsed.voiceover?.meVoice, "male"),
    };
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
  if (voiceGenderControls) {
    voiceGenderControls.hidden = !enabled;
  }
  updateVoiceoverControls(parsed);
};

/** Сбрасывает аудио реплик (но сохраняет voiceEmotion), чтобы озвучка перегенерилась с новыми голосами */
const clearVoiceAudioForRevoice = () => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }
  for (const message of parsed.messages ?? []) {
    delete message.voiceAudio;
    delete message.voiceDurationMs;
    delete message.voiceTtsProvider;
    delete message.voiceTtsProfile;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
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
    const hasAudio = Boolean(String(message.voiceAudio ?? "").trim());
    if (!hasAudio || message.voiceTtsProvider !== "openrouter" || message.voiceTtsProfile !== openrouterTtsProfile) {
      pending += 1;
    }
  }
  return pending;
};

const updateVoiceoverControls = (conversation = null) => {
  if (!voiceoverEnabled) {
    return;
  }
  const parsed = conversation ?? parseConversationJson();
  const pending = countPendingVoiceover(parsed);
  if (!openrouterConfigured) {
    voiceoverEnabled.title = "Нужен OPENROUTER_API_KEY в docs/.env";
  } else if (voiceoverEnabled.checked && pending > 0) {
    voiceoverEnabled.title = `При сборке озвучится ${pending} реплик${pending === 1 ? "а" : pending < 5 ? "и" : ""}`;
  } else {
    voiceoverEnabled.title = voiceoverEnabled.checked
      ? "Озвучка готова — при сборке не перегенерируется"
      : "";
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
  syncEpisodesFromJson();
    await refreshDialogue();
    updateGenerateImagesControls(data.conversation);
    updateVoiceoverControls(data.conversation);
  }
  return data;
};

const getMusicId = () => musicSelect.value;

const setMusicId = (id) => {
  if ([...musicSelect.options].some((o) => o.value === id)) {
    musicSelect.value = id;
  }
};

const applyShortsGenDefaults = () => {
  populateDialogueModelOptions(DEFAULT_SHORTS_DIALOGUE_MODEL);
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
    musicTrackCatalog = data.tracks ?? [];
    musicLicenseInfo = data.license ?? null;
    musicSelect.replaceChildren();

    const none = document.createElement("option");
    none.value = "none";
    none.textContent = "Без музыки";
    musicSelect.append(none);

    const auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = "Подобрать по сюжету";
    musicSelect.append(auto);

    for (const track of musicTrackCatalog) {
      const opt = document.createElement("option");
      opt.value = track.id;
      opt.textContent = track.label;
      musicSelect.append(opt);
    }

    setMusicId(defaultMusicId);
    updateMusicPreviewControls();
    syncMusicFromJson();
  } catch (err) {
    musicSelect.replaceChildren();
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = err instanceof Error ? err.message : "Ошибка загрузки";
    musicSelect.append(opt);
    updateMusicPreviewControls();
  }
};

/** @type {HTMLAudioElement | null} */
let activeMusicPreviewAudio = null;
/** @type {string | null} */
let activeMusicPreviewId = null;

const stopMusicPreview = () => {
  if (activeMusicPreviewAudio) {
    activeMusicPreviewAudio.pause();
    activeMusicPreviewAudio = null;
  }
  activeMusicPreviewId = null;
  for (const btn of document.querySelectorAll(".music-preview-btn--playing, .music-catalog__play--playing")) {
    btn.classList.remove("music-preview-btn--playing", "music-catalog__play--playing");
  }
  for (const row of document.querySelectorAll(".music-catalog__row--playing")) {
    row.classList.remove("music-catalog__row--playing");
  }
};

const resolveMusicPreviewUrl = (musicId) => {
  const id = String(musicId ?? "").trim();
  if (!id || id === "none" || id === "auto") {
    return null;
  }
  const track = musicTrackCatalog.find((t) => t.id === id);
  return track?.previewUrl ?? `/music/${id}`;
};

const playMusicPreview = async (musicId, {triggerBtn = null, rowEl = null} = {}) => {
  const id = String(musicId ?? "").trim();
  const url = resolveMusicPreviewUrl(id);
  if (!url) {
    return;
  }

  if (activeMusicPreviewId === id && activeMusicPreviewAudio && !activeMusicPreviewAudio.paused) {
    stopMusicPreview();
    return;
  }

  stopMusicPreview();
  triggerBtn?.classList.add("music-preview-btn--playing", "music-catalog__play--playing");
  rowEl?.classList.add("music-catalog__row--playing");

  try {
    const audio = new Audio(url);
    activeMusicPreviewAudio = audio;
    activeMusicPreviewId = id;
    audio.addEventListener("ended", () => stopMusicPreview());
    audio.addEventListener("error", () => stopMusicPreview());
    await audio.play();
  } catch (err) {
    stopMusicPreview();
    alert(err instanceof Error ? err.message : String(err));
  }
};

const updateMusicPreviewControls = () => {
  const id = getMusicId();
  const canPreview = Boolean(id && id !== "none" && id !== "auto" && id !== "");
  if (btnPreviewMusic) {
    btnPreviewMusic.disabled = !canPreview;
  }
};

const assignMusicTrack = (musicId) => {
  setMusicId(musicId);
  onMusicChange();
  renderMusicCatalog();
};

const renderMusicCatalog = () => {
  if (!musicCatalogList) {
    return;
  }
  musicCatalogList.replaceChildren();
  const currentId = getMusicId();

  if (musicCatalogLicense) {
    const licenseName = musicLicenseInfo?.name ?? "Mixkit Free License";
    const licenseUrl = musicLicenseInfo?.url ?? "https://mixkit.co/license/";
    const note =
      musicLicenseInfo?.note ??
      "Можно в YouTube, TikTok и соцсетях. Атрибуция не обязательна.";
    musicCatalogLicense.innerHTML = `<strong>${licenseName}</strong> — ${note} <a class="youtube-link" href="${licenseUrl}" target="_blank" rel="noopener noreferrer">лицензия</a>`;
  }

  const groups = new Map();
  for (const track of musicTrackCatalog) {
    const key = track.category ?? "other";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(track);
  }

  const categoryTitles = {
    romantic: "Романтика",
    upbeat: "Бодрая",
    comedy: "Комедия",
    cinematic: "Кино",
    mystery: "Мистика",
    calm: "Спокойная",
    ambient: "Фон",
    other: "Другие",
  };

  for (const [category, tracks] of groups) {
    const section = document.createElement("section");
    section.className = "music-catalog__group";
    const heading = document.createElement("h3");
    heading.className = "music-catalog__group-title";
    heading.textContent = categoryTitles[category] ?? category;
    section.append(heading);

    const list = document.createElement("div");
    list.className = "music-catalog__list";

    for (const track of tracks) {
      const row = document.createElement("div");
      row.className = "music-catalog__row";
      if (track.id === currentId) {
        row.classList.add("music-catalog__row--active");
      }

      const btnPlay = document.createElement("button");
      btnPlay.type = "button";
      btnPlay.className = "btn btn-secondary btn-small music-catalog__play";
      btnPlay.textContent = "▶";
      btnPlay.title = "Прослушать";
      btnPlay.addEventListener("click", () => {
        playMusicPreview(track.id, {triggerBtn: btnPlay, rowEl: row});
      });

      const meta = document.createElement("div");
      meta.className = "music-catalog__meta";
      meta.innerHTML = `<div class="music-catalog__name">${track.label}</div>`;

      const pick = document.createElement("div");
      pick.className = "music-catalog__pick";
      const btnPick = document.createElement("button");
      btnPick.type = "button";
      btnPick.className = "btn btn-secondary btn-small music-catalog__pick-btn";
      btnPick.textContent = track.id === currentId ? "Выбран" : "Выбрать";
      btnPick.disabled = track.id === currentId;
      btnPick.addEventListener("click", () => assignMusicTrack(track.id));

      pick.append(btnPick);
      row.append(btnPlay, meta, pick);
      list.append(row);
    }

    section.append(list);
    musicCatalogList.append(section);
  }
};

const setMusicCatalogModalOpen = (open) => {
  if (!musicCatalogModal) {
    return;
  }
  musicCatalogModal.hidden = !open;
  musicCatalogModal.setAttribute("aria-hidden", open ? "false" : "true");
  syncWorkflowModalBodyClass();
  if (open) {
    renderMusicCatalog();
  } else {
    stopMusicPreview();
  }
};

const onMusicChange = () => {
  applyMusicToJson();
  updateMusicPreviewControls();
  stopMusicPreview();
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
    renderTargetSelect.addEventListener("change", () => {
      updateVoiceoverControls();
    });
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

const flushStoryImagePromptToJson = (messageIndex, promptText) => {
  if (messageIndex == null) {
    if (storyOpeningPromptSaveTimer.id) {
      clearTimeout(storyOpeningPromptSaveTimer.id);
      storyOpeningPromptSaveTimer.id = null;
    }
    setJsonStoryOpeningPrompt(promptText);
    return;
  }
  if (storyImagePromptSaveTimers.has(messageIndex)) {
    clearTimeout(storyImagePromptSaveTimers.get(messageIndex));
    storyImagePromptSaveTimers.delete(messageIndex);
  }
  setJsonStoryImagePrompt(messageIndex, promptText);
};

const buildStoryPreviewLookup = (storyItems) => {
  const lookup = new Map();
  for (const item of storyItems ?? []) {
    const key = item.messageIndex == null ? "opening" : item.messageIndex;
    if (item.previewUrl) {
      lookup.set(key, item.previewUrl);
    }
  }
  return lookup;
};
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

const getMessageDisplay = (message) =>
  message?.display === "bubble" ? "bubble" : "center";

const setMessageDisplayInJson = (messageIndex, display) => {
  const parsed = parseConversationJson();
  if (!parsed?.messages?.[messageIndex]) {
    return;
  }
  const value = display === "bubble" ? "bubble" : "center";
  if (value === "center") {
    delete parsed.messages[messageIndex].display;
  } else {
    parsed.messages[messageIndex].display = value;
  }
  jsonInput.value = JSON.stringify(parsed, null, 2);
};

const syncSceneCaption = (messageIndex, text) => {
  const caption = dialogueEditor.querySelector(
    `[data-scene-caption-index="${messageIndex}"]`,
  );
  if (caption) {
    caption.textContent = text.trim();
  }
};

const SIDEBAR_COLLAPSED_KEY = "editorSidebarCollapsed";

const setSidebarCollapsed = (collapsed) => {
  if (!editorSidebar) {
    return;
  }
  editorSidebar.classList.toggle("editor-sidebar--collapsed", collapsed);
  btnRevealSidebar?.toggleAttribute("hidden", !collapsed);
  btnToggleSidebar?.setAttribute("aria-expanded", collapsed ? "false" : "true");
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
};

const initSidebarToggle = () => {
  try {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
      setSidebarCollapsed(true);
    }
  } catch {
    // ignore
  }
  btnToggleSidebar?.addEventListener("click", () => setSidebarCollapsed(true));
  btnRevealSidebar?.addEventListener("click", () => setSidebarCollapsed(false));
};

initSidebarToggle();

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
  parsed.locale = "ru";
  parsed.contactStatus = "в сети";
  parsed.contactStatusTyping = "печатает...";
  if (parsed.myName === "Me") {
    parsed.myName = "Я";
  }
  if (parsed.outro?.enabled) {
    parsed.outro = {
      ...(parsed.outro ?? {}),
      enabled: true,
      text: parsed.outro?.text ?? "Подпишись :)",
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

const deleteLocalStoryImage = async (targetRef) => {
  const res = await fetch("/api/images/delete", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({targetRef, cascadeStoryAssets: true}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Ошибка удаления");
  }
  return data;
};

const clearStoryImageHolderFields = (holder) => {
  if (!holder) {
    return;
  }
  delete holder.image;
  delete holder.storyImage;
  delete holder.storyVideo;
  delete holder.storyVideoDurationMs;
  delete holder.storyVideoProfile;
};

const removeStoryImageFromSlot = async (messageIndex, {deleteFile = true} = {}) => {
  const parsed = parseConversationJson();
  if (!parsed) {
    return;
  }

  const holder =
    messageIndex == null ? parsed.story?.opening : parsed.messages?.[messageIndex];
  if (!holder) {
    return;
  }

  const imageRef = String(
    messageIndex == null ? holder.image ?? "" : holder.storyImage ?? "",
  ).trim();
  if (!imageRef) {
    return;
  }

  clearStoryImageHolderFields(holder);
  jsonInput.value = JSON.stringify(parsed, null, 2);

  if (deleteFile && !isImageUrl(imageRef)) {
    await deleteLocalStoryImage(imageRef);
  }
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
  const slot = document.querySelector(`[data-image-slot-index="${item.messageIndex}"]`);
  const promptText = slot?.querySelector(".image-card__prompt-input")?.value?.trim() ?? "";
  if (promptText) {
    if (imagePromptSaveTimers.has(item.messageIndex)) {
      clearTimeout(imagePromptSaveTimers.get(item.messageIndex));
      imagePromptSaveTimers.delete(item.messageIndex);
    }
    setJsonImagePrompt(item.messageIndex, promptText);
  }
  const targetRef = item.kind === "local" && item.hasImagePath ? item.ref : buildEditorImageRef(item.messageIndex);
  const res = await fetch("/api/images/generate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      json: jsonInput.value,
      messageIndex: item.messageIndex,
      prompt: promptText || undefined,
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
  } else if (promptText) {
    setJsonImagePrompt(item.messageIndex, promptText);
  }
  if (data.previewUrl) {
    const img = slot?.querySelector(".image-slot__preview");
    if (img) {
      img.src = data.previewUrl;
    }
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

const pickClipboardImageFile = async (clipboardData) => {
  const fromEvent = clipboardData ? getClipboardImageFile(clipboardData) : null;
  if (fromEvent) {
    return fromEvent;
  }
  if (!navigator.clipboard?.read) {
    return null;
  }
  const items = await navigator.clipboard.read();
  for (const clipItem of items) {
    const type = clipItem.types.find((entry) => entry.startsWith("image/"));
    if (!type) {
      continue;
    }
    const blob = await clipItem.getType(type);
    return new File([blob], pasteImageFileName({type, name: ""}), {type});
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

const uploadImageBuffer = async ({targetRef, file}) => {
  const contentBase64 = await readFileAsDataUrl(file);
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
  return data;
};

const resolvePasteImageItem = (message, messageIndex) => {
  const fromMessage = buildItemFromMessage(message, messageIndex);
  if (fromMessage) {
    return fromMessage;
  }
  const pending = buildPendingImageItem(message, messageIndex);
  if (pending) {
    return pending;
  }
  return {
    messageIndex,
    author: message.author ?? "?",
    text: String(message.text ?? "").trim(),
    imagePrompt: undefined,
    ref: buildEditorImageRef(messageIndex),
    kind: "local",
    status: "pending",
    previewUrl: null,
  };
};

const pasteMessageImage = async (messageIndex, file) => {
  const conversation = parseConversationJson();
  const message = conversation?.messages?.[messageIndex];
  if (!message) {
    throw new Error("Сообщение не найдено");
  }
  const item = resolvePasteImageItem(message, messageIndex);
  const targetRef =
    item.kind === "local"
      ? String(message.image ?? "").trim() || item.ref
      : item.ref;
  const data = await uploadImageBuffer({targetRef, file});
  setJsonImage(messageIndex, data.publicPath);
};

const pasteStoryImage = async (messageIndex, file) => {
  const targetRef =
    messageIndex == null ? buildEditorStoryOpeningRef() : buildEditorStoryRef(messageIndex);
  const data = await uploadImageBuffer({targetRef, file});
  if (messageIndex == null) {
    setJsonStoryOpeningImage(data.publicPath);
  } else {
    setJsonStoryImage(messageIndex, data.publicPath);
  }
};

const pasteImageForMessageContext = async (messageIndex, file) => {
  const conversation = parseConversationJson();
  if (!conversation?.messages?.[messageIndex]) {
    throw new Error("Сообщение не найдено");
  }
  if (isStoryVisualLayout(conversation)) {
    await pasteStoryImage(messageIndex, file);
  } else {
    await pasteMessageImage(messageIndex, file);
  }
};

const runPasteFromBuffer = async (pasteFn) => {
  try {
    const file = await pickClipboardImageFile();
    if (!file) {
      alert(
        "В буфере нет изображения. Скопируйте картинку (Cmd+C) и нажмите «Из буфера» или Ctrl+V в блоке фото.",
      );
      return;
    }
    await pasteFn(file);
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
  }
};

const appendPasteFromBufferActions = (actions, {onFocus, onPaste}) => {
  const btnPaste = document.createElement("button");
  btnPaste.type = "button";
  btnPaste.className = "btn btn-primary btn-small";
  btnPaste.textContent = "Из буфера";
  btnPaste.title = "Вставить скриншот или картинку из буфера (или Ctrl+V в этом блоке)";
  btnPaste.addEventListener("click", async () => {
    onFocus?.();
    btnPaste.disabled = true;
    try {
      await runPasteFromBuffer(onPaste);
    } finally {
      btnPaste.disabled = false;
    }
  });

  const pasteHint = document.createElement("span");
  pasteHint.className = "image-slot__paste-hint";
  pasteHint.textContent = "или Ctrl+V";

  actions.append(btnPaste, pasteHint);
};

let lastFocusedImageSlotIndex = null;
let lastFocusedStorySlotIndex = null;

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

const renderStoryImageSlot = ({messageIndex, message, title, previewUrl = null}) => {
  const slot = document.createElement("div");
  slot.className = "image-slot image-slot--story";
  slot.dataset.storySlotIndex = String(messageIndex ?? "opening");
  slot.tabIndex = 0;
  slot.title = "Ctrl+V — вставить изображение из буфера";

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
    preview.src =
      previewUrl ||
      (isImageUrl(imagePath) ? imagePath : `/${imagePath.replace(/^\/+/, "")}`);
    preview.addEventListener("click", () => openImageLightbox(preview.src));
    slot.append(preview);
  }

  const actions = document.createElement("div");
  actions.className = "image-slot__actions";

  const btnGenerate = document.createElement("button");
  btnGenerate.type = "button";
  btnGenerate.className = "btn btn-primary btn-small";
  btnGenerate.dataset.action = "generate-story-image";
  btnGenerate.textContent = imagePath ? "Перегенерировать" : "Сгенерировать";
  btnGenerate.disabled = !canGenerateImages();
  btnGenerate.addEventListener("click", async () => {
    if (imagePath && !window.confirm("Перегенерировать story-кадр? Текущий файл будет заменён.")) {
      return;
    }
    btnGenerate.disabled = true;
    try {
      const promptText = promptInput.value.trim();
      flushStoryImagePromptToJson(messageIndex, promptText);
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          json: jsonInput.value,
          messageIndex: messageIndex ?? undefined,
          imageKind: messageIndex == null ? "story-opening" : "story",
          prompt: promptText || undefined,
          targetRef:
            messageIndex == null ? buildEditorStoryOpeningRef() : buildEditorStoryRef(messageIndex),
          aspectRatio: "9:16",
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
      const savedPrompt = data.imagePrompt || promptText;
      if (savedPrompt) {
        promptInput.value = savedPrompt;
        flushStoryImagePromptToJson(messageIndex, savedPrompt);
      }
      const preview = slot.querySelector(".image-slot__preview");
      if (data.previewUrl) {
        if (preview) {
          preview.src = data.previewUrl;
        } else {
          const nextPreview = document.createElement("img");
          nextPreview.className = "image-slot__preview";
          nextPreview.alt = title;
          nextPreview.loading = "lazy";
          nextPreview.src = data.previewUrl;
          nextPreview.addEventListener("click", () => openImageLightbox(nextPreview.src));
          slot.insertBefore(nextPreview, actions);
        }
        btnGenerate.textContent = "Перегенерировать";
      } else {
        await refreshDialogue();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      updateImageProviderControls();
    }
  });
  actions.append(btnGenerate);

  appendPasteFromBufferActions(actions, {
    onFocus: () => {
      lastFocusedStorySlotIndex = messageIndex == null ? "opening" : messageIndex;
      slot.focus();
    },
    onPaste: (file) => pasteStoryImage(messageIndex, file),
  });

  if (imagePath) {
    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "btn btn-danger btn-small";
    btnDelete.textContent = "Удалить";
    btnDelete.addEventListener("click", async () => {
      const isLocal = !isImageUrl(imagePath);
      const msg = isLocal
        ? "Удалить story-кадр с диска? Промпт останется — можно сгенерировать заново."
        : "Убрать story-кадр из JSON? Промпт останется — можно сгенерировать заново.";
      if (!window.confirm(msg)) {
        return;
      }
      btnDelete.disabled = true;
      try {
        await removeStoryImageFromSlot(messageIndex, {deleteFile: isLocal});
        await refreshDialogue();
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        btnDelete.disabled = false;
      }
    });
    actions.append(btnDelete);
  }

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

const renderStoryOpeningPanel = (conversation, storyPreviewLookup) => {
  const panel = document.createElement("section");
  panel.className = "dialogue-block dialogue-block--opening";
  const sceneCol = document.createElement("div");
  sceneCol.className = "dialogue-block__scene";
  const scene = document.createElement("div");
  scene.className = "dialogue-scene";

  const openingText = String(conversation.story?.opening?.imagePrompt ?? "").trim();
  const openingPath = String(conversation.story?.opening?.image ?? "").trim();
  const frame = document.createElement("div");
  frame.className = `dialogue-scene__frame${openingPath ? "" : " dialogue-scene__frame--empty"}`;

  const num = document.createElement("span");
  num.className = "dialogue-scene__num";
  num.textContent = "Opening";
  frame.append(num);

  if (openingPath) {
    const previewUrl =
      storyPreviewLookup?.get("opening") ??
      (isImageUrl(openingPath) ? openingPath : `/${openingPath.replace(/^\/+/, "")}`);
    const img = document.createElement("img");
    img.className = "dialogue-scene__img";
    img.alt = "Opening";
    img.loading = "lazy";
    img.src = previewUrl;
    img.addEventListener("click", () => openImageLightbox(img.src));
    frame.append(img);
    const gradient = document.createElement("div");
    gradient.className = "dialogue-scene__gradient";
    frame.append(gradient);
  }

  const caption = document.createElement("div");
  caption.className = "dialogue-scene__caption";
  caption.textContent = openingText;
  frame.append(caption);
  scene.append(frame);

  const controls = document.createElement("div");
  controls.className = "dialogue-scene__controls";
  controls.append(
    renderStoryImageSlot({
      messageIndex: null,
      message: conversation,
      title: "story.opening",
      previewUrl: storyPreviewLookup?.get("opening") ?? null,
    }),
  );
  scene.append(controls);
  sceneCol.append(scene);
  panel.append(sceneCol);

  const messageCol = document.createElement("div");
  messageCol.className = "dialogue-block__message";
  const title = document.createElement("h3");
  title.className = "dialogue-editor__story-title";
  title.textContent = "Opening scene";
  const hint = document.createElement("p");
  hint.className = "dialogue-hint";
  hint.textContent =
    "Полноэкранный кадр до начала переписки. Текст на превью — промпт кадра.";
  messageCol.append(title, hint);
  panel.append(messageCol);

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

  appendPasteFromBufferActions(actions, {
    onFocus: () => {
      lastFocusedImageSlotIndex = item.messageIndex;
      slot.focus();
    },
    onPaste: (file) => pasteMessageImage(item.messageIndex, file),
  });

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

const resolveScenePreview = (message, messageIndex, item, storyPreviewLookup) => {
  const storyPath = String(message.storyImage ?? "").trim();
  const chatImagePath = String(message.image ?? "").trim();
  const path = storyPath || chatImagePath;
  if (!path) {
    return null;
  }
  const previewUrl =
    storyPreviewLookup?.get(messageIndex) ??
    item?.previewUrl ??
    (isImageUrl(path) ? path : `/${path.replace(/^\/+/, "")}`);
  return {path, previewUrl};
};

const renderDialogueSceneBlock = ({
  message,
  messageIndex,
  item,
  storyPreviewLookup,
  messageText,
  isStoryVisual,
}) => {
  const scene = document.createElement("div");
  scene.className = "dialogue-scene";

  const frame = document.createElement("div");
  const preview = resolveScenePreview(message, messageIndex, item, storyPreviewLookup);
  frame.className = `dialogue-scene__frame${preview ? "" : " dialogue-scene__frame--empty"}`;

  const num = document.createElement("span");
  num.className = "dialogue-scene__num";
  num.textContent = `№${messageIndex + 1}`;
  frame.append(num);

  if (preview) {
    const img = document.createElement("img");
    img.className = "dialogue-scene__img";
    img.alt = `Кадр ${messageIndex + 1}`;
    img.loading = "lazy";
    img.src = preview.previewUrl;
    img.addEventListener("click", () => openImageLightbox(img.src));
    frame.append(img);
    const gradient = document.createElement("div");
    gradient.className = "dialogue-scene__gradient";
    frame.append(gradient);
  }

  const caption = document.createElement("div");
  caption.className = "dialogue-scene__caption";
  caption.dataset.sceneCaptionIndex = String(messageIndex);
  caption.textContent = messageText;
  frame.append(caption);

  scene.append(frame);

  const controls = document.createElement("div");
  controls.className = "dialogue-scene__controls";

  const hasStorySlot =
    message.storyImage?.trim() ||
    message.storyImagePrompt?.trim() ||
    isStoryVisual;

  if (hasStorySlot || isStoryVisual) {
    if (message.storyImage?.trim() || message.storyImagePrompt?.trim()) {
      controls.append(
        renderStoryImageSlot({
          messageIndex,
          message,
          title: `Кадр · №${messageIndex + 1}`,
          previewUrl: storyPreviewLookup?.get(messageIndex) ?? null,
        }),
      );
    } else {
      const addStoryRow = document.createElement("div");
      addStoryRow.className = "dialogue-msg__add-image";
      const btnAddStory = document.createElement("button");
      btnAddStory.type = "button";
      btnAddStory.className = "btn btn-secondary btn-small";
      btnAddStory.textContent = "+ Кадр сцены";
      btnAddStory.addEventListener("click", () => {
        setJsonStoryImagePrompt(
          messageIndex,
          "Рисованный кадр сцены в момент этой реплики.",
        );
        refreshDialogue();
      });
      addStoryRow.append(btnAddStory);
      controls.append(addStoryRow);
    }
  } else if (message.image?.trim() || message.imagePrompt?.trim()) {
    const resolved = resolveImageItem(message, messageIndex, item);
    if (resolved) {
      controls.append(renderImageControls(resolved));
    }
  } else {
    const addRow = document.createElement("div");
    addRow.className = "dialogue-msg__add-image";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-secondary btn-small";
    btnAdd.textContent = "+ Изображение";
    btnAdd.addEventListener("click", () => {
      setJsonStoryImagePrompt(
        messageIndex,
        "Рисованный кадр сцены в момент этой реплики.",
      );
      refreshDialogue();
    });
    addRow.append(btnAdd);
    controls.append(addRow);
  }

  scene.append(controls);
  return scene;
};

const renderMessageDisplayToggle = (messageIndex, currentDisplay) => {
  const wrap = document.createElement("div");
  wrap.className = "dialogue-block__display-toggle";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Тип отображения реплики");

  for (const {value, label} of [
    {value: "center", label: "По центру"},
    {value: "bubble", label: "Пузырь"},
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `dialogue-block__display-btn${
      currentDisplay === value ? " dialogue-block__display-btn--active" : ""
    }`;
    btn.textContent = label;
    btn.addEventListener("click", () => {
      setMessageDisplayInJson(messageIndex, value);
      refreshDialogue();
    });
    wrap.append(btn);
  }
  return wrap;
};

const renderDialogueMessage = (message, messageIndex, item, contactName, storyPreviewLookup) => {
  const row = document.createElement("article");
  const isMe = message.author === "me";
  const display = getMessageDisplay(message);
  const imageState =
    message.image?.trim() || message.imagePrompt?.trim()
      ? getMessageImageState(message, item)
      : null;
  const conversation = parseConversationJson();
  const isStoryVisual = isStoryVisualLayout(conversation);
  const messageText = String(message.text ?? "").trim();

  row.className = `dialogue-block${
    imageState?.needsImageFile ? " dialogue-block--needs-image" : ""
  }`;
  row.dataset.messageIndex = String(messageIndex);

  const sceneCol = document.createElement("div");
  sceneCol.className = "dialogue-block__scene";
  sceneCol.append(
    renderDialogueSceneBlock({
      message,
      messageIndex,
      item,
      storyPreviewLookup,
      messageText,
      isStoryVisual,
    }),
  );
  row.append(sceneCol);

  const messageCol = document.createElement("div");
  messageCol.className = "dialogue-block__message";

  const toolbar = document.createElement("div");
  toolbar.className = "dialogue-block__toolbar";

  const who = document.createElement("span");
  who.className = "dialogue-block__who";
  who.textContent = isMe ? "Я" : contactName?.trim() || "Собеседник";
  toolbar.append(who);

  toolbar.append(renderMessageDisplayToggle(messageIndex, display));

  if (imageState?.needsImageFile) {
    const badge = document.createElement("span");
    badge.className = "dialogue-msg__needs-image-badge";
    badge.textContent = "нужно фото";
    toolbar.append(badge);
  }

  if (message.sentAt) {
    const time = document.createElement("span");
    time.className = "dialogue-msg__time";
    time.textContent = message.sentAt;
    toolbar.append(time);
  }

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
  toolbar.append(btnRegen);
  messageCol.append(toolbar);

  const body = document.createElement("div");
  body.className = `dialogue-block__body dialogue-block__body--${display} dialogue-block__body--${
    isMe ? "me" : "them"
  }`;

  if (display === "center") {
    const textarea = document.createElement("textarea");
    textarea.className = "dialogue-block__text";
    textarea.rows = 3;
    textarea.value = messageText;
    textarea.placeholder = "Текст реплики…";
    textarea.dataset.messageTextIndex = String(messageIndex);
    textarea.addEventListener("input", () => {
      autoResizeMessageTextarea(textarea);
      setMessageTextInJson(messageIndex, textarea.value);
      syncSceneCaption(messageIndex, textarea.value);
    });
    textarea.addEventListener("blur", () => {
      const cleaned = sanitizeMessageText(textarea.value);
      if (cleaned !== textarea.value) {
        textarea.value = cleaned;
        setMessageTextInJson(messageIndex, cleaned);
        syncSceneCaption(messageIndex, cleaned);
      }
      autoResizeMessageTextarea(textarea);
    });
    body.append(textarea);
    requestAnimationFrame(() => autoResizeMessageTextarea(textarea));
  } else {
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
      syncSceneCaption(messageIndex, textarea.value);
    });
    textarea.addEventListener("blur", () => {
      const cleaned = sanitizeMessageText(textarea.value);
      if (cleaned !== textarea.value) {
        textarea.value = cleaned;
        setMessageTextInJson(messageIndex, cleaned);
        syncSceneCaption(messageIndex, cleaned);
      }
      autoResizeMessageTextarea(textarea);
    });
    bubble.append(textarea);
    body.append(bubble);
    requestAnimationFrame(() => autoResizeMessageTextarea(textarea));
  }

  messageCol.append(body);
  row.append(messageCol);
  return row;
};

const renderDialogueEditor = (conversation, items, timingPreview, storyItems = []) => {
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
  if (dialogueCanvasTitle) {
    dialogueCanvasTitle.textContent = conversation.contactName
      ? `Диалог · ${conversation.contactName}`
      : "Диалог";
  }

  const thread = document.createElement("div");
  thread.className = "dialogue-editor__thread";

  const itemsByIndex = new Map((items ?? []).map((item) => [item.messageIndex, item]));
  const storyPreviewLookup = buildStoryPreviewLookup(storyItems);

  const needsImageIndexes = [];
  if (conversation.layout !== "storySplit" && conversation.layout !== "storyOverlay") {
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

  if (isStoryVisualLayout(conversation)) {
    dialogueEditor.append(renderStoryOpeningPanel(conversation, storyPreviewLookup));
  }

  for (let i = 0; i < conversation.messages.length; i++) {
    thread.append(
      renderDialogueMessage(
        conversation.messages[i],
        i,
        itemsByIndex.get(i),
        conversation.contactName,
        storyPreviewLookup,
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
    updateRefineDialogueControls();
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
  syncEpisodesFromJson();
    renderDialogueEditor(conversation, data.items ?? [], messageTimingPreview, data.storyItems ?? []);
    updateGenerateImagesControls(conversation);
    updateVoiceoverControls(conversation);
  } catch {
    renderDialogueEditor(conversation, [], messageTimingPreview, []);
    updateGenerateImagesControls(conversation);
    updateVoiceoverControls(conversation);
  }
  updateRefineDialogueControls();
};

const scheduleRefreshDialogue = () => {
  if (scanImagesTimer) {
    clearTimeout(scanImagesTimer);
  }
  scanImagesTimer = setTimeout(refreshDialogue, 500);
};

dialogueEditor.addEventListener("focusin", (e) => {
  const storySlot = e.target.closest("[data-story-slot-index]");
  if (storySlot) {
    const raw = storySlot.dataset.storySlotIndex;
    lastFocusedStorySlotIndex = raw === "opening" ? "opening" : Number(raw);
    return;
  }
  const slot = e.target.closest("[data-image-slot-index]");
  if (slot) {
    lastFocusedImageSlotIndex = Number(slot.dataset.imageSlotIndex);
  }
});

dialogueEditor.addEventListener("click", (e) => {
  const storySlot = e.target.closest("[data-story-slot-index]");
  if (storySlot) {
    const raw = storySlot.dataset.storySlotIndex;
    lastFocusedStorySlotIndex = raw === "opening" ? "opening" : Number(raw);
    if (!e.target.closest("textarea, input, button, label, a")) {
      storySlot.focus();
    }
    return;
  }
  const slot = e.target.closest("[data-image-slot-index]");
  if (!slot) {
    return;
  }
  lastFocusedImageSlotIndex = Number(slot.dataset.imageSlotIndex);
  if (!e.target.closest("textarea, input, button, label, a")) {
    slot.focus();
  }
});

const resolveStorySlotIndex = (raw) => {
  if (raw == null || raw === "opening") {
    return null;
  }
  const index = Number(raw);
  return Number.isNaN(index) ? undefined : index;
};

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

  const storySlotEl = e.target.closest("[data-story-slot-index]");
  const imageSlotEl = e.target.closest("[data-image-slot-index]");
  const msgRow = e.target.closest("[data-message-index]");
  const textMessageIndex =
    active?.dataset?.messageTextIndex != null
      ? Number(active.dataset.messageTextIndex)
      : msgRow
        ? Number(msgRow.dataset.messageIndex)
        : null;

  if (storySlotEl) {
    e.preventDefault();
    try {
      await pasteStoryImage(resolveStorySlotIndex(storySlotEl.dataset.storySlotIndex) ?? null, file);
      await refreshDialogue();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  let messageIndex = imageSlotEl
    ? Number(imageSlotEl.dataset.imageSlotIndex)
    : textMessageIndex != null && !Number.isNaN(textMessageIndex)
      ? textMessageIndex
      : lastFocusedImageSlotIndex;

  if (messageIndex != null && !Number.isNaN(messageIndex)) {
    e.preventDefault();
    try {
      await pasteImageForMessageContext(messageIndex, file);
      await refreshDialogue();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (lastFocusedStorySlotIndex != null) {
    e.preventDefault();
    try {
      const storyIndex =
        lastFocusedStorySlotIndex === "opening" ? null : lastFocusedStorySlotIndex;
      await pasteStoryImage(storyIndex, file);
      await refreshDialogue();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }
});

dialogueRefinePromptInput?.addEventListener("input", updateRefineDialogueControls);

jsonInput.addEventListener("input", () => {
  syncTitleCardFieldsFromJson();
  syncVideoLayoutFromJson();
  syncVideoTextModeFromJson();
  syncStoryAnimationFromJson();
  syncMessageFontSizeFromJson();
  updateWallpaperControls();
  updateStoryAnimationControls();
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
    applyStoryAnimationToJson();
    scheduleRefreshDialogue();
  });
}

for (const input of videoTextModeInputs) {
  input.addEventListener("change", () => {
    applyVideoTextModeToJson(getVideoTextMode());
    scheduleRefreshDialogue();
  });
}

for (const input of storyAnimationInputs) {
  input.addEventListener("change", () => {
    applyStoryAnimationToJson();
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
  preparing: "Подготовка к рендеру…",
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
    (renderModal && !renderModal.hidden) ||
    (textGenModal && !textGenModal.hidden) ||
    (voiceCatalogModal && !voiceCatalogModal.hidden) ||
    (musicCatalogModal && !musicCatalogModal.hidden);
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
  if (job.status === "preparing" && job.phase) {
    return `${percent}% · ${job.phase}`;
  }
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
  const active =
    job.status === "preparing" || job.status === "queued" || job.status === "running" || copying;
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
    job.status === "preparing" && job.phase
      ? job.phase
      : job.status === "queued" && job.queuePosition > 0
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

  const withCacheBust = withCacheBustUrl;

  if (downloadBlock && downloadLinks && pathsHint) {
    if (
      job.status === "done" &&
      job.downloadUrl &&
      (job.target !== "remote" || job.localCopyStatus === "done")
    ) {
      syncOutputFromJob(job);
      downloadBlock.hidden = false;
      renderJobDownloadLinks(job, withCacheBust);
      const outputs = job.episodeOutputs?.length
        ? job.episodeOutputs.map((item) => item.outputPath ?? item.outputFile).join(", ")
        : job.outputPath ?? "—";
      pathsHint.textContent = `JSON: ${job.inputPath ?? "—"} · MP4: ${outputs} · concurrency: ${job.renderConcurrency ?? "—"}`;
    } else if (job.status === "done" && job.downloadUrl && job.localCopyStatus === "error") {
      downloadBlock.hidden = false;
      renderJobDownloadLinks(job, withCacheBust);
      pathsHint.textContent = `Локальная копия не удалась — файл остался на воркере. JSON: ${job.inputPath ?? "—"}`;
    } else if (job.status === "done" && job.localCopyStatus === "copying") {
      downloadBlock.hidden = true;
    } else if (job.inputPath || job.outputPath) {
      syncOutputFromJob(job);
      downloadBlock.hidden = false;
      renderJobDownloadLinks(
        {
          ...job,
          downloadUrl: job.downloadUrl ?? `/out/${job.outputFile ?? "video.mp4"}`,
        },
        withCacheBust,
      );
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
    updateWallpaperControls();
    syncMessageFontSizeFromJson();
    syncMusicFromJson();
    await refreshDialogue();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
});

btnRender.addEventListener("click", async () => {
  let json = prepareJsonForRender();
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
  if (downloadLinks) {
    downloadLinks.replaceChildren();
  }

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

    json = jsonInput.value.trim();

    const renderPayload = {
        json,
        name: dialogueTitleInput.value.trim() || undefined,
        displayTitle: dialogueTitleInput.value.trim() || undefined,
        music: getMusicId(),
        dialogueId: currentDialogueId ?? undefined,
        target: getRenderTarget(),
      };
    const wallpaperForRender = resolveWallpaperPayload();
    if (wallpaperForRender !== undefined) {
      renderPayload.wallpaper = wallpaperForRender;
    }

    const res = await fetch("/api/render", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(renderPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка запроса");
    }

    showStatus({
      ...data,
      status: data.status ?? "preparing",
      queuePosition: 0,
      progress: data.progress ?? 0.01,
      phase: data.phase ?? "Подготовка…",
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
  if (isStoryVisualLayout(conversation)) {
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

  updatePreviewCoverControls(parsed);
};

const updatePreviewCoverControls = (conversation = null) => {
  const parsed = conversation ?? parseConversationJson();
  if (previewCoverPreview) {
    const coverImage = String(parsed?.previewCover?.image ?? "").trim();
    if (coverImage) {
      previewCoverPreview.hidden = false;
      previewCoverPreview.href = `/${coverImage.replace(/^\/+/, "")}?t=${Date.now()}`;
      previewCoverPreview.textContent = parsed?.previewCover?.title
        ? `Обложка: ${parsed.previewCover.title}`
        : "Открыть обложку";
    } else {
      previewCoverPreview.hidden = true;
    }
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

const getDialogueGenOptions = () => {
  const options = {
    language: getDialogueLanguage(),
    model: getDialogueModel(),
    videoLayout: editorKind === "shorts" ? getVideoLayout() : undefined,
    textMode: editorKind === "video" ? getVideoTextMode() : undefined,
  };
  if (editorKind === "shorts" || editorKind === "series") {
    options.messageCount = getDialogueMessageCount();
    options.imageCount = getDialogueImageCount();
  }
  return options;
};

const formatDialogueGenSummary = ({messageCount, imageCount, model, videoLayout, textMode}) => {
  const parts = [];
  if (editorKind === "shorts" || editorKind === "series") {
    const photos = imageCount > 0 ? `, фото ≤${imageCount}` : ", без фото";
    parts.push(`≤${messageCount} сообщ.${photos}`);
  }
  if (editorKind === "shorts" && videoLayout) {
    parts.push(VIDEO_LAYOUT_LABELS[videoLayout] ?? videoLayout);
  }
  if (editorKind === "video" && textMode) {
    parts.push(VIDEO_TEXT_MODE_LABELS[textMode] ?? textMode);
  }
  if (model) {
    parts.push(findDialogueModelLabel(model));
  }
  return parts.join(", ");
};

const generateDialogueFromPrompt = async () => {
  if (!canGenerateDialogue()) {
    throw new Error("Задайте OPENROUTER_API_KEY в docs/.env (диалоги — ChatGPT через OpenRouter)");
  }

  if (editorKind === "shorts" || editorKind === "video") {
    clearShortsJsonBeforeGenerate();
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
    body.videoLayout = getVideoLayout();
    body.includeImages = getDialogueImageCount() > 0;
    body.imageCount = getDialogueImageCount();
  }

  if (editorKind === "video") {
    body.textMode = getVideoTextMode();
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
  if ((editorKind === "shorts" || editorKind === "video") && data.displayTitle) {
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
  };
  if (editorKind === "shorts" || editorKind === "series") {
    body.includeImages = getDialogueImageCount() > 0;
    body.imageCount = getDialogueImageCount();
  }
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
  if ((editorKind === "shorts" || editorKind === "video") && data.displayTitle) {
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
    body.videoLayout = getVideoLayout();
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
  if ((editorKind === "shorts" || editorKind === "video") && data.displayTitle) {
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
      messageCount: getDialogueMessageCount(),
      imageCount: getDialogueImageCount(),
      language: getDialogueLanguage(),
      videoLayout: getVideoLayout(),
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
  if ((editorKind === "shorts" || editorKind === "video") && data.displayTitle) {
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
    updateVoiceoverControls();
  }
});

voiceoverEnabled?.addEventListener("change", () => {
  applyVoiceoverToJson();
  scheduleRefreshDialogue();
  updateVoiceoverControls();
  if (voiceGenderControls) {
    voiceGenderControls.hidden = !voiceoverEnabled.checked;
  }
});

const onVoiceGenderChange = () => {
  applyVoiceoverToJson();
  clearVoiceAudioForRevoice();
  updateVoiceoverControls();
  scheduleRefreshDialogue();
};
meVoiceSelect?.addEventListener("change", onVoiceGenderChange);
themVoiceSelect?.addEventListener("change", onVoiceGenderChange);

btnPreviewMeVoice?.addEventListener("click", () => {
  playVoicePreview(meVoiceSelect?.value, {triggerBtn: btnPreviewMeVoice});
});
btnPreviewThemVoice?.addEventListener("click", () => {
  playVoicePreview(themVoiceSelect?.value, {triggerBtn: btnPreviewThemVoice});
});
btnOpenVoiceCatalog?.addEventListener("click", () => setVoiceCatalogModalOpen(true));

for (const el of document.querySelectorAll("[data-voice-catalog-dismiss]")) {
  el.addEventListener("click", () => setVoiceCatalogModalOpen(false));
}

btnRegenVoices?.addEventListener("click", async () => {
  if (voiceoverEnabled && !voiceoverEnabled.checked) {
    voiceoverEnabled.checked = true;
  }
  applyVoiceoverToJson();
  clearVoiceAudioForRevoice();
  btnRegenVoices.disabled = true;
  const prevLabel = btnRegenVoices.textContent;
  btnRegenVoices.textContent = "Озвучиваю…";
  try {
    await generateMissingVoiceover();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  } finally {
    btnRegenVoices.disabled = false;
    btnRegenVoices.textContent = prevLabel;
  }
});

const onEpisodesToggle = () => {
  applyEpisodesToJson();
  scheduleRefreshDialogue();
};
episodesEnabled?.addEventListener("change", onEpisodesToggle);
episodeCountSelect?.addEventListener("change", onEpisodesToggle);

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
    if (typeof data.openrouter.storyImageModel === "string" && data.openrouter.storyImageModel) {
      openrouterStoryImageModel = data.openrouter.storyImageModel;
    }
  }
  if (typeof data?.voiceover?.ttsProfile === "string" && data.voiceover.ttsProfile) {
    openrouterTtsProfile = data.voiceover.ttsProfile;
  }
  if (data?.voiceover?.voices) {
    openrouterTtsDefaults = {
      male: data.voiceover.voices.male ?? "Puck",
      female: data.voiceover.voices.female ?? "Leda",
    };
  }
  if (Array.isArray(data?.voiceover?.catalog) && data.voiceover.catalog.length > 0) {
    populateVoiceSelects(data.voiceover.catalog);
  }
  updateImageProviderControls();
  updateGenerateImagesControls();
  updateVoiceoverControls();
  updateDialogueGenerateControls();
  updateMessageRegenControls();
  updateLogicControls();
  populateDialogueModelOptions();
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
      `Чат-картинки (4:3): ${openrouter.imageModel ?? openrouterImageModel}${
        openrouter.imageGenerationAvailable ? " (доступно)" : ""
      }`,
      `Story-кадры (9:16): ${openrouter.storyImageModel ?? openrouterStoryImageModel}${
        openrouter.storyImageSize ? `, ${openrouter.storyImageSize}` : ""
      }`,
      `Озвучка: ${openrouter.ttsModel ?? data.voiceover?.model ?? "google/gemini-3.1-flash-tts-preview"}`,
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
musicSelect?.addEventListener("change", onMusicChange);
btnPreviewMusic?.addEventListener("click", () => {
  playMusicPreview(getMusicId(), {triggerBtn: btnPreviewMusic});
});
btnOpenMusicCatalog?.addEventListener("click", () => setMusicCatalogModalOpen(true));
for (const el of document.querySelectorAll("[data-music-catalog-dismiss]")) {
  el.addEventListener("click", () => setMusicCatalogModalOpen(false));
}
loadRenderTargets();
loadStylePrompt();
loadStoryStylePrompt();
populateVoiceSelects();
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
    updateImageProviderControls();
    updateMessageRegenControls();
    updateLogicControls();
  }
};

loadOpenRouterStatus().then(() => {
  loadDialogueModels();
  updateVoiceoverControls();
});
initEditorPreferenceControls();
updateWallpaperControls();
updateStoryAnimationControls();
syncStoryAnimationFromJson();
syncEditorKindUi();
loadBrowseOnStartup();
