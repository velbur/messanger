import path from "node:path";
import {createWriteStream} from "node:fs";
import {access, mkdir, readFile, writeFile} from "node:fs/promises";
import {pipeline} from "node:stream/promises";
import {Readable} from "node:stream";
import express from "express";
import {ZodError} from "zod";
import {formatConversationValidationError, parseConversation} from "../src/chat/schema.ts";
import {
  estimateMessagesDurationMs,
  getTimingSpeed,
  mergeConversationTiming,
  resolveMessageTiming,
  TIMING_SCALE,
} from "../src/chat/timing.ts";
import {estimateVideoDurationMs} from "../src/chat/timeline.ts";
import {buildEpisodeConversations, validateEpisodeSplits} from "../src/chat/episodes.ts";
import {
  buildNativeRenderCommand,
  getRenderConcurrency,
  renderChatVideo,
  renderPreviewCover,
} from "./render-core.mjs";
import {makeCancelSignal} from "@remotion/renderer";

const isUserCancelledRender = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("renderMedia() got cancelled") ||
    message.includes("renderFrames() got cancelled") ||
    message.includes("renderStill() got cancelled") ||
    message.includes("stitchFramesToVideo() got cancelled")
  );
};
import {
  DEFAULT_MUSIC_ID,
  listMusicTracks,
  getMusicLicenseInfo,
  PUBLIC_MUSIC_DIR,
  syncAudioToPublic,
} from "./music-tracks.mjs";
import {
  downloadImageToPublic,
  IMAGES_DIR,
  resolveConversationImages,
  collectConversationImageRefs,
  isHoldParallaxBakeAsset,
  saveImageBuffer,
  buildImagePreviewUrl,
  scanImagesFromJson,
  deletePublicImage,
  deleteStoryImageAssets,
  resolveUploadMaxBytes,
  MAX_BINARY_UPLOAD_BYTES,
  uploadJsonBodyLimitBytes,
} from "./image-assets.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {resolveImageReferences} from "./image-references.mjs";
import {
  buildPreviewCoverPrompt,
  loadPreviewCoverReferenceDataUrl,
  resolvePreviewCoverSceneHint,
} from "./preview-cover.mjs";
import {ensureConversationPreviewCovers, collectPreviewCoverSyncRefs, episodeOutputFiles} from "./preview-cover-assets.mjs";
import {
  correctFrameImage,
  ImageCorrectionUnchangedError,
} from "./image-correction.mjs";
import {
  resolveFramePrompts,
  resolveStoryFramePrompts,
  suggestImagePrompt,
  suggestStoryImagePrompt,
  buildImageGenerationPrompt,
  buildStoryImageGenerationPrompt,
} from "./image-prompt-llm.mjs";
import {
  loadOpenRouterEnv,
  generateImageBuffer,
  isOpenRouterConfigured,
  getOpenRouterTextModel,
  getOpenRouterImageModel,
  getOpenRouterStoryImageModel,
  getOpenRouterStoryImageSize,
  resolveOpenRouterImageModel,
  getOpenRouterTtsModel,
  getOpenRouterVoiceoverStatus,
  formatOpenRouterError,
} from "./openrouter-client.mjs";
import {getOpenRouterStoryVideoStatus} from "./openrouter-video.mjs";
import {
  countPendingStoryVideos,
  generateMissingStoryVideos,
  resolveStoryVideos,
  ensureVideoParallaxHoldsForConversation,
} from "./story-video.mjs";
import {
  stripStorySfxFromConversation,
} from "./story-sfx.mjs";
import {normalizeStoryVideoLoopFlags} from "../src/chat/story-video-mode.ts";
import {mergeStoryConfig, needsStoryDepthLayers} from "../src/chat/story.ts";
import {assignStoryMusicIfNeeded, applyConversationMusicSelection} from "./story-music.mjs";
import {ensureStoryDepthForConversation} from "./story-depth.mjs";
import {
  generateDialogue,
  isDialogueLlmConfigured,
  refineDialogue,
  regenerateMessage,
  checkDialogueLogic,
  regenerateEnding,
} from "./dialogue-gen.mjs";
import {enrichStoryVisualDialogue} from "./story-enrich.mjs";
import {readShortsStylesMeta} from "./dialogue-prompts.mjs";
import {runShortsPreRenderChecklist} from "./shorts-checklist.mjs";
import {
  initSessionLog,
  jobLog,
  jobLogHeader,
  mirrorRemoteJobLogs,
  sessionLog,
} from "./session-log.mjs";
import {generateYoutubeMetadata} from "./youtube-metadata.mjs";
import {listDialogueModels, resolveDialogueModel} from "./openrouter-dialogue-models.mjs";
import {generateMissingConversationImages} from "./conversation-images.mjs";
import {
  generateMissingVoiceover,
  countPendingVoiceover,
} from "./conversation-voiceover.mjs";
import {
  AUDIO_DIR,
  resolveConversationVoiceover,
  syncVoiceToRemote,
} from "./voice-assets.mjs";
import {ensureVoicePreview, VOICE_PREVIEW_SAMPLE_TEXT} from "./voice-preview.mjs";
import {previewImagePrompt, readStylePrompt, readStoryStylePrompt, writeStylePrompt, writeStoryStylePrompt} from "./image-prompt.mjs";
import {
  initDialogueDb,
  listDialogues,
  getDialogue,
  getSeriesContextMessages,
  createDialogue,
  updateDialogue,
  deleteDialogue,
  touchDialogueOutput,
} from "./dialogue-db.mjs";
import {slugifyProjectName} from "./project-slug.mjs";
import {isYoutubeConfigured, uploadVideoToYoutube} from "./youtube-client.mjs";
import {uploadAssetToRemote} from "./remote-upload.mjs";
import {
  hybridDurationFrames,
  renderVideoParallaxPreview,
  VIDEO_PARALLAX_EXTRA_SEC,
} from "./render-video-parallax-preview.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_DIR = path.join(ROOT, "json");
const OUT_DIR = path.join(ROOT, "out");
const PUBLIC_DIR = path.join(ROOT, "public");
const UI_DIR = path.join(ROOT, "ui");
const PORT = Number(process.env.PORT ?? 3333);

/** URL удалённого render-воркера (тот же server.mjs на мощной машине), напр. http://192.168.0.136:3333 */
const REMOTE_RENDER_URL = (process.env.REMOTE_RENDER_URL ?? "").trim().replace(/\/+$/, "");

const resolveRequestVideoLayout = ({videoLayout, dialogueStyle, conversation, mode}) => {
  if (mode === "video" || conversation?.layout === "video") {
    return "video";
  }
  if (mode !== "shorts") {
    return "chat";
  }
  if (videoLayout === "storySplit" || videoLayout === "storyOverlay") {
    return videoLayout;
  }
  if (conversation?.layout === "storySplit" || conversation?.layout === "storyOverlay") {
    return conversation.layout;
  }
  if (dialogueStyle === "story") {
    return "storyOverlay";
  }
  return "chat";
};

const formatDialogueApiError = (error) => {
  const validation = formatConversationValidationError(error);
  if (validation) {
    return `JSON переписки: ${validation}`;
  }
  return formatOpenRouterError(error);
};

const getRenderTargets = () => {
  const targets = [{id: "local", label: "Локально (эта машина)"}];
  if (REMOTE_RENDER_URL) {
    targets.push({id: "remote", label: `Мощная машина (${REMOTE_RENDER_URL})`, url: REMOTE_RENDER_URL});
  }
  return targets;
};

const getDefaultRenderTarget = () => (REMOTE_RENDER_URL ? "remote" : "local");

const getPublicBaseUrl = (req) => {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  const host = req?.get?.("host");
  if (host) {
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    return `${proto}://${host}`;
  }
  return `http://127.0.0.1:${PORT}`;
};

const jobs = new Map();
let jobCounter = 0;
let renderBusy = false;
const renderQueue = [];

const IS_RENDER_WORKER = ["1", "true", "yes"].includes(
  (process.env.RENDER_WORKER ?? "").trim().toLowerCase(),
);

const workerJobLabel = (job) => job.fileName || `job-${job.id}`;

