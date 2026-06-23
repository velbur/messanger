import path from "node:path";
import {createWriteStream} from "node:fs";
import {access, mkdir, readFile, writeFile} from "node:fs/promises";
import {pipeline} from "node:stream/promises";
import {Readable} from "node:stream";
import express from "express";
import {ZodError} from "zod";
import {parseConversation} from "../src/chat/schema.ts";
import {estimateMessagesDurationMs, TIMING_SCALE} from "../src/chat/timing.ts";
import {buildNativeRenderCommand, getRenderConcurrency, renderChatThumbnail, renderChatVideo} from "./render-core.mjs";
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
  PUBLIC_MUSIC_DIR,
  resolveMusicSrc,
  syncAudioToPublic,
} from "./music-tracks.mjs";
import {
  downloadImageToPublic,
  IMAGES_DIR,
  resolveConversationImages,
  saveImageBuffer,
  buildImagePreviewUrl,
  scanImagesFromJson,
  deletePublicImage,
} from "./image-assets.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {resolveImageReferences} from "./image-references.mjs";
import {
  correctFrameImage,
  ImageCorrectionUnchangedError,
} from "./image-correction.mjs";
import {
  resolveFramePrompts,
  suggestImagePrompt,
  buildImageGenerationPrompt,
} from "./image-prompt-llm.mjs";
import {
  loadOpenRouterEnv,
  generateImageBuffer,
  isOpenRouterConfigured,
  getOpenRouterTextModel,
  getOpenRouterImageModel,
  formatOpenRouterError,
} from "./openrouter-client.mjs";
import {
  generateDialogue,
  isDialogueLlmConfigured,
  refineDialogue,
  regenerateMessage,
  checkDialogueLogic,
  regenerateEnding,
} from "./dialogue-gen.mjs";
import {readShortsStylesMeta} from "./dialogue-prompts.mjs";
import {readShortsCorpusSummary, updateShortsCorpusSummary} from "./shorts-corpus.mjs";
import {extractCorpusTips} from "./shorts-corpus-tips.mjs";
import {runShortsPreRenderChecklist} from "./shorts-checklist.mjs";
import {SHORTS_STORY_TEMPLATES} from "./shorts-story-templates.mjs";
import {generateYoutubeMetadata} from "./youtube-metadata.mjs";
import {listDialogueModels, resolveDialogueModel} from "./openrouter-dialogue-models.mjs";
import {generateMissingConversationImages} from "./conversation-images.mjs";
import {previewImagePrompt, readStylePrompt, writeStylePrompt} from "./image-prompt.mjs";
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

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_DIR = path.join(ROOT, "json");
const OUT_DIR = path.join(ROOT, "out");
const PUBLIC_DIR = path.join(ROOT, "public");
const UI_DIR = path.join(ROOT, "ui");
const PORT = Number(process.env.PORT ?? 3333);

/** URL удалённого render-воркера (тот же server.mjs на мощной машине), напр. http://192.168.0.136:3333 */
const REMOTE_RENDER_URL = (process.env.REMOTE_RENDER_URL ?? "").trim().replace(/\/+$/, "");

const getRenderTargets = () => {
  const targets = [{id: "local", label: "Локально (эта машина)"}];
  if (REMOTE_RENDER_URL) {
    targets.push({id: "remote", label: `Мощная машина (${REMOTE_RENDER_URL})`, url: REMOTE_RENDER_URL});
  }
  return targets;
};

const jobs = new Map();
let jobCounter = 0;
let renderBusy = false;
const renderQueue = [];

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