/** Печать этапа/прогресса в stdout воркера (docker logs / worker-native). */
const traceJobConsole = (job, message) => {
  if (!IS_RENDER_WORKER || !message) {
    return;
  }
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] [${workerJobLabel(job)}] ${message}`);
};

const jobSetPhase = (job, phase) => {
  const next = typeof phase === "string" && phase.trim() ? phase.trim() : null;
  if (job.phase === next) {
    return;
  }
  job.phase = next;
  if (next) {
    traceJobConsole(job, next);
    void jobLog(job, `[phase] ${next}`);
  }
};

const jobPushLog = (job, message) => {
  const line = String(message ?? "").trim();
  if (!line || job.logs[job.logs.length - 1] === line) {
    return;
  }
  job.logs.push(line);
  traceJobConsole(job, line);
  void jobLog(job, line);
};

const jobPushLogs = (job, lines) => {
  for (const line of lines ?? []) {
    jobPushLog(job, line);
  }
};

const jobSetProgress = (job, progress) => {
  const value = typeof progress === "number" && Number.isFinite(progress) ? progress : 0;
  job.progress = Math.max(0, Math.min(1, value));
  if (!IS_RENDER_WORKER) {
    return;
  }
  const pct = Math.round(job.progress * 100);
  const bucket = Math.floor(pct / 5) * 5;
  if (bucket > 0 && bucket !== job._workerProgressBucket) {
    job._workerProgressBucket = bucket;
    const phaseSuffix = job.phase ? ` — ${job.phase}` : "";
    const progressLine = `${pct}%${phaseSuffix}`;
    traceJobConsole(job, progressLine);
    void jobLog(job, `[progress] ${progressLine}`);
  }
};

/** fetch с таймаутом и повторами — воркер на муксинге может отвечать медленно */
const fetchWithRetry = async (url, options = {}, {timeoutMs = 15000, retries = 2} = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {...options, signal: controller.signal});
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

/** Сколько завершённых задач храним в памяти (защита от роста heap) */
const MAX_FINISHED_JOBS = 20;

const pruneFinishedJobs = () => {
  const finished = [];
  for (const job of jobs.values()) {
    if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
      finished.push(job);
    }
  }
  if (finished.length <= MAX_FINISHED_JOBS) {
    return;
  }
  finished
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .slice(0, finished.length - MAX_FINISHED_JOBS)
    .forEach((job) => jobs.delete(job.id));
};

const resolveName = (rawName, conversation, dialogueId) => {
  if (rawName && String(rawName).trim()) {
    const fromTitle = slugifyProjectName(rawName);
    if (fromTitle !== "render") {
      return fromTitle;
    }
  }

  if (typeof dialogueId === "string" && dialogueId.trim()) {
    const dialogue = getDialogue(dialogueId.trim());
    if (dialogue?.outputFile) {
      const fromDb = dialogue.outputFile.replace(/\.mp4$/i, "");
      if (fromDb) {
        return fromDb;
      }
    }
  }

  if (conversation.contactName) {
    const fromContact = slugifyProjectName(conversation.contactName);
    if (fromContact !== "render") {
      return fromContact;
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `render-${stamp}`;
};

const mp4DownloadUrl = (outputFile, cacheToken) => {
  const base = `/out/${outputFile}`;
  if (!cacheToken) {
    return base;
  }
  return `${base}?v=${cacheToken}`;
};

const resolveOutputFile = ({name, outputFile, dialogueId}) => {
  if (typeof outputFile === "string" && outputFile.trim()) {
    const file = outputFile.trim();
    return file.endsWith(".mp4") ? file : `${file}.mp4`;
  }

  if (typeof dialogueId === "string" && dialogueId.trim()) {
    const dialogue = getDialogue(dialogueId.trim());
    if (dialogue?.outputFile) {
      return dialogue.outputFile;
    }
  }

  if (typeof name === "string" && name.trim()) {
    return `${slugifyProjectName(name)}.mp4`;
  }

  return null;
};

const resolvePublishTitle = ({rawTitle, dialogueId, outputFile}) => {
  let title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (!title && typeof dialogueId === "string" && dialogueId.trim()) {
    const dialogue = getDialogue(dialogueId.trim());
    title =
      dialogue?.titleDisplay?.trim() ||
      dialogue?.title?.trim() ||
      dialogue?.contactName?.trim() ||
      "";
  }
  if (!title) {
    title = outputFile.replace(/\.mp4$/i, "");
  }
  return title;
};

/**
 * Скачивает MP4 с удалённого воркера в локальный out/.
 * @param {{ remoteUrl: string, outputFile: string, logs?: string[] }} opts
 */
const copyRemoteOutputToLocal = async ({remoteUrl, outputFile, logs = []}) => {
  const localPath = path.join(OUT_DIR, outputFile);
  await mkdir(OUT_DIR, {recursive: true});

  const hadLocalCopy = await access(localPath)
    .then(() => true)
    .catch(() => false);

  const url = `${remoteUrl}/out/${encodeURIComponent(outputFile)}`;
  logs.push(
    hadLocalCopy
      ? `Перезапись с воркера: ${url}`
      : `Копирование с воркера: ${url}`,
  );

  const resp = await fetchWithRetry(url, {}, {timeoutMs: 600000, retries: 2});
  if (!resp.ok || !resp.body) {
    throw new Error(
      resp.status === 404
        ? `На воркере нет out/${outputFile}`
        : `Воркер вернул ошибку (${resp.status})`,
    );
  }

  await pipeline(Readable.fromWeb(resp.body), createWriteStream(localPath));
  logs.push(hadLocalCopy ? `Обновлено: out/${outputFile}` : `Скопировано: out/${outputFile}`);
  return {localPath, outputFile, replaced: hadLocalCopy};
};

/** Скачивает MP4 с воркера в локальный out/ (один или несколько эпизодов) */
const ensureRemoteOutputsCopiedLocally = async (job) => {
  if (!job.remote) {
    return;
  }

  const files =
    job.outputFiles?.length > 0
      ? job.outputFiles
      : job.outputFile
        ? [job.outputFile]
        : [];
  if (files.length === 0) {
    return Promise.resolve();
  }

  if (job.localCopyStatus === "done" && job.episodeOutputs?.length === files.length) {
    return Promise.resolve();
  }
  if (job.localCopyStatus === "copying" && job.localCopyPromise) {
    return job.localCopyPromise;
  }

  if (job.localCopyStatus !== "copying") {
    job.logs.push(
      files.length > 1
        ? `Копирование ${files.length} эпизодов с воркера…`
        : "Копирование MP4 с воркера на этот компьютер…",
    );
  }
  job.localCopyStatus = "copying";
  job.localCopyPromise = (async () => {
    try {
      const finishedAt = job.finishedAt ?? Date.now();
      job.episodeOutputs = [];
      for (let i = 0; i < files.length; i += 1) {
        const outputFile = files[i];
        await copyRemoteOutputToLocal({
          remoteUrl: job.remoteUrl,
          outputFile,
          logs: job.logs,
        });
        job.episodeOutputs.push({
          episode: i + 1,
          outputFile,
          outputRel: `out/${outputFile}`,
          downloadUrl: mp4DownloadUrl(outputFile, finishedAt),
          finishedAt,
        });
      }
      job.localCopyStatus = "done";
      const primary = job.episodeOutputs[0];
      job.outputFile = primary.outputFile;
      job.outputRel = primary.outputRel;
      job.outputPath = primary.outputPath;
      job.downloadUrl = primary.downloadUrl;
      job.outputFiles = files;
      if (job.dialogueId) {
        touchDialogueOutput(job.dialogueId, job.outputFile);
      }
    } catch (error) {
      job.localCopyStatus = "error";
      const message = error instanceof Error ? error.message : String(error);
      job.logs.push(`Не удалось скопировать: ${message}`);
      job.downloadUrl = `/api/jobs/${job.id}/download`;
      throw error;
    }
  })();

  return job.localCopyPromise;
};

/** @deprecated используйте ensureRemoteOutputsCopiedLocally */
const ensureRemoteMp4CopiedLocally = (job) => ensureRemoteOutputsCopiedLocally(job);

const processQueue = async () => {
  if (renderBusy || renderQueue.length === 0) {
    return;
  }

  renderBusy = true;
  const jobId = renderQueue.shift();
  const job = jobs.get(jobId);

  if (!job) {
    renderBusy = false;
    processQueue();
    return;
  }

  if (job.kind === "video-parallax-preview") {
    job.status = "running";
    jobPushLog(job, "Превью video-parallax…");
    try {
      const opts = job.previewOpts ?? {};
      await renderVideoParallaxPreview({
        ...opts,
        onStatus: (message) => {
          jobSetPhase(job, message);
          jobPushLog(job, message);
        },
      });
      job.status = "done";
      job.progress = 1;
      job.finishedAt = Date.now();
      job.downloadUrl = mp4DownloadUrl(job.outputFile, job.finishedAt);
      jobPushLog(job, `Готово: ${job.outputRel}`);
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : String(error);
      jobPushLog(job, job.error);
    } finally {
      job.previewOpts = null;
      pruneFinishedJobs();
      renderBusy = false;
      processQueue();
    }
    return;
  }

  job.status = "running";
  jobSetPhase(job, "Рендер…");
  jobPushLog(job, "Рендер запущен…");
  const episodes = job.episodeConversations?.length
    ? job.episodeConversations
    : [job.conversation];
  const messagesMs = estimateMessagesDurationMs(job.conversation);
  job.logs.push(
    `Тайминг переписки: scale ${TIMING_SCALE}, ~${(messagesMs / 1000).toFixed(1)} с на сообщения`,
  );
  if (episodes.length > 1) {
    job.logs.push(`Эпизодов: ${episodes.length}`);
  }

  const {cancelSignal, cancel} = makeCancelSignal();
  job.cancel = cancel;

  const renderOne = async (conversation, outputPath, label) => {
    if (label) {
      job.logs.push(label);
    }
    return renderChatVideo({
      conversation,
      outputPath,
      onBundleStatus: (message) => {
        jobPushLog(job, message);
      },
      onCompositionReady: (durationInFrames) => {
        job.totalFrames = durationInFrames;
        jobPushLog(job, `Композиция: ${durationInFrames} кадров`);
      },
      onProgress: ({progress, renderedFrames, encodedFrames, stitchStage}) => {
        const episodeScale = episodes.length > 1 ? 1 / episodes.length : 1;
        const episodeIndex = job.episodeIndex ?? 0;
        const baseProgress = episodes.length > 1 ? episodeIndex / episodes.length : 0;
        jobSetProgress(job, baseProgress + progress * episodeScale);
        job.renderedFrames = renderedFrames;
        job.encodedFrames = encodedFrames;
        if (renderedFrames >= job.totalFrames && job.totalFrames > 0) {
          const phase =
            stitchStage === "muxing" ? "Склейка видео и аудио…" : "Кодирование видео…";
          jobSetPhase(job, phase);
        } else if (renderedFrames > 0 && job.totalFrames > 0) {
          const frameBucket = Math.floor((renderedFrames / job.totalFrames) * 10);
          if (frameBucket !== job._workerFrameBucket) {
            job._workerFrameBucket = frameBucket;
            jobSetPhase(job, `Рендер кадров: ${renderedFrames}/${job.totalFrames}`);
          }
        }
      },
      cancelSignal,
    });
  };

  try {
    job.episodeOutputs = [];
    for (let i = 0; i < episodes.length; i += 1) {
      job.episodeIndex = i;
      const epNum = String(i + 1).padStart(2, "0");
      const outputFile =
        episodes.length > 1 ? `${job.fileName}-ep${epNum}.mp4` : job.outputFile;
      const outputRel = `out/${outputFile}`;
      const outputPath = path.join(ROOT, outputRel);
      if (episodes.length > 1) {
        jobSetPhase(job, `Рендер эпизода ${i + 1}/${episodes.length}…`);
        const inputRel = `json/${job.fileName}-ep${epNum}.json`;
        await writeFile(
          path.join(ROOT, inputRel),
          JSON.stringify(episodes[i], null, 2),
          "utf8",
        );
        job.logs.push(`JSON эпизода: ${inputRel}`);
      }
      const outputAbs = await renderOne(
        episodes[i],
        outputPath,
        episodes.length > 1 ? `Эпизод ${i + 1}/${episodes.length}: ${outputFile}` : null,
      );
      const finishedAt = Date.now();
      const downloadUrl = mp4DownloadUrl(outputFile, finishedAt);
      job.episodeOutputs.push({
        episode: i + 1,
        outputFile,
        outputRel,
        outputPath: outputAbs,
        downloadUrl,
        finishedAt,
      });
      job.logs.push(`Готово: ${outputAbs}`);
    }

    const primary = job.episodeOutputs[0];
    job.status = "done";
    job.progress = 1;
    job.finishedAt = primary.finishedAt;
    job.outputPath = primary.outputPath;
    job.outputRel = primary.outputRel;
    job.outputFile = primary.outputFile;
    job.outputFiles = job.episodeOutputs.map((item) => item.outputFile);
    job.downloadUrl = primary.downloadUrl;
    traceJobConsole(job, `Готово: out/${job.outputFile}`);
    if (job.dialogueId) {
      touchDialogueOutput(job.dialogueId, job.outputFile);
      job.logs.push(`Диалог сохранён в базе: ${job.dialogueId}`);
    }
  } catch (error) {
    if (isUserCancelledRender(error)) {
      job.status = "cancelled";
      job.error = "Отменено пользователем";
      job.logs.push(job.error);
    } else {
      job.status = "error";
      job.error =
        formatConversationValidationError(error) ??
        (error instanceof Error ? error.message : String(error));
      job.logs.push(job.error);
    }
  } finally {
    job.cancel = null;
    // conversation больше не нужен после рендера — освобождаем память
    job.conversation = null;
    pruneFinishedJobs();
    renderBusy = false;
    processQueue();
  }
};

const enqueueRender = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }
  job.status = "queued";
  jobSetPhase(job, "В очереди…");
  jobPushLog(job, "В очереди…");
  renderQueue.push(jobId);
  processQueue();
};

const app = express();

app.post(
  "/api/assets/upload-binary",
  express.raw({type: "application/octet-stream", limit: MAX_BINARY_UPLOAD_BYTES}),
  async (req, res) => {
    try {
      const targetRef = String(req.headers["x-asset-ref"] ?? "")
        .trim()
        .replace(/^\/+/, "");
      if (!targetRef || targetRef.includes("..")) {
        res.status(400).json({error: "Заголовок X-Asset-Ref обязателен"});
        return;
      }
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        res.status(400).json({error: "Пустое тело запроса"});
        return;
      }
      const maxBytes = resolveUploadMaxBytes(targetRef);
      if (buffer.length > maxBytes) {
        res.status(400).json({
          error: `Файл слишком большой (макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`,
        });
        return;
      }
      const publicPath = await saveImageBuffer(buffer, targetRef);
      res.json({ok: true, publicPath});
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

app.use(express.json({limit: uploadJsonBodyLimitBytes()}));

app.get("/api/audio", async (_req, res) => {
  try {
    const [tracks, license] = await Promise.all([listMusicTracks(), getMusicLicenseInfo()]);
    res.json({tracks, defaultId: DEFAULT_MUSIC_ID, license});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/prompts/image-style", async (_req, res) => {
  try {
    const content = await readStylePrompt();
    res.json({content});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put("/api/prompts/image-style", async (req, res) => {
  try {
    const {content} = req.body ?? {};
    if (typeof content !== "string") {
      res.status(400).json({error: "Поле content обязательно"});
      return;
    }
    const saved = await writeStylePrompt(content);
    res.json({content: saved});
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/prompts/story-image-style", async (_req, res) => {
  try {
    const content = await readStoryStylePrompt();
    res.json({content});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put("/api/prompts/story-image-style", async (req, res) => {
  try {
    const {content} = req.body ?? {};
    if (typeof content !== "string") {
      res.status(400).json({error: "Поле content обязательно"});
      return;
    }
    const saved = await writeStoryStylePrompt(content);
    res.json({content: saved});
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/shorts/styles", async (_req, res) => {
  try {
    res.json({styles: await readShortsStylesMeta()});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/conversation/timing-preview", (req, res) => {
  try {
    const {json: jsonText} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }

    const conversation = parseConversation(parsed);
    const timing = mergeConversationTiming(conversation);
    const timingSpeed = getTimingSpeed(conversation);
    const messages = conversation.messages.map((message, index) => {
      const autoMessage = {...message};
      delete autoMessage.pauseBeforeMs;
      delete autoMessage.typingMs;
      delete autoMessage.postRevealMs;
      const auto = resolveMessageTiming(autoMessage, timing, timingSpeed);
      const resolved = resolveMessageTiming(message, timing, timingSpeed);

      return {
        index,
        isFirst: index === 0,
        auto: {
          pauseBeforeMs: index === 0 ? 0 : auto.pauseBeforeMs,
          typingMs: index === 0 ? 0 : auto.typingMs,
          postRevealMs: auto.postRevealMs,
        },
        resolved: {
          pauseBeforeMs: index === 0 ? 0 : resolved.pauseBeforeMs,
          typingMs: index === 0 ? 0 : resolved.typingMs,
          postRevealMs: resolved.postRevealMs,
        },
        overrides: {
          pauseBeforeMs: message.pauseBeforeMs !== undefined,
          typingMs: message.typingMs !== undefined,
          postRevealMs: message.postRevealMs !== undefined,
        },
      };
    });

    res.json({
      timingScale: TIMING_SCALE,
      timingSpeed,
      totalMessagesMs: estimateMessagesDurationMs(conversation),
      totalVideoMs: estimateVideoDurationMs(conversation),
      messages,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/shorts/pre-render-check", (req, res) => {
  try {
    const {json: jsonText, displayTitle} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    const conversation = parseConversation(JSON.parse(jsonText));
    const result = runShortsPreRenderChecklist(conversation, {
      displayTitle: typeof displayTitle === "string" ? displayTitle : "",
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/images/openrouter", async (_req, res) => {
  await loadOpenRouterEnv();
  res.json({
    configured: isOpenRouterConfigured(),
    textModel: getOpenRouterTextModel(),
    imageModel: getOpenRouterImageModel(),
    storyImageModel: getOpenRouterStoryImageModel(),
    storyImageSize: getOpenRouterStoryImageSize(),
    imageGenerationAvailable: isOpenRouterConfigured(),
  });
});

app.get("/api/openrouter/dialogue-models", async (_req, res) => {
  try {
    await loadOpenRouterEnv();
    res.json(listDialogueModels());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/status", async (_req, res) => {
  await loadOpenRouterEnv();
  res.json({
    openrouter: {
      configured: isOpenRouterConfigured(),
      textModel: getOpenRouterTextModel(),
      imageModel: getOpenRouterImageModel(),
      storyImageModel: getOpenRouterStoryImageModel(),
      storyImageSize: getOpenRouterStoryImageSize(),
      ttsModel: getOpenRouterTtsModel(),
      imageGenerationAvailable: isOpenRouterConfigured(),
    },
    youtube: {
      configured: isYoutubeConfigured(),
    },
    voiceover: getOpenRouterVoiceoverStatus(),
    storyVideo: getOpenRouterStoryVideoStatus(),
  });
});

app.get("/api/youtube/status", async (_req, res) => {
  await loadOpenRouterEnv();
  res.json({configured: isYoutubeConfigured()});
});

app.post("/api/youtube/publish", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    if (!isYoutubeConfigured()) {
      res.status(400).json({
        error:
          "YouTube не настроен — задайте YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET и YOUTUBE_REFRESH_TOKEN в docs/.env",
      });
      return;
    }

    const {outputFile: rawOutputFile, dialogueId, title: rawTitle, privacyStatus: rawPrivacy, tags} =
      req.body ?? {};

    const outputFile = resolveOutputFile({
      outputFile: rawOutputFile,
      dialogueId: typeof dialogueId === "string" ? dialogueId : undefined,
      name: typeof rawTitle === "string" ? rawTitle : undefined,
    });

    if (!outputFile) {
      res.status(400).json({error: "Укажите outputFile или откройте диалог с готовым MP4"});
      return;
    }

    const filePath = path.join(OUT_DIR, outputFile);
    try {
      await access(filePath);
    } catch {
      res.status(404).json({error: `Файл не найден: out/${outputFile}. Сначала соберите видео.`});
      return;
    }

    const privacyStatus =
      rawPrivacy === "public" || rawPrivacy === "private" || rawPrivacy === "unlisted"
        ? rawPrivacy
        : "unlisted";

    const title = resolvePublishTitle({
      rawTitle,
      dialogueId: typeof dialogueId === "string" ? dialogueId : undefined,
      outputFile,
    });

    const result = await uploadVideoToYoutube({
      filePath,
      title,
      tags: Array.isArray(tags) ? tags : [],
      privacyStatus,
    });

    res.json({
      ok: true,
      ...result,
      outputFile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({error: message});
  }
});

app.post("/api/images/suggest-prompt", async (req, res) => {
  try {
    const {json: jsonText, messageIndex, stylePrompt, force} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }

    const conversation = JSON.parse(jsonText);
    const style =
      typeof stylePrompt === "string" && stylePrompt.trim()
        ? stylePrompt.trim()
        : await readStylePrompt();

    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const manual = String(messages[messageIndex]?.imagePrompt ?? "").trim();
    if (manual && !force) {
      res.json({
        imagePrompt: manual,
        promptSource: "manual",
        skippedLlm: true,
      });
      return;
    }

    const llm = await suggestImagePrompt({conversation, messageIndex, stylePrompt: style});
    res.json({
      ...llm,
      promptSource: "openrouter",
      charCount: llm.imagePrompt.length,
    });
  } catch (error) {
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/images/suggest-story-prompt", async (req, res) => {
  try {
    const {json: jsonText, messageIndex, stylePrompt, force, kind: rawKind} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }

    const conversation = JSON.parse(jsonText);
    const kind =
      rawKind === "opening" || rawKind === "message"
        ? rawKind
        : messageIndex == null
          ? "opening"
          : "message";

    if (kind === "message") {
      if (typeof messageIndex !== "number" || messageIndex < 0) {
        res.status(400).json({error: "Поле messageIndex обязательно для story-кадра сообщения"});
        return;
      }
    }

    const style =
      typeof stylePrompt === "string" && stylePrompt.trim()
        ? stylePrompt.trim()
        : await readStoryStylePrompt();

    const llm = await suggestStoryImagePrompt({
      conversation,
      messageIndex: kind === "opening" ? null : messageIndex,
      stylePrompt: style,
      kind,
      force: force === true,
    });

    res.json({
      ...llm,
      charCount: llm.imagePrompt?.length ?? 0,
    });
  } catch (error) {
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/images/preview-prompt", async (req, res) => {
  try {
    const {json: jsonText, messageIndex, stylePrompt} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    const conversation = JSON.parse(jsonText);
    const preview = await previewImagePrompt({
      conversation,
      messageIndex,
      stylePrompt: typeof stylePrompt === "string" ? stylePrompt : undefined,
    });
    res.json(preview);
  } catch (error) {
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/images/scan", async (req, res) => {
  try {
    const {json: jsonText, stylePrompt} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    const result = await scanImagesFromJson(jsonText);

    res.json({
      ...result,
      openrouterConfigured: isOpenRouterConfigured(),
      openrouterTextModel: getOpenRouterTextModel(),
      openrouterImageModel: getOpenRouterImageModel(),
      openrouterImageAvailable: isOpenRouterConfigured(),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/images/fetch", async (req, res) => {
  try {
    const {url, hint} = req.body ?? {};
    if (!url || typeof url !== "string") {
      res.status(400).json({error: "Поле url обязательно"});
      return;
    }
    const publicPath = await downloadImageToPublic(url, hint ?? "fetch");
    const previewUrl = await buildImagePreviewUrl(publicPath);
    res.json({
      publicPath,
      previewUrl,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/images/generate", async (req, res) => {
  try {
    const {prompt, json: jsonText, messageIndex, stylePrompt, targetRef, aspectRatio, imageKind} =
      req.body ?? {};

    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }

    let manualPrompt = typeof prompt === "string" ? prompt.trim() : "";
    let imagePromptSuggested = null;
    let promptSource = "manual";
    let style = "";
    let imageRefs = null;

    if (jsonText && typeof jsonText === "string") {
      const conversation = JSON.parse(jsonText);
      const isStoryKind = imageKind === "story" || imageKind === "story-opening";
      style =
        typeof stylePrompt === "string" && stylePrompt.trim()
          ? stylePrompt.trim()
          : isStoryKind
            ? await readStoryStylePrompt()
            : await readStylePrompt();

      if (imageKind === "story-opening") {
        if (!manualPrompt) {
          const resolved = await resolveStoryFramePrompts({
            conversation,
            stylePrompt: style,
            kind: "opening",
          });
          imagePromptSuggested = resolved.imagePrompt;
          promptSource = resolved.promptSource;
        } else {
          imagePromptSuggested = manualPrompt;
          promptSource = "manual";
        }
      } else if (imageKind === "story") {
        if (typeof messageIndex !== "number" || messageIndex < 0) {
          res.status(400).json({error: "Укажите messageIndex для story-кадра"});
          return;
        }
        if (!manualPrompt) {
          const resolved = await resolveStoryFramePrompts({
            conversation,
            messageIndex,
            stylePrompt: style,
            kind: "message",
          });
          imagePromptSuggested = resolved.imagePrompt;
          promptSource = resolved.promptSource;
        } else {
          imagePromptSuggested = manualPrompt;
          promptSource = "manual";
        }
      } else {
        if (typeof messageIndex !== "number" || messageIndex < 0) {
          res.status(400).json({
            error: "Укажите messageIndex и json для генерации по контексту переписки",
          });
          return;
        }

        if (!manualPrompt) {
          const resolved = await resolveFramePrompts({
            conversation,
            messageIndex,
            stylePrompt: style,
          });

          imagePromptSuggested = resolved.imagePrompt;
          promptSource = resolved.promptSource;
          imageRefs = resolved.imageReferences;
        } else {
          imageRefs = await resolveImageReferences(conversation.messages, messageIndex);
        }
      }
    }

    const isStoryKind = imageKind === "story" || imageKind === "story-opening";
    const finalPrompt = isStoryKind
      ? buildStoryImageGenerationPrompt({
          imagePrompt: imagePromptSuggested,
          stylePrompt: style || (await readStoryStylePrompt()),
        })
      : manualPrompt ||
        buildImageGenerationPrompt({
          imagePrompt: imagePromptSuggested,
          stylePrompt: style || (await readStylePrompt()),
        });

    if (!finalPrompt) {
      res.status(400).json({error: "Не удалось собрать промпт для генерации"});
      return;
    }

    const referenceDataUrl = imageRefs?.primaryReference?.dataUrl ?? null;
    const {buffer} = await generateImageBuffer({
      prompt: finalPrompt,
      referenceDataUrl,
      model: resolveOpenRouterImageModel(isStoryKind ? "story" : "chat"),
      aspectRatio:
        aspectRatio ?? (isStoryKind ? STORY_IMAGE_ASPECT_RATIO : CHAT_IMAGE_ASPECT_RATIO),
      imageSize: isStoryKind ? getOpenRouterStoryImageSize() : undefined,
      kind: isStoryKind ? "story" : "chat",
    });

    const refHint =
      targetRef && typeof targetRef === "string" && !targetRef.startsWith("http")
        ? targetRef
        : undefined;
    const publicPath = await saveImageBuffer(buffer, refHint);
    const previewUrl = await buildImagePreviewUrl(publicPath);

    res.json({
      publicPath,
      previewUrl,
      promptUsed: finalPrompt,
      imagePrompt: imagePromptSuggested,
      promptSource,
      provider: "openrouter",
      imageModel: resolveOpenRouterImageModel(isStoryKind ? "story" : "chat"),
      usedImageReference: Boolean(referenceDataUrl),
      referenceMessageIndex: imageRefs?.primaryReference?.messageIndex ?? null,
    });
  } catch (error) {
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/images/correct", async (req, res) => {
  try {
    const {json: jsonText, messageIndex, imageEditPrompt, stylePrompt, aspectRatio} =
      req.body ?? {};

    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    const editText =
      typeof imageEditPrompt === "string" ? imageEditPrompt.trim() : "";
    if (!editText) {
      res.status(400).json({error: "Укажите imageEditPrompt — что исправить на кадре"});
      return;
    }

    const conversation = JSON.parse(jsonText);
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const style =
      typeof stylePrompt === "string" && stylePrompt.trim()
        ? stylePrompt.trim()
        : await readStylePrompt();

    const result = await correctFrameImage({
      messages,
      messageIndex,
      imageEditPrompt: editText,
      stylePrompt: style,
      aspectRatio: aspectRatio ?? CHAT_IMAGE_ASPECT_RATIO,
    });

    const publicPath = await saveImageBuffer(result.buffer, result.ref);
    const previewUrl = await buildImagePreviewUrl(publicPath);

    res.json({
      publicPath,
      previewUrl,
      promptUsed: result.promptUsed,
      provider: result.provider,
      mode: "correct",
      imageModel: getOpenRouterImageModel(),
    });
  } catch (error) {
    if (error instanceof ImageCorrectionUnchangedError) {
      res.status(400).json({error: error.message});
      return;
    }
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/preview-cover", async (req, res) => {
  try {
    const {json: jsonText, title, targetRef, stylePrompt, prompt} = req.body ?? {};

    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }

    const conversation = JSON.parse(jsonText);
    const coverTitle = typeof title === "string" ? title.trim() : "";

    const manualPrompt = typeof prompt === "string" ? prompt.trim() : "";
    const style =
      typeof stylePrompt === "string" && stylePrompt.trim()
        ? stylePrompt.trim()
        : await readStoryStylePrompt();

    const finalPrompt =
      manualPrompt ||
      buildPreviewCoverPrompt({
        title: coverTitle,
        sceneHint: resolvePreviewCoverSceneHint(conversation),
        stylePrompt: style,
      });

    const referenceDataUrl = await loadPreviewCoverReferenceDataUrl(conversation);

    const {buffer} = await generateImageBuffer({
      prompt: finalPrompt,
      referenceDataUrl,
      aspectRatio: "9:16",
      model: getOpenRouterStoryImageModel(),
      imageSize: getOpenRouterStoryImageSize(),
      kind: "story",
    });

    const finalRef =
      targetRef && typeof targetRef === "string" && !targetRef.startsWith("http")
        ? targetRef.replace(/^\/+/, "")
        : `images/preview-covers/preview-cover-${Date.now().toString(36)}.png`;
    // Фон сохраняем во временный файл, затем запекаем поверх название ролика
    const backgroundRef = finalRef.replace(/\.png$/i, "").concat(".src.png");
    await saveImageBuffer(buffer, backgroundRef);

    const finalAbs = path.join(PUBLIC_DIR, finalRef);
    await renderPreviewCover({image: backgroundRef, title: coverTitle, outputPath: finalAbs});

    const previewUrl = await buildImagePreviewUrl(finalRef);

    res.json({
      publicPath: finalRef,
      previewUrl,
      promptUsed: finalPrompt,
      title: coverTitle,
      provider: "openrouter",
      imageModel: getOpenRouterStoryImageModel(),
      usedImageReference: Boolean(referenceDataUrl),
    });
  } catch (error) {
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/images/delete", async (req, res) => {
  try {
    const {targetRef, cascadeStoryAssets} = req.body ?? {};
    if (!targetRef || typeof targetRef !== "string") {
      res.status(400).json({error: "Поле targetRef обязательно"});
      return;
    }
    const result =
      cascadeStoryAssets === true
        ? await deleteStoryImageAssets(targetRef)
        : await deletePublicImage(targetRef);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/images/upload", async (req, res) => {
  try {
    const {targetRef, fileName, contentBase64} = req.body ?? {};
    if (!contentBase64 || typeof contentBase64 !== "string") {
      res.status(400).json({error: "Поле contentBase64 обязательно"});
      return;
    }

    const match = contentBase64.match(/^data:([^;]+);base64,(.+)$/);
    const base64 = match ? match[2] : contentBase64;
    const buffer = Buffer.from(base64, "base64");
    const maxBytes = resolveUploadMaxBytes(targetRef, fileName);
    if (buffer.length > maxBytes) {
      res.status(400).json({error: `Файл слишком большой (макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`});
      return;
    }

    const refHint = targetRef || (fileName ? `images/${fileName}` : undefined);
    const publicPath = await saveImageBuffer(buffer, refHint);
    const previewUrl = await buildImagePreviewUrl(publicPath);
    res.json({
      publicPath,
      previewUrl,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/dialogues", (req, res) => {
  try {
    const kind = req.query.kind;
    res.json({
      dialogues: listDialogues({
        kind: kind === "series" || kind === "shorts" || kind === "video" ? kind : undefined,
      }),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/dialogues/series/:seriesId/context", (req, res) => {
  try {
    const seriesId = String(req.params.seriesId ?? "").trim();
    if (!seriesId) {
      res.status(400).json({error: "seriesId обязателен"});
      return;
    }
    const beforePart = Number(req.query.beforePart);
    const messages = getSeriesContextMessages(
      seriesId,
      Number.isFinite(beforePart) && beforePart > 0 ? beforePart : null,
    );
    res.json({seriesId, messages, messageCount: messages.length});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/dialogues/:id", (req, res) => {
  try {
    const dialogue = getDialogue(req.params.id);
    if (!dialogue) {
      res.status(404).json({error: "Диалог не найден"});
      return;
    }
    res.json(dialogue);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/images/generate-missing", async (req, res) => {
  try {
    const {json: jsonText, stylePrompt, storyStylePrompt, imageNamespace} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в .env)"});
      return;
    }

    const conversation = parseConversation(JSON.parse(jsonText));
    const style =
      typeof stylePrompt === "string" && stylePrompt.trim()
        ? stylePrompt.trim()
        : await readStylePrompt();
    const storyStyle =
      typeof storyStylePrompt === "string" && storyStylePrompt.trim()
        ? storyStylePrompt.trim()
        : await readStoryStylePrompt();
    const logs = await generateMissingConversationImages(conversation, {
      stylePrompt: style,
      storyStylePrompt: storyStyle,
      imageNamespace,
    });

    res.json({conversation, logs, provider: "openrouter"});
  } catch (error) {
    const message = formatOpenRouterError(error);
    res.status(400).json({error: message});
  }
});

app.get("/api/voiceover/status", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const status = getOpenRouterVoiceoverStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/voiceover/generate-missing", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {json: jsonText, audioNamespace} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }

    const conversation = parseConversation(JSON.parse(jsonText));
    let logs = [];
    try {
      logs = await generateMissingVoiceover(conversation, {audioNamespace});
    } catch (error) {
      const pending = countPendingVoiceover(conversation);
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
        conversation,
        logs,
        pending,
      });
      return;
    }
    const pending = countPendingVoiceover(conversation);

    res.json({conversation, logs, pending});
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/voiceover/preview", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const voice = String(req.body?.voice ?? "").trim();
    if (!voice) {
      res.status(400).json({error: "Поле voice обязательно"});
      return;
    }
    const result = await ensureVoicePreview(voice);
    res.json({
      voice,
      previewUrl: result.previewUrl,
      sampleText: VOICE_PREVIEW_SAMPLE_TEXT,
      cached: result.cached,
    });
  } catch (error) {
    res.status(400).json({
      error: formatOpenRouterError(error),
    });
  }
});

app.post("/api/voiceover/upload", async (req, res) => {
  try {
    const {path: relativePath, dataBase64, contentBase64} = req.body ?? {};
    const payload = dataBase64 ?? contentBase64;
    if (!relativePath || typeof relativePath !== "string" || !payload) {
      res.status(400).json({error: "path и dataBase64/contentBase64 обязательны"});
      return;
    }
    const normalized = relativePath.replace(/^\/+/, "");
    if (normalized.includes("..") || !normalized.startsWith("audio/")) {
      res.status(400).json({error: "Недопустимый путь (ожидается audio/…)"});
      return;
    }
    const abs = path.join(PUBLIC_DIR, normalized);
    if (!abs.startsWith(PUBLIC_DIR)) {
      res.status(400).json({error: "Недопустимый путь"});
      return;
    }
    const match = String(payload).match(/^data:([^;]+);base64,(.+)$/);
    const base64 = match ? match[2] : String(payload);
    const buffer = Buffer.from(base64, "base64");
    const maxBytes = resolveUploadMaxBytes(relativePath);
    if (buffer.length > maxBytes) {
      res.status(400).json({error: `Файл слишком большой (макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`});
      return;
    }
    await mkdir(path.dirname(abs), {recursive: true});
    await writeFile(abs, buffer);
    res.json({ok: true, path: normalized, bytes: buffer.length});
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/dialogues/generate", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {
      prompt,
      dialogueStyle,
      videoLayout,
      previousMessages,
      includeImages,
      imageCount,
      messageCount,
      language,
      mode: modeRaw,
      seriesId,
      partNumber,
      useSeriesContext,
      model,
      textMode,
    } = req.body ?? {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({error: "Поле prompt обязательно"});
      return;
    }
    if (!isDialogueLlmConfigured()) {
      res.status(400).json({
        error: "OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env (диалоги через ChatGPT)",
      });
      return;
    }

    const mode =
      modeRaw === "series" ? "series" : modeRaw === "video" ? "video" : "shorts";
    let contextMessages;

    if (mode === "series" && useSeriesContext !== false) {
      const normalizedSeriesId = typeof seriesId === "string" ? seriesId.trim() : "";
      const part = Number(partNumber);
      if (normalizedSeriesId) {
        contextMessages = getSeriesContextMessages(
          normalizedSeriesId,
          Number.isFinite(part) && part > 0 ? part : null,
        );
      }
      if (!contextMessages?.length && Array.isArray(previousMessages)) {
        contextMessages = previousMessages;
      }
    }

    const normalizedSeriesId =
      mode === "series" && typeof seriesId === "string" ? seriesId.trim() : "";
    const result = await generateDialogue({
      prompt,
      videoLayout: resolveRequestVideoLayout({videoLayout, dialogueStyle, mode}),
      textMode: textMode === "chat" ? "chat" : textMode === "narration" ? "narration" : undefined,
      previousMessages: mode === "series" ? contextMessages : undefined,
      includeImages,
      imageCount,
      messageCount,
      language,
      mode,
      seriesId: normalizedSeriesId || "usssr",
      model: typeof model === "string" ? resolveDialogueModel(model) : undefined,
    });

    res.json({
      conversation: result.conversation,
      displayTitle: result.displayTitle ?? "",
      model: result.model,
      attempts: result.attempts,
      mode: result.mode,
      provider: result.provider ?? "openrouter",
      expandedFrom: result.expandedFrom ?? null,
      messageCount: result.conversation?.messages?.length ?? 0,
      contextMessageCount: Array.isArray(contextMessages) ? contextMessages.length : 0,
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues/enrich-story-scenes", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {json: jsonText, stylePrompt, force} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env)"});
      return;
    }

    const conversation = JSON.parse(jsonText);
    const result = await enrichStoryVisualDialogue(conversation, {
      stylePrompt: typeof stylePrompt === "string" ? stylePrompt : undefined,
      forcePrompts: force !== false,
    });

    res.json({
      conversation: result.conversation,
      enriched: result.enriched,
      sceneCount: result.sceneCount ?? 0,
      frameCount: result.frameCount ?? result.sceneCount ?? 0,
      plannedMessageIndices: result.plannedMessageIndices ?? [],
      includeOpening: result.includeOpening ?? true,
      planRationale: result.planRationale ?? "",
      characterCount: result.characterCount ?? 0,
      skippedReason: result.skippedReason ?? null,
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues/regenerate-message", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {json: jsonText, messageIndex, instruction, mode: modeRaw, seriesId, model} = req.body ?? {};

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    if (!isDialogueLlmConfigured()) {
      res.status(400).json({
        error: "OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env (диалоги через ChatGPT)",
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }

    const conversation = parseConversation(parsed);
    const mode =
      modeRaw === "series" ? "series" : modeRaw === "video" ? "video" : "shorts";
    const normalizedSeriesId =
      mode === "series" && typeof seriesId === "string" ? seriesId.trim() : "";

    const result = await regenerateMessage({
      conversation,
      messageIndex,
      instruction: typeof instruction === "string" ? instruction : undefined,
      mode,
      seriesId: normalizedSeriesId || "usssr",
      model: typeof model === "string" ? resolveDialogueModel(model) : undefined,
    });

    res.json({
      conversation: result.conversation,
      message: result.message,
      messageIndex: result.messageIndex,
      model: result.model,
      attempts: result.attempts,
      mode: result.mode,
      provider: result.provider ?? "openrouter",
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues/refine", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {refinePrompt, json: jsonText, includeImages, imageCount, messageCount, language, mode: modeRaw, seriesId, dialogueStyle, videoLayout, model} =
      req.body ?? {};
    if (!refinePrompt || typeof refinePrompt !== "string" || !refinePrompt.trim()) {
      res.status(400).json({error: "Поле refinePrompt обязательно"});
      return;
    }
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isDialogueLlmConfigured()) {
      res.status(400).json({
        error: "OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env (диалоги через ChatGPT)",
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }

    const conversation = parseConversation(parsed);
    const mode =
      modeRaw === "series" ? "series" : modeRaw === "video" ? "video" : "shorts";

    const normalizedSeriesId =
      mode === "series" && typeof seriesId === "string" ? seriesId.trim() : "";
    const result = await refineDialogue({
      conversation,
      refinePrompt,
      includeImages,
      imageCount,
      messageCount,
      language,
      mode,
      seriesId: normalizedSeriesId || "usssr",
      videoLayout: resolveRequestVideoLayout({videoLayout, dialogueStyle, conversation, mode}),
      model: typeof model === "string" ? resolveDialogueModel(model) : undefined,
    });

    res.json({
      conversation: result.conversation,
      displayTitle: result.displayTitle ?? "",
      model: result.model,
      attempts: result.attempts,
      mode: result.mode,
      provider: result.provider ?? "openrouter",
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues/logic", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {
      prompt,
      json: jsonText,
      includeImages,
      imageCount,
      messageCount,
      language,
      mode: modeRaw,
      seriesId,
      model,
    } = req.body ?? {};

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isDialogueLlmConfigured()) {
      res.status(400).json({
        error: "OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env (диалоги через ChatGPT)",
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }

    const conversation = parseConversation(parsed);
    const mode =
      modeRaw === "series" ? "series" : modeRaw === "video" ? "video" : "shorts";
    const normalizedSeriesId =
      mode === "series" && typeof seriesId === "string" ? seriesId.trim() : "";
    const displayTitle =
      typeof parsed.displayTitle === "string" ? parsed.displayTitle.trim() : "";

    const result = await checkDialogueLogic({
      prompt: typeof prompt === "string" ? prompt : "",
      conversation,
      displayTitle,
      includeImages,
      imageCount,
      messageCount,
      language,
      mode,
      seriesId: normalizedSeriesId || "usssr",
      model: typeof model === "string" ? resolveDialogueModel(model) : undefined,
    });

    res.json({
      conversation: result.conversation,
      displayTitle: result.displayTitle ?? displayTitle,
      model: result.model,
      attempts: result.attempts,
      mode: result.mode,
      provider: result.provider ?? "openrouter",
      logicRevised: result.logicRevised ?? false,
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues/regenerate-ending", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {
      json: jsonText,
      displayTitle,
      tailCount,
      includeImages,
      imageCount,
      messageCount,
      language,
      dialogueStyle,
      videoLayout,
      mode: modeRaw,
      model,
    } = req.body ?? {};

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isDialogueLlmConfigured()) {
      res.status(400).json({
        error: "OpenRouter не настроен — задайте OPENROUTER_API_KEY в docs/.env",
      });
      return;
    }

    const conversation = parseConversation(JSON.parse(jsonText));
    const mode =
      modeRaw === "series" ? "series" : modeRaw === "video" ? "video" : "shorts";
    const result = await regenerateEnding({
      conversation,
      displayTitle: typeof displayTitle === "string" ? displayTitle : "",
      tailCount: Number(tailCount) || 3,
      includeImages,
      imageCount,
      messageCount,
      language,
      videoLayout: resolveRequestVideoLayout({videoLayout, dialogueStyle, conversation, mode}),
      mode,
      model: typeof model === "string" ? resolveDialogueModel(model) : undefined,
    });

    res.json({
      conversation: result.conversation,
      displayTitle: result.displayTitle ?? "",
      model: result.model,
      attempts: result.attempts,
      mode: result.mode,
      provider: result.provider ?? "openrouter",
      regeneratedFrom: result.regeneratedFrom,
    });
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/youtube/metadata", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {json: jsonText, displayTitle, language} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (!isOpenRouterConfigured()) {
      res.status(400).json({error: "OpenRouter не настроен"});
      return;
    }
    const conversation = parseConversation(JSON.parse(jsonText));
    const metadata = await generateYoutubeMetadata({
      conversation,
      displayTitle: typeof displayTitle === "string" ? displayTitle : "",
      language: language === "en" ? "en" : "ru",
    });
    res.json(metadata);
  } catch (error) {
    res.status(400).json({error: formatDialogueApiError(error)});
  }
});

app.post("/api/dialogues", async (req, res) => {
  try {
    const {
      title,
      titleDisplay,
      json: jsonText,
      wallpaper,
      music,
      dialoguePrompt,
      kind,
      seriesId,
      partNumber,
    } = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }
    const conversation = parseConversation(parsed);
    const dialogue = createDialogue({
      title: typeof title === "string" ? title : undefined,
      titleDisplay: typeof titleDisplay === "string" ? titleDisplay : "",
      conversation,
      wallpaper: wallpaper === "dark" ? "dark" : "default",
      music: typeof music === "string" ? music : "",
      dialoguePrompt: typeof dialoguePrompt === "string" ? dialoguePrompt : "",
      kind: kind === "series" ? "series" : kind === "video" ? "video" : "shorts",
      seriesId: typeof seriesId === "string" ? seriesId : "",
      partNumber,
    });

    res.status(201).json(dialogue);
  } catch (error) {
    const message =
      formatConversationValidationError(error) ??
      (error instanceof Error ? error.message : String(error));
    res.status(400).json({error: message});
  }
});

app.put("/api/dialogues/:id", async (req, res) => {
  try {
    const {title, titleDisplay, json: jsonText, wallpaper, music, dialoguePrompt, kind, seriesId, partNumber} =
      req.body ?? {};
    let conversation;
    if (jsonText !== undefined) {
      if (typeof jsonText !== "string") {
        res.status(400).json({error: "Поле json должно быть строкой"});
        return;
      }
      try {
        conversation = parseConversation(JSON.parse(jsonText));
      } catch (error) {
        const message =
          formatConversationValidationError(error) ??
          (error instanceof SyntaxError
            ? "Некорректный JSON"
            : error instanceof Error
              ? error.message
              : String(error));
        res.status(400).json({error: message});
        return;
      }
    }

    const dialogue = updateDialogue(req.params.id, {
      title: typeof title === "string" ? title : undefined,
      titleDisplay: typeof titleDisplay === "string" ? titleDisplay : undefined,
      conversation,
      wallpaper: wallpaper === "dark" ? "dark" : wallpaper === "default" ? "default" : undefined,
      music: typeof music === "string" ? music : undefined,
      dialoguePrompt: typeof dialoguePrompt === "string" ? dialoguePrompt : undefined,
      kind:
        kind === "series" ? "series" : kind === "video" ? "video" : kind === "shorts" ? "shorts" : undefined,
      seriesId: typeof seriesId === "string" ? seriesId : undefined,
      partNumber: partNumber !== undefined ? partNumber : undefined,
    });

    if (!dialogue) {
      res.status(404).json({error: "Диалог не найден"});
      return;
    }

    res.json(dialogue);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.delete("/api/dialogues/:id", (req, res) => {
  try {
    const ok = deleteDialogue(req.params.id);
    if (!ok) {
      res.status(404).json({error: "Диалог не найден"});
      return;
    }
    res.json({ok: true});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/example", async (_req, res) => {
  try {
    const examplePath = path.join(ROOT, "public", "conversation.json");
    const raw = await readFile(examplePath, "utf8");
    res.type("application/json").send(raw);
  } catch (error) {
    res.status(500).json({error: "Не удалось загрузить пример"});
  }
});

app.get("/api/render-targets", (_req, res) => {
  res.json({targets: getRenderTargets(), defaultTarget: getDefaultRenderTarget()});
});

/** Залить локальные ассеты переписки на воркер (картинки, story-видео, обложки) */
const syncImagesToRemote = async (
  conversation,
  remoteUrl,
  logs,
  {fileName, episodeConversations} = {},
) => {
  const refs = new Set(collectConversationImageRefs(conversation));
  for (const ref of collectPreviewCoverSyncRefs(conversation, {imageNamespace: fileName, episodeConversations})) {
    refs.add(ref);
  }

  for (const ref of refs) {
    if (isHoldParallaxBakeAsset(ref)) {
      logs.push(`Hold-parallax не отправляется (запечётся на воркере): ${ref}`);
      continue;
    }
    const abs = path.join(PUBLIC_DIR, ref);
    let buffer;
    try {
      buffer = await readFile(abs);
    } catch {
      logs.push(`Файл не найден локально, пропущен: ${ref}`);
      continue;
    }
    await uploadAssetToRemote(remoteUrl, ref, buffer);
    logs.push(`Картинка отправлена на воркер: ${ref}`);
  }
};

const createRenderJobShell = ({
  fileName,
  inputPath,
  inputRel,
  outputPath,
  outputRel,
  outputFile,
  dialogueId,
  target,
  displayTitle,
}) => {
  const jobId = String(++jobCounter);
  const nativeProjectRoot = process.env.NATIVE_PROJECT_ROOT?.trim() || ROOT;
  const renderCommand = buildNativeRenderCommand({
    projectRoot: nativeProjectRoot,
    inputRel,
    outputRel,
  });

  const job = {
    id: jobId,
    status: "preparing",
    target,
    fileName,
    inputPath,
    inputRel,
    outputPath,
    outputRel,
    outputFile,
    dialogueId: typeof dialogueId === "string" ? dialogueId : null,
    conversation: null,
    downloadUrl: null,
    error: null,
    logs: [],
    progress: 0.01,
    renderedFrames: 0,
    encodedFrames: 0,
    totalFrames: 0,
    phase: "Подготовка…",
    cancel: null,
    prepCancelled: false,
    renderCommand,
    displayTitle: typeof displayTitle === "string" ? displayTitle.trim() : "",
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);
  pruneFinishedJobs();
  void jobLogHeader(job);
  traceJobConsole(job, `Новая задача → out/${outputFile}`);
  if (job.phase) {
    traceJobConsole(job, job.phase);
  }
  return job;
};

const runRenderPreparation = async (
  job,
  {
    conversation,
    autoGenerateImages,
    shouldGenerateVoice,
    isStoryVisual,
    pendingStoryVideos,
    voiceoverEnabled,
    publicBaseUrl,
    rawWallpaper,
    rawMusic,
    dialogueId,
    target,
  },
) => {
  const fail = (message, logs = []) => {
    job.status = "error";
    job.error = message;
    jobPushLogs(job, logs);
    jobPushLog(job, message);
    job.phase = null;
    traceJobConsole(job, `Ошибка: ${message}`);
    void sessionLog(`[job ${job.id} ERROR] ${message}`);
  };

  try {
    if (job.prepCancelled) {
      throw new Error("Отменено пользователем");
    }

    await loadOpenRouterEnv();

    if (autoGenerateImages) {
      jobSetPhase(job, "Генерация изображений…");
      jobSetProgress(job, 0.05);
      const imageGenLogs = await generateMissingConversationImages(conversation, {
        provider: "openrouter",
        imageNamespace: job.fileName,
      });
      jobPushLogs(job, imageGenLogs);
    }

    if (shouldGenerateVoice) {
      jobSetPhase(job, "Озвучка (OpenRouter)…");
      jobSetProgress(job, 0.1);
      const voiceGenLogs = await generateMissingVoiceover(conversation, {
        audioNamespace: job.fileName,
      });
      jobPushLogs(job, voiceGenLogs);
    }

    let skippedStoryVideoGeneration = false;

    if (isStoryVisual) {
      const pendingStoryVideosNow = countPendingStoryVideos(conversation);

      if (pendingStoryVideosNow > 0) {
        if (!isOpenRouterConfigured()) {
          skippedStoryVideoGeneration = true;
          jobPushLog(
            job,
            "Story-видео: OpenRouter недоступен на этой машине — анимация пропущена, в ролике будут статичные story-кадры (PNG). Для Veo задайте OPENROUTER_API_KEY в docs/.env и пересоберите.",
          );
        } else {
          const total = pendingStoryVideosNow;
          jobSetPhase(job, `Анимация story-кадров (0/${total})…`);
          jobSetProgress(job, 0.11);

          const storyVideoLogs = await generateMissingStoryVideos(conversation, {
            publicBaseUrl,
            skipHoldParallaxBake: target === "remote",
            isCancelled: () => job.prepCancelled,
            onProgress: ({done, total: clipTotal, label, stage, attempt, maxAttempts, status}) => {
              const safeTotal = Math.max(clipTotal, 1);
              if (stage === "polling") {
                jobSetPhase(
                  job,
                  `Анимация: ${label} · OpenRouter ${status ?? "…"} (${attempt ?? 1}/${maxAttempts ?? "?"})`,
                );
                jobSetProgress(job, 0.11 + (done / safeTotal) * 0.39);
                return;
              }
              if (stage === "generating") {
                jobSetPhase(job, `Анимация story-кадров (${done}/${safeTotal}): ${label}…`);
                jobSetProgress(job, 0.11 + (done / safeTotal) * 0.39);
                return;
              }
              jobSetPhase(job, `Анимация story-кадров (${done}/${safeTotal})…`);
              jobSetProgress(job, 0.11 + (done / safeTotal) * 0.39);
            },
          });
          jobPushLogs(job, storyVideoLogs);
        }
      }

      const linkedStoryVideoLogs = await resolveStoryVideos(conversation, {
        failOnMissingVideos: false,
        skipHoldParallaxBake: target === "remote",
      });
      if (linkedStoryVideoLogs.length > 0) {
        jobPushLogs(job, linkedStoryVideoLogs);
      }

      if (target !== "remote" && needsStoryDepthLayers(conversation)) {
        jobSetPhase(job, "Depth-слои для parallax…");
        jobSetProgress(job, 0.5);
        const depthLogs = await ensureStoryDepthForConversation(conversation);
        if (depthLogs.length > 0) {
          jobPushLogs(job, depthLogs);
        }
      }

      if (
        target !== "remote" &&
        mergeStoryConfig(conversation).opening.animation === "video-parallax"
      ) {
        jobSetPhase(job, "Hold-parallax после Veo…");
        const holdLogs = await ensureVideoParallaxHoldsForConversation(conversation);
        if (holdLogs.length > 0) {
          jobPushLogs(job, holdLogs);
        }
      } else if (
        target === "remote" &&
        mergeStoryConfig(conversation).opening.animation === "video-parallax"
      ) {
        jobPushLog(job, "Hold-parallax: запекётся на воркере (как test:video-parallax)");
      }
    }

    if (isStoryVisual) {
      stripStorySfxFromConversation(conversation);
      normalizeStoryVideoLoopFlags(conversation);
    }

    const musicLogs = [];
    if (rawMusic === "none") {
      await applyConversationMusicSelection(conversation, "none", {logs: musicLogs});
    } else if (rawMusic && rawMusic !== "auto") {
      await applyConversationMusicSelection(conversation, rawMusic, {logs: musicLogs});
    } else if (isStoryVisual) {
      musicLogs.push(
        ...(await assignStoryMusicIfNeeded(conversation, {
          musicId: rawMusic,
          logs: [],
        })),
      );
    } else if (conversation.music?.src) {
      conversation.music = {
        ...conversation.music,
        enabled: conversation.music.enabled !== false,
      };
      musicLogs.push(`Музыка: из JSON → ${conversation.music.src}`);
    }
    if (musicLogs.length > 0) {
      jobPushLogs(job, musicLogs);
    }

    jobSetPhase(job, "Обложка превью…");
    jobSetProgress(job, 0.48);
    if (conversation.previewCover?.enabled === false) {
      jobPushLog(job, "Обложка превью: выключена");
    } else {
      const coverResult = await ensureConversationPreviewCovers(conversation, {
        displayTitle: job.displayTitle,
        imageNamespace: job.fileName,
        onLog: (message) => jobPushLog(job, message),
      });
      Object.assign(conversation, coverResult.conversation);
      job.episodeConversations = coverResult.episodeConversations;
      if (coverResult.episodeConversations.length > 1) {
        jobPushLog(job, `Обложки для ${coverResult.episodeConversations.length} эпизодов готовы`);
      }
    }

    jobSetPhase(job, "Проверка ассетов…");
    jobSetProgress(job, 0.52);

    const imageLogs = await resolveConversationImages(conversation, {
      failOnMissingImages: !autoGenerateImages,
    });
    const voiceLogs = await resolveConversationVoiceover(conversation, {
      failOnMissingVoice: voiceoverEnabled,
    });
    const storyVideoResolveLogs = isStoryVisual
      ? await resolveStoryVideos(conversation, {
          failOnMissingVideos: !skippedStoryVideoGeneration,
          skipHoldParallaxBake: target === "remote",
        })
      : [];

    jobPushLogs(job, [...imageLogs, ...storyVideoResolveLogs, ...voiceLogs]);

    if (conversation.layout === "storyOverlay") {
      delete conversation.wallpaper;
    } else if (rawWallpaper === "default" || rawWallpaper === "dark") {
      conversation.wallpaper = rawWallpaper;
    }

    await mkdir(JSON_DIR, {recursive: true});
    await mkdir(OUT_DIR, {recursive: true});
    await writeFile(job.inputPath, JSON.stringify(conversation, null, 2), "utf8");
    jobPushLog(job, `JSON сохранён: ${job.inputRel}`);

    if (dialogueId && typeof dialogueId === "string") {
      updateDialogue(dialogueId, {
        conversation,
        wallpaper: conversation.wallpaper,
        music: rawMusic ?? "",
        outputFile: job.outputFile,
      });
    }

    if (job.prepCancelled) {
      throw new Error("Отменено пользователем");
    }

    if (target === "remote") {
      jobSetPhase(job, "Отправка ассетов на воркер…");
      jobSetProgress(job, 0.58);
      jobPushLog(job, `Цель рендера: мощная машина (${REMOTE_RENDER_URL})`);
      jobPushLog(
        job,
        "На воркере нужен git pull и перезапуск ./run.sh worker (src/ монтируется с той машины)",
      );
      const episodeConversations =
        job.episodeConversations?.length > 0
          ? job.episodeConversations
          : buildEpisodeConversations(conversation);
      job.outputFiles = episodeOutputFiles(job.fileName, episodeConversations.length);
      if (episodeConversations.length > 1) {
        jobPushLog(job, `Эпизодов на воркере: ${episodeConversations.length}`);
      }
      await syncImagesToRemote(conversation, REMOTE_RENDER_URL, job.logs, {
        fileName: job.fileName,
        episodeConversations,
      });
      if (conversation.voiceover?.enabled) {
        jobPushLog(job, "Озвучка: WAV с Mac отправляются на воркер");
        await syncVoiceToRemote(conversation, REMOTE_RENDER_URL, job.logs);
      }

      jobSetPhase(job, "Запуск рендера на воркере…");
      jobSetProgress(job, 0.62);
      const forwardResp = await fetchWithRetry(
        `${REMOTE_RENDER_URL}/api/render`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            json: JSON.stringify(conversation),
            name: job.fileName,
            displayTitle: job.displayTitle || job.fileName,
            music: rawMusic ?? "auto",
            target: "local",
            autoGenerateVoiceover: false,
          }),
        },
        {timeoutMs: 120_000, retries: 3},
      );
      const forwardData = await forwardResp.json().catch(() => ({}));
      if (!forwardResp.ok) {
        throw new Error(forwardData.error ?? `Воркер вернул ошибку (${forwardResp.status})`);
      }

      job.remote = true;
      job.remoteUrl = REMOTE_RENDER_URL;
      job.remoteJobId = forwardData.jobId;
      job.outputRel = forwardData.outputPath ?? job.outputRel;
      job.outputFile = forwardData.outputFile ?? job.outputFile;
      if (forwardData.outputFiles?.length) {
        job.outputFiles = forwardData.outputFiles;
      }
      job.status = forwardData.status ?? "queued";
      job.phase = null;
      jobSetProgress(job, forwardData.progress ?? 0.65);
      traceJobConsole(job, `Передано на воркер: job ${forwardData.jobId}`);
      return;
    }

    job.conversation = conversation;
    if (!job.episodeConversations?.length) {
      job.episodeConversations = buildEpisodeConversations(conversation);
    }
    if (job.episodeConversations.length > 1) {
      jobPushLog(job, `Будет собрано эпизодов: ${job.episodeConversations.length}`);
    }
    jobSetProgress(job, 0.55);
    job.phase = null;
    traceJobConsole(job, "Подготовка завершена, постановка в очередь рендера");
    enqueueRender(job.id);
  } catch (error) {
    if (job.prepCancelled) {
      job.status = "cancelled";
      job.error = "Отменено пользователем";
      job.logs.push(job.error);
      job.phase = null;
      return;
    }
    fail(error instanceof Error ? error.message : String(error));
  }
};

app.post("/api/render/video-parallax-preview", async (req, res) => {
  try {
    const {
      image,
      videoDurationMs,
      durationFrames,
      skipDepth,
      forceDepth,
      name: rawName,
    } = req.body ?? {};

    const imageRel = String(image ?? "")
      .trim()
      .replace(/^\/+/, "");
    if (!imageRel || imageRel.includes("..")) {
      res.status(400).json({
        error:
          "Поле image обязательно (путь под public/, напр. images/…/story-msg-6.png)",
      });
      return;
    }

    const videoMs =
      typeof videoDurationMs === "number" && videoDurationMs > 0 ? videoDurationMs : 4000;
    const frames =
      typeof durationFrames === "number" && durationFrames > 0
        ? durationFrames
        : hybridDurationFrames(videoMs);

    const outputStem = slugifyProjectName(
      typeof rawName === "string" && rawName.trim() ? rawName.trim() : "video-parallax-preview",
    );
    const outputFile = `${outputStem}.mp4`;
    const outputRel = `out/${outputFile}`;
    const outputPath = path.join(ROOT, outputRel);

    await mkdir(OUT_DIR, {recursive: true});
    await access(path.join(PUBLIC_DIR, imageRel));

    const jobId = String(++jobCounter);
    const job = {
      id: jobId,
      kind: "video-parallax-preview",
      status: "queued",
      previewOpts: {
        imageRel,
        videoDurationMs: videoMs,
        durationFrames: frames,
        outputPath,
        skipDepth: skipDepth === true,
        forceDepth: forceDepth === true,
      },
      outputPath,
      outputRel,
      outputFile,
      logs: [],
      progress: 0.01,
      phase: "В очереди…",
      createdAt: Date.now(),
    };

    jobs.set(jobId, job);
    pruneFinishedJobs();
    enqueueRender(jobId);

    res.json({jobId, outputFile, outputRel});
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/render", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {
      json: jsonText,
      name: rawName,
      displayTitle: rawDisplayTitle,
      wallpaper: rawWallpaper,
      music: rawMusic,
      dialogueId,
      target: rawTarget,
    } = req.body ?? {};

    const target = rawTarget === "remote" && REMOTE_RENDER_URL ? "remote" : "local";

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(400).json({error: "Некорректный JSON"});
      return;
    }

    const conversation = parseConversation(parsed);
    const fileName = resolveName(rawName, conversation, dialogueId);
    const episodeConversations = buildEpisodeConversations(conversation);
    const episodeCount = episodeConversations.length;

    if (episodeCount > 1) {
      const splitError = validateEpisodeSplits(
        conversation.messages.length,
        conversation.episodes?.splitAfter,
      );
      if (splitError) {
        res.status(400).json({error: splitError});
        return;
      }
    }

    const isStoryVisual =
      conversation.layout === "storySplit" || conversation.layout === "storyOverlay";
    const autoGenerateImages = req.body?.autoGenerateImages === true;
    const voiceoverEnabled = Boolean(conversation.voiceover?.enabled);
    const pendingVoice = voiceoverEnabled ? countPendingVoiceover(conversation) : 0;
    const pendingStoryVideos = isStoryVisual ? countPendingStoryVideos(conversation) : 0;
    const shouldGenerateVoice =
      voiceoverEnabled &&
      (req.body?.autoGenerateVoiceover === true || pendingVoice > 0) &&
      isOpenRouterConfigured();

    if (voiceoverEnabled && pendingVoice > 0 && !isOpenRouterConfigured()) {
      res.status(400).json({
        error:
          "Озвучка не готова: OpenRouter не настроен (OPENROUTER_API_KEY в docs/.env на машине с UI)",
      });
      return;
    }

    const inputRel = `json/${fileName}.json`;
    const outputRel = `out/${fileName}.mp4`;
    const outputFile = `${fileName}.mp4`;
    const inputPath = path.join(ROOT, inputRel);
    const outputPath = path.join(ROOT, outputRel);

    const displayTitle =
      typeof rawDisplayTitle === "string" && rawDisplayTitle.trim()
        ? rawDisplayTitle.trim()
        : typeof rawName === "string"
          ? rawName.trim()
          : "";

    const job = createRenderJobShell({
      fileName,
      inputPath,
      inputRel,
      outputPath,
      outputRel,
      outputFile,
      dialogueId,
      target,
      displayTitle,
    });

    void runRenderPreparation(job, {
      conversation,
      autoGenerateImages,
      shouldGenerateVoice,
      isStoryVisual,
      pendingStoryVideos,
      voiceoverEnabled,
      publicBaseUrl: getPublicBaseUrl(req),
      rawWallpaper,
      rawMusic,
      dialogueId,
      target,
    });

    res.json({
      jobId: job.id,
      status: job.status,
      fileName,
      inputPath: inputRel,
      outputPath: outputRel,
      outputFile,
      outputFiles: episodeOutputFiles(fileName, episodeCount),
      dialogueId: job.dialogueId,
      target,
      renderCommand: job.renderCommand,
      renderConcurrency: getRenderConcurrency(),
      logs: job.logs,
      phase: job.phase,
      progress: job.progress,
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? formatZodError(error)
        : error instanceof Error
          ? error.message
          : String(error);
    res.status(400).json({error: message});
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({error: "Задача не найдена"});
    return;
  }

  if (job.remote) {
    try {
      const resp = await fetchWithRetry(`${job.remoteUrl}/api/jobs/${job.remoteJobId}`);
      const data = await resp.json();
      if (!resp.ok) {
        res.status(resp.status).json(data);
        return;
      }
      await mirrorRemoteJobLogs(job, data);
      const workerLogs = Array.isArray(data.logs) ? data.logs : [];
      const mergedLogs =
        workerLogs.length > 0
          ? [...job.logs, ...workerLogs.map((line) => `[воркер] ${line}`)]
          : job.logs;
      if (data.status === "done") {
        job.status = "done";
        job.finishedAt = job.finishedAt ?? Date.now();
        job.outputFile = data.outputFile ?? job.outputFile;
        job.outputFiles =
          data.outputFiles?.length > 0
            ? data.outputFiles
            : data.episodeOutputs?.length > 0
              ? data.episodeOutputs.map((item) => item.outputFile)
              : job.outputFiles?.length > 0
                ? job.outputFiles
                : job.outputFile
                  ? [job.outputFile]
                  : [];
        try {
          await ensureRemoteOutputsCopiedLocally(job);
        } catch {
          // ошибка уже в job.logs и localCopyStatus === "error"
        }
      } else {
        job.status = data.status;
      }
      const episodeOutputs =
        job.episodeOutputs?.length > 0 ? job.episodeOutputs : data.episodeOutputs ?? [];
      const downloadUrl =
        data.status === "done"
          ? job.localCopyStatus === "done" && episodeOutputs[0]?.downloadUrl
            ? episodeOutputs[0].downloadUrl
            : job.localCopyStatus === "done"
              ? mp4DownloadUrl(job.outputFile, job.finishedAt)
              : `/api/jobs/${job.id}/download`
          : null;
      res.json({
        ...data,
        id: job.id,
        status: job.status,
        target: "remote",
        outputPath: job.outputRel,
        outputFile: job.outputFile,
        outputFiles: job.outputFiles ?? data.outputFiles ?? [],
        episodeOutputs,
        downloadUrl,
        finishedAt: job.finishedAt ?? null,
        localCopyStatus: job.localCopyStatus ?? null,
        renderCommand: job.renderCommand,
        logs: mergedLogs,
      });
    } catch (error) {
      res.status(502).json({
        error: `Воркер недоступен: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    fileName: job.fileName,
    inputPath: job.inputRel,
    outputPath: job.outputRel,
    outputFile: job.outputFile,
    outputFiles: job.outputFiles ?? (job.outputFile ? [job.outputFile] : []),
    episodeOutputs: job.episodeOutputs ?? [],
    downloadUrl: job.downloadUrl,
    finishedAt: job.finishedAt ?? null,
    error: job.error,
    logs: job.logs,
    progress: job.progress,
    renderedFrames: job.renderedFrames,
    encodedFrames: job.encodedFrames,
    totalFrames: job.totalFrames,
    phase: job.phase ?? null,
    renderCommand: job.renderCommand,
    renderConcurrency: getRenderConcurrency(),
    queuePosition: job.status === "queued" ? renderQueue.indexOf(job.id) + 1 : 0,
    canCancel: job.status === "preparing" || job.status === "queued" || job.status === "running",
  });
});