/** Запускает (или возвращает уже идущее) копирование MP4 с воркера в локальный out/ */
const ensureRemoteMp4CopiedLocally = (job) => {
  if (!job.remote || !job.outputFile) {
    return Promise.resolve();
  }
  if (job.localCopyStatus === "done") {
    job.downloadUrl = mp4DownloadUrl(job.outputFile, job.finishedAt);
    return Promise.resolve();
  }
  if (job.localCopyStatus === "copying" && job.localCopyPromise) {
    return job.localCopyPromise;
  }

  if (job.localCopyStatus !== "copying") {
    job.logs.push("Копирование MP4 с воркера на этот компьютер…");
  }
  job.localCopyStatus = "copying";
  job.localCopyPromise = (async () => {
    try {
      await copyRemoteOutputToLocal({
        remoteUrl: job.remoteUrl,
        outputFile: job.outputFile,
        logs: job.logs,
      });
      job.localCopyStatus = "done";
      job.downloadUrl = mp4DownloadUrl(job.outputFile, job.finishedAt);
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

  job.status = "running";
  job.logs.push("Рендер запущен…");
  const messagesMs = estimateMessagesDurationMs(job.conversation);
  job.logs.push(
    `Тайминг переписки: scale ${TIMING_SCALE}, ~${(messagesMs / 1000).toFixed(1)} с на сообщения`,
  );

  const {cancelSignal, cancel} = makeCancelSignal();
  job.cancel = cancel;

  try {
    const outputAbs = await renderChatVideo({
      conversation: job.conversation,
      outputPath: job.outputPath,
      onBundleStatus: (message) => {
        job.logs.push(message);
      },
      onCompositionReady: (durationInFrames) => {
        job.totalFrames = durationInFrames;
      },
      onProgress: ({progress, renderedFrames, encodedFrames, stitchStage}) => {
        job.progress = progress;
        job.renderedFrames = renderedFrames;
        job.encodedFrames = encodedFrames;
        // Когда кадры отрисованы, остаётся однопоточная склейка — отмечаем фазу,
        // чтобы UI не выглядел "зависшим" на 90%+
        if (renderedFrames >= job.totalFrames && job.totalFrames > 0) {
          const phase = stitchStage === "muxing" ? "Склейка видео и аудио…" : "Кодирование видео…";
          if (job.phase !== phase) {
            job.phase = phase;
            job.logs.push(phase);
          }
        }
      },
      cancelSignal,
    });
    job.status = "done";
    job.progress = 1;
    job.finishedAt = Date.now();
    job.outputPath = outputAbs;
    job.downloadUrl = mp4DownloadUrl(job.outputFile, job.finishedAt);
    job.logs.push(`Готово: ${outputAbs}`);
    const thumbPath = outputAbs.replace(/\.mp4$/i, "-thumb.jpg");
    try {
      await renderChatThumbnail({
        conversation: job.conversation,
        outputPath: thumbPath,
        onBundleStatus: (message) => job.logs.push(message),
      });
      job.thumbnailFile = path.basename(thumbPath);
      job.logs.push(`Превью: out/${job.thumbnailFile}`);
    } catch (thumbError) {
      const message = thumbError instanceof Error ? thumbError.message : String(thumbError);
      job.logs.push(`Превью не создано: ${message}`);
    }
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
      job.error = error instanceof Error ? error.message : String(error);
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
  job.logs.push("В очереди…");
  renderQueue.push(jobId);
  processQueue();
};

const app = express();
app.use(express.json({limit: "20mb"}));

app.get("/api/audio", async (_req, res) => {
  try {
    const tracks = await listMusicTracks();
    res.json({tracks, defaultId: DEFAULT_MUSIC_ID});
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

app.get("/api/shorts/styles", async (_req, res) => {
  try {
    res.json({styles: await readShortsStylesMeta()});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/shorts/templates", (_req, res) => {
  res.json({templates: SHORTS_STORY_TEMPLATES});
});

app.get("/api/shorts/corpus-tips", async (_req, res) => {
  try {
    const summary = await readShortsCorpusSummary();
    res.json({tips: extractCorpusTips(summary)});
  } catch (error) {
    res.status(500).json({
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
      imageGenerationAvailable: isOpenRouterConfigured(),
    },
    youtube: {
      configured: isYoutubeConfigured(),
    },
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

    const {outputFile: rawOutputFile, dialogueId, title: rawTitle, privacyStatus: rawPrivacy, description, tags, thumbnailFile} =
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

    let thumbnailPath;
    if (typeof thumbnailFile === "string" && thumbnailFile.trim()) {
      const candidate = path.join(OUT_DIR, path.basename(thumbnailFile.trim()));
      try {
        await access(candidate);
        thumbnailPath = candidate;
      } catch {
        /* нет превью — загрузим только видео */
      }
    } else {
      const autoThumb = filePath.replace(/\.mp4$/i, "-thumb.jpg");
      try {
        await access(autoThumb);
        thumbnailPath = autoThumb;
      } catch {
        /* */
      }
    }

    const result = await uploadVideoToYoutube({
      filePath,
      title,
      description: typeof description === "string" ? description : "",
      tags: Array.isArray(tags) ? tags : [],
      thumbnailPath,
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
    const {prompt, json: jsonText, messageIndex, stylePrompt, targetRef, aspectRatio} =
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
      if (typeof messageIndex !== "number" || messageIndex < 0) {
        res.status(400).json({
          error: "Укажите messageIndex и json для генерации по контексту переписки",
        });
        return;
      }
      const conversation = JSON.parse(jsonText);
      style =
        typeof stylePrompt === "string" && stylePrompt.trim()
          ? stylePrompt.trim()
          : await readStylePrompt();

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

    const finalPrompt =
      manualPrompt ||
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
      aspectRatio: aspectRatio ?? CHAT_IMAGE_ASPECT_RATIO,
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
      imageModel: getOpenRouterImageModel(),
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

app.post("/api/images/delete", async (req, res) => {
  try {
    const {targetRef} = req.body ?? {};
    if (!targetRef || typeof targetRef !== "string") {
      res.status(400).json({error: "Поле targetRef обязательно"});
      return;
    }
    const result = await deletePublicImage(targetRef);
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
    if (buffer.length > 12 * 1024 * 1024) {
      res.status(400).json({error: "Файл слишком большой (макс. 12 МБ)"});
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
        kind: kind === "series" || kind === "shorts" ? kind : undefined,
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
    const {json: jsonText, stylePrompt} = req.body ?? {};
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
    const logs = await generateMissingConversationImages(conversation, {stylePrompt: style});

    res.json({conversation, logs, provider: "openrouter"});
  } catch (error) {
    const message = formatOpenRouterError(error);
    res.status(400).json({error: message});
  }
});

app.post("/api/dialogues/generate", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {
      prompt,
      dialogueStyle,
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

    const mode = modeRaw === "series" ? "series" : "shorts";
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
      dialogueStyle: dialogueStyle === "mystic" ? "mystic" : "fun",
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
    res.status(400).json({error: formatOpenRouterError(error)});
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
    const mode = modeRaw === "series" ? "series" : "shorts";
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
    res.status(400).json({error: formatOpenRouterError(error)});
  }
});

app.post("/api/dialogues/refine", async (req, res) => {
  try {
    await loadOpenRouterEnv();
    const {refinePrompt, json: jsonText, includeImages, imageCount, messageCount, language, mode: modeRaw, seriesId, dialogueStyle, model} =
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
    const mode = modeRaw === "series" ? "series" : "shorts";

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
      dialogueStyle: typeof dialogueStyle === "string" ? dialogueStyle : "fun",
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
    res.status(400).json({error: formatOpenRouterError(error)});
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
    const mode = modeRaw === "series" ? "series" : "shorts";
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
    res.status(400).json({error: formatOpenRouterError(error)});
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
    const mode = modeRaw === "series" ? "series" : "shorts";
    const result = await regenerateEnding({
      conversation,
      displayTitle: typeof displayTitle === "string" ? displayTitle : "",
      tailCount: Number(tailCount) || 3,
      includeImages,
      imageCount,
      messageCount,
      language,
      dialogueStyle: typeof dialogueStyle === "string" ? dialogueStyle : "fun",
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
    res.status(400).json({error: formatOpenRouterError(error)});
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
    res.status(400).json({error: formatOpenRouterError(error)});
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
      kind: kind === "series" ? "series" : "shorts",
      seriesId: typeof seriesId === "string" ? seriesId : "",
      partNumber,
    });

    let corpusUpdate = null;
    if (dialogue.kind === "shorts") {
      await loadOpenRouterEnv();
      try {
        corpusUpdate = await updateShortsCorpusSummary({
          title: dialogue.titleDisplay || dialogue.title,
          dialoguePrompt: dialogue.dialoguePrompt,
          conversation: dialogue.conversation,
        });
      } catch (error) {
        console.warn("shorts corpus update failed:", error);
        corpusUpdate = {
          updated: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }

    res.status(201).json({...dialogue, corpusUpdate});
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
          error instanceof ZodError
            ? formatZodError(error)
            : error instanceof SyntaxError
              ? "Некорректный JSON"
              : error instanceof Error
                ? error.message
                : String(error);
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
      kind: kind === "series" ? "series" : kind === "shorts" ? "shorts" : undefined,
      seriesId: typeof seriesId === "string" ? seriesId : undefined,
      partNumber: partNumber !== undefined ? partNumber : undefined,
    });

    if (!dialogue) {
      res.status(404).json({error: "Диалог не найден"});
      return;
    }

    let corpusUpdate = null;
    if (dialogue.kind === "shorts") {
      await loadOpenRouterEnv();
      try {
        corpusUpdate = await updateShortsCorpusSummary({
          title: dialogue.titleDisplay || dialogue.title,
          dialoguePrompt: dialogue.dialoguePrompt,
          conversation: dialogue.conversation,
        });
      } catch (error) {
        console.warn("shorts corpus update failed:", error);
        corpusUpdate = {
          updated: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }

    res.json({...dialogue, corpusUpdate});
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
  res.json({targets: getRenderTargets(), defaultTarget: "local"});
});

/** Залить локальные картинки переписки на воркер (URL-ссылки пропускаем — они уже резолвятся локально) */
const syncImagesToRemote = async (conversation, remoteUrl, logs) => {
  const seen = new Set();
  for (const message of conversation.messages) {
    const ref = String(message.image ?? "").trim();
    if (!ref || /^https?:\/\//i.test(ref) || seen.has(ref)) {
      continue;
    }
    seen.add(ref);
    const abs = path.join(PUBLIC_DIR, ref.replace(/^\/+/, ""));
    let buffer;
    try {
      buffer = await readFile(abs);
    } catch {
      logs.push(`Картинка не найдена локально, пропущена: ${ref}`);
      continue;
    }
    const resp = await fetch(`${remoteUrl}/api/images/upload`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({targetRef: ref, contentBase64: buffer.toString("base64")}),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(`Не удалось отправить ${ref} на воркер: ${data.error ?? resp.status}`);
    }
    logs.push(`Картинка отправлена на воркер: ${ref}`);
  }
};

app.post("/api/render", async (req, res) => {
  try {
    const {
      json: jsonText,
      name: rawName,
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
    const autoGenerateImages = req.body?.autoGenerateImages === true;
    const imageGenLogs = autoGenerateImages
      ? await generateMissingConversationImages(conversation, {provider: "openrouter"})
      : [];
    const imageLogs = [
      ...imageGenLogs,
      ...(await resolveConversationImages(conversation, {
        failOnMissingImages: !autoGenerateImages,
      })),
    ];
    if (rawWallpaper === "default" || rawWallpaper === "dark") {
      conversation.wallpaper = rawWallpaper;
    }

    if (rawMusic === "none") {
      conversation.music = {...conversation.music, enabled: false};
    } else if (rawMusic && typeof rawMusic === "string") {
      const src = await resolveMusicSrc(rawMusic);
      conversation.music = {
        ...conversation.music,
        enabled: true,
        src,
      };
    }

    const fileName = resolveName(rawName, conversation, dialogueId);
    const inputRel = `json/${fileName}.json`;
    const outputRel = `out/${fileName}.mp4`;
    const outputFile = `${fileName}.mp4`;
    const inputPath = path.join(ROOT, inputRel);
    const outputPath = path.join(ROOT, outputRel);

    await mkdir(JSON_DIR, {recursive: true});
    await mkdir(OUT_DIR, {recursive: true});
    await writeFile(inputPath, JSON.stringify(conversation, null, 2), "utf8");

    if (dialogueId && typeof dialogueId === "string") {
      updateDialogue(dialogueId, {
        conversation,
        wallpaper: conversation.wallpaper,
        music: rawMusic ?? "",
        outputFile,
      });
    }

    const logs = [`JSON сохранён: ${inputRel}`, ...imageLogs];
    const nativeProjectRoot = process.env.NATIVE_PROJECT_ROOT?.trim() || ROOT;
    const renderCommand = buildNativeRenderCommand({
      projectRoot: nativeProjectRoot,
      inputRel,
      outputRel,
    });

    if (target === "remote") {
      logs.push(`Цель рендера: мощная машина (${REMOTE_RENDER_URL})`);
      logs.push("На воркере нужен git pull и перезапуск ./run.sh worker (src/ монтируется с той машины)");
      await syncImagesToRemote(conversation, REMOTE_RENDER_URL, logs);

      const forwardResp = await fetchWithRetry(`${REMOTE_RENDER_URL}/api/render`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          json: JSON.stringify(conversation),
          name: fileName,
          target: "local",
        }),
      });
      const forwardData = await forwardResp.json().catch(() => ({}));
      if (!forwardResp.ok) {
        throw new Error(forwardData.error ?? `Воркер вернул ошибку (${forwardResp.status})`);
      }

      const jobId = String(++jobCounter);
      const job = {
        id: jobId,
        status: "queued",
        remote: true,
        remoteUrl: REMOTE_RENDER_URL,
        remoteJobId: forwardData.jobId,
        fileName,
        inputRel,
        outputRel: forwardData.outputPath ?? outputRel,
        outputFile: forwardData.outputFile ?? outputFile,
        dialogueId: typeof dialogueId === "string" ? dialogueId : null,
        downloadUrl: null,
        localCopyStatus: null,
        localCopyPromise: null,
        error: null,
        logs: [...logs],
        renderCommand,
        createdAt: Date.now(),
      };
      jobs.set(jobId, job);
      pruneFinishedJobs();

      res.json({
        jobId,
        fileName,
        inputPath: inputRel,
        outputPath: job.outputRel,
        outputFile: job.outputFile,
        dialogueId: job.dialogueId,
        target: "remote",
        renderCommand,
        logs: job.logs,
      });
      return;
    }

    const jobId = String(++jobCounter);
    const job = {
      id: jobId,
      status: "queued",
      fileName,
      inputPath,
      inputRel,
      outputPath,
      outputRel,
      outputFile,
      dialogueId: typeof dialogueId === "string" ? dialogueId : null,
      conversation,
      downloadUrl: null,
      error: null,
      logs: [...logs],
      progress: 0,
      renderedFrames: 0,
      encodedFrames: 0,
      totalFrames: 0,
      phase: null,
      cancel: null,
      renderCommand,
      createdAt: Date.now(),
    };

    jobs.set(jobId, job);
    enqueueRender(jobId);

    res.json({
      jobId,
      fileName,
      inputPath: inputRel,
      outputPath: outputRel,
      outputFile,
      dialogueId: job.dialogueId,
      target: "local",
      renderCommand,
      renderConcurrency: getRenderConcurrency(),
      logs: job.logs,
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
      if (data.status === "done") {
        job.status = "done";
        job.finishedAt = job.finishedAt ?? Date.now();
        job.outputFile = data.outputFile ?? job.outputFile;
        try {
          await ensureRemoteMp4CopiedLocally(job);
        } catch {
          // ошибка уже в job.logs и localCopyStatus === "error"
        }
      } else {
        job.status = data.status;
      }
      const downloadUrl =
        data.status === "done"
          ? job.localCopyStatus === "done"
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
        downloadUrl,
        finishedAt: job.finishedAt ?? null,
        localCopyStatus: job.localCopyStatus ?? null,
        renderCommand: job.renderCommand,
        logs: job.logs,
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
    canCancel: job.status === "queued" || job.status === "running",
    thumbnailFile: job.thumbnailFile ?? null,
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
app.use(express.static(UI_DIR));

app.get("/", (_req, res) => {
  res.sendFile(path.join(UI_DIR, "index.html"));
});

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
await initDialogueDb();
await loadOpenRouterEnv();
await syncAudioToPublic();

if (isOpenRouterConfigured()) {
  console.log(
    `OpenRouter: ключ загружен (text ${getOpenRouterTextModel()}, image ${getOpenRouterImageModel()})`,
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
  console.log(`UI: http://localhost:${PORT}`);
  console.log(`JSON → ${JSON_DIR}`);
  console.log(`MP4  → ${OUT_DIR}`);
  console.log(`БД   → data/dialogues.db`);
});

const shutdown = (signal) => {
  console.log(`\n${signal}: завершение…`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