/** Скопировать уже готовый MP4 с воркера без повторного рендера */
app.post("/api/remote/fetch-output", async (req, res) => {
  if (!REMOTE_RENDER_URL) {
    res.status(400).json({error: "REMOTE_RENDER_URL не настроен"});
    return;
  }

  const {name, outputFile: rawOutputFile, dialogueId} = req.body ?? {};
  const outputFile = resolveOutputFile({
    name,
    outputFile: rawOutputFile,
    dialogueId,
  });

  if (!outputFile || !outputFile.endsWith(".mp4")) {
    res.status(400).json({
      error: "Укажите name (название проекта), outputFile или откройте сохранённый диалог",
    });
    return;
  }

  const logs = [`Запрос копирования: out/${outputFile}`];
  try {
    const result = await copyRemoteOutputToLocal({
      remoteUrl: REMOTE_RENDER_URL,
      outputFile,
      logs,
    });
    if (typeof dialogueId === "string" && dialogueId.trim()) {
      touchDialogueOutput(dialogueId.trim(), outputFile);
      logs.push(`Диалог обновлён: ${dialogueId.trim()}`);
    }
    const baseName = outputFile.replace(/\.mp4$/i, "");
    res.json({
      ok: true,
      outputFile,
      outputPath: `out/${baseName}.mp4`,
      downloadUrl: `/out/${outputFile}`,
      replaced: result.replaced,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push(message);
    res.status(502).json({error: message, logs});
  }
});

app.get("/api/jobs/:id/download", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.remote) {
    res.status(404).json({error: "Задача не найдена"});
    return;
  }
  try {
    const resp = await fetchWithRetry(
      `${job.remoteUrl}/out/${job.outputFile}`,
      {},
      {timeoutMs: 600000, retries: 1},
    );
    if (!resp.ok || !resp.body) {
      res.status(resp.status || 502).json({error: "Не удалось получить MP4 с воркера"});
      return;
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${job.outputFile}"`);
    const {Readable} = await import("node:stream");
    Readable.fromWeb(resp.body).pipe(res);
  } catch (error) {
    res.status(502).json({
      error: `Воркер недоступен: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

app.post("/api/jobs/:id/cancel", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({error: "Задача не найдена"});
    return;
  }

  if (job.remote) {
    try {
      const resp = await fetchWithRetry(`${job.remoteUrl}/api/jobs/${job.remoteJobId}/cancel`, {
        method: "POST",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        res.status(resp.status).json(data);
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(502).json({
        error: `Воркер недоступен: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return;
  }

  if (job.status === "preparing") {
    job.prepCancelled = true;
    job.status = "cancelled";
    job.error = "Отменено пользователем";
    job.logs.push(job.error);
    res.json({ok: true, status: job.status});
    return;
  }

  if (job.status === "queued") {
    const index = renderQueue.indexOf(job.id);
    if (index >= 0) {
      renderQueue.splice(index, 1);
    }
    job.status = "cancelled";
    job.error = "Отменено пользователем";
    job.logs.push(job.error);
    res.json({ok: true, status: job.status});
    return;
  }

  if (job.status === "running" && job.cancel) {
    job.cancel();
    res.json({ok: true, status: "cancelling"});
    return;
  }

  res.status(400).json({error: "Задача уже завершена или отменена"});
});

app.use(
  "/out",
  express.static(OUT_DIR, {
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
app.use("/music", express.static(PUBLIC_MUSIC_DIR));
app.use("/images", express.static(IMAGES_DIR));
app.use("/audio", express.static(AUDIO_DIR));
app.use(express.static(UI_DIR, {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html") || filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

const sendUiIndex = (_req, res) => {
  res.sendFile(path.join(UI_DIR, "index.html"));
};

app.get("/", sendUiIndex);
app.get("/shorts", sendUiIndex);
app.get("/shorts/:dialogueId", sendUiIndex);

const formatZodError = (error) =>
  error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      const msgIndex =
        issue.path[0] === "messages" && typeof issue.path[1] === "number"
          ? ` (сообщение №${issue.path[1] + 1})`
          : "";
      return `${path}${msgIndex}: ${issue.message}`;
    })
    .join("; ");

await mkdir(JSON_DIR, {recursive: true});
await mkdir(OUT_DIR, {recursive: true});
await mkdir(IMAGES_DIR, {recursive: true});
const {sessionPath, logDir, jobsDir} = initSessionLog({worker: IS_RENDER_WORKER});
await initDialogueDb();
await loadOpenRouterEnv();
await syncAudioToPublic();

if (isOpenRouterConfigured()) {
  console.log(
    `OpenRouter: ключ загружен (text ${getOpenRouterTextModel()}, chat-image ${getOpenRouterImageModel()}, story-image ${getOpenRouterStoryImageModel()})`,
  );
} else {
  console.log("OpenRouter: не настроен (OPENROUTER_API_KEY в docs/.env)");
}

if (isDialogueLlmConfigured()) {
  console.log(`Диалоги: OpenRouter / ChatGPT (${getOpenRouterTextModel()})`);
} else {
  console.log("Диалоги: задайте OPENROUTER_API_KEY в docs/.env (ChatGPT через OpenRouter)");
}

if (isYoutubeConfigured()) {
  console.log("YouTube: ключи загружены (публикация Shorts)");
} else {
  console.log("YouTube: не настроен (YOUTUBE_* в docs/.env)");
}

const server = app.listen(PORT, "0.0.0.0", () => {
  if (IS_RENDER_WORKER) {
    console.log(`Render-воркер: http://0.0.0.0:${PORT} (этапы задач в stdout)`);
  } else {
    console.log(`UI: http://localhost:${PORT}`);
  }
  console.log(`JSON → ${JSON_DIR}`);
  console.log(`MP4  → ${OUT_DIR}`);
  console.log(`БД   → data/dialogues.db`);
  console.log(`LOG  → ${sessionPath}`);
  console.log(`LOG jobs → ${jobsDir}`);
});

const shutdown = (signal) => {
  console.log(`\n${signal}: завершение…`);
  void sessionLog(`--- ${IS_RENDER_WORKER ? "worker" : "ui"} shutdown ${signal}`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
