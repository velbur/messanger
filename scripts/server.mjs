import path from "node:path";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import express from "express";
import {ZodError} from "zod";
import {parseConversation} from "../src/chat/schema.ts";
import {buildNativeRenderCommand, getRenderConcurrency, renderChatVideo} from "./render-core.mjs";
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
import {
  formatKlingError,
  generateKlingImageBuffer,
  getKlingAccountSummary,
  getKlingImageModel,
  isKlingConfigured,
  loadKlingEnv,
} from "./kling-client.mjs";
import {
  isXaiConfigured,
  getXaiModel,
  getXaiImageModel,
  formatXaiError,
  loadXaiEnv,
  generateGrokImageBuffer,
  isXaiImageConfigured,
} from "./xai-client.mjs";
import {CHAT_IMAGE_ASPECT_RATIO} from "./chat-image-spec.mjs";
import {resolveImageReferences} from "./image-references.mjs";
import {
  correctFrameImage,
  ImageCorrectionUnchangedError,
} from "./image-correction.mjs";
import {
  resolveFramePrompts,
  suggestImagePromptWithGrok,
  buildImageGenerationPrompt,
} from "./grok-image-prompt.mjs";
import {
  previewKlingPrompt,
  readStylePrompt,
  writeStylePrompt,
  buildKlingNegativePrompt,
} from "./image-prompt.mjs";
import {
  initDialogueDb,
  listDialogues,
  getDialogue,
  createDialogue,
  updateDialogue,
  deleteDialogue,
  touchDialogueOutput,
} from "./dialogue-db.mjs";

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

const slugify = (value) => {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 48) || "render";
};

const resolveName = (rawName, conversation) => {
  if (rawName && String(rawName).trim()) {
    return slugify(rawName);
  }
  if (conversation.contactName) {
    const fromContact = slugify(conversation.contactName);
    if (fromContact !== "render") {
      return fromContact;
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `render-${stamp}`;
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

  const {cancelSignal, cancel} = makeCancelSignal();
  job.cancel = cancel;

  try {
    const outputAbs = await renderChatVideo({
      conversation: job.conversation,
      outputPath: job.outputPath,
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
    job.outputPath = outputAbs;
    job.downloadUrl = `/out/${job.outputFile}`;
    job.logs.push(`Готово: ${outputAbs}`);
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

app.get("/api/images/grok", (_req, res) => {
  res.json({
    configured: isXaiConfigured(),
    model: getXaiModel(),
    imageGenerationAvailable: isXaiImageConfigured(),
    imageModel: getXaiImageModel(),
  });
});

app.get("/api/status", async (_req, res) => {
  try {
    const kling = await getKlingAccountSummary();
    res.json({
      kling: {
        configured: kling.configured,
        imageGenerationAvailable: kling.imageGenerationAvailable,
        imageCreditsRemaining: kling.imageCreditsRemaining,
        packs: kling.packs,
        balanceHint: kling.balanceHint,
        error: kling.error,
      },
      grok: {
        configured: isXaiConfigured(),
        imageGenerationAvailable: isXaiImageConfigured(),
        model: getXaiModel(),
        imageModel: getXaiImageModel(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
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
    if (!isXaiConfigured()) {
      res.status(400).json({error: "Grok API не настроен (XAI_API_KEY в docs/.env)"});
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
      const resolved = await resolveFramePrompts({
        conversation,
        messageIndex,
        stylePrompt: style,
        useGrok: false,
      });
      res.json({
        imagePrompt: manual,
        klingPrompt: resolved.klingPrompt,
        promptSource: "manual",
        grokUsed: false,
        skippedGrok: true,
      });
      return;
    }

    const grok = await suggestImagePromptWithGrok({
      conversation,
      messageIndex,
      stylePrompt: style,
    });
    res.json({
      ...grok,
      promptSource: "grok",
      grokUsed: true,
      charCount: grok.klingPrompt.length,
      maxChars: 500,
    });
  } catch (error) {
    res.status(400).json({
      error: formatXaiError(error),
    });
  }
});

app.post("/api/images/preview-prompt", async (req, res) => {
  try {
    const {json: jsonText, messageIndex, stylePrompt, useGrok} = req.body ?? {};
    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    const conversation = JSON.parse(jsonText);
    const preview = await previewKlingPrompt({
      conversation,
      messageIndex,
      stylePrompt: typeof stylePrompt === "string" ? stylePrompt : undefined,
      useGrok: useGrok !== false && isXaiConfigured(),
    });
    res.json(preview);
  } catch (error) {
    res.status(400).json({
      error: formatXaiError(error),
    });
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

    const kling = await getKlingAccountSummary();
    res.json({
      ...result,
      klingConfigured: kling.configured,
      klingImageAvailable: kling.imageGenerationAvailable,
      klingPacks: kling.packs,
      klingImageCredits: kling.imageCreditsRemaining,
      klingBalanceHint: kling.balanceHint,
      klingHint: kling.error,
      grokConfigured: isXaiConfigured(),
      grokModel: getXaiModel(),
      grokImageAvailable: isXaiImageConfigured(),
      grokImageModel: getXaiImageModel(),
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

app.get("/api/images/kling", async (_req, res) => {
  try {
    const summary = await getKlingAccountSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      configured: isKlingConfigured(),
      error: formatKlingError(error),
    });
  }
});

const normalizeImageProvider = (value) => (value === "grok" ? "grok" : "kling");

app.post("/api/images/generate", async (req, res) => {
  try {
    const {
      prompt,
      json: jsonText,
      messageIndex,
      stylePrompt,
      targetRef,
      aspectRatio,
      useGrok,
      provider: providerRaw,
    } = req.body ?? {};

    const provider = normalizeImageProvider(providerRaw);

    if (provider === "kling" && !isKlingConfigured()) {
      res.status(400).json({error: "Kling API не настроен (KLING_ACCESS_KEY в docs/.env)"});
      return;
    }
    if (provider === "grok" && !isXaiImageConfigured()) {
      res.status(400).json({error: "Grok Imagine не настроен (XAI_API_KEY в docs/.env)"});
      return;
    }

    let manualPrompt = typeof prompt === "string" ? prompt.trim() : "";
    let frameBrief = null;
    let imagePromptSuggested = null;
    let promptSource = "manual";
    let grokUsed = false;
    let klingPrompt = "";
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
          useGrok: useGrok !== false && isXaiConfigured(),
        });

        frameBrief = resolved.frame;
        klingPrompt = resolved.klingPrompt;
        imagePromptSuggested = resolved.imagePrompt;
        promptSource = resolved.promptSource;
        grokUsed = resolved.grokUsed;
        imageRefs = resolved.imageReferences;
      } else {
        imageRefs = await resolveImageReferences(conversation.messages, messageIndex);
      }
    }

    const finalPrompt =
      manualPrompt ||
      buildImageGenerationPrompt({
        imagePrompt: imagePromptSuggested,
        klingPrompt,
        stylePrompt: style || (await readStylePrompt()),
        provider,
      });

    if (!finalPrompt) {
      res.status(400).json({error: "Не удалось собрать промпт для генерации"});
      return;
    }

    const referenceDataUrl = imageRefs?.primaryReference?.dataUrl ?? null;

    let buffer;
    if (provider === "grok") {
      ({buffer} = await generateGrokImageBuffer({
        prompt: finalPrompt,
        aspectRatio: aspectRatio ?? CHAT_IMAGE_ASPECT_RATIO,
        referenceDataUrl,
      }));
    } else {
      const klingPromptText =
        finalPrompt.length > 500 ? `${finalPrompt.slice(0, 499)}…` : finalPrompt;
      ({buffer} = await generateKlingImageBuffer({
        prompt: klingPromptText,
        aspectRatio: aspectRatio ?? CHAT_IMAGE_ASPECT_RATIO,
        negativePrompt: buildKlingNegativePrompt(frameBrief ?? finalPrompt),
        referenceImage: referenceDataUrl,
      }));
    }

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
      grokUsed,
      provider,
      imageModel: provider === "grok" ? getXaiImageModel() : getKlingImageModel(),
      usedImageReference: Boolean(referenceDataUrl),
      referenceMessageIndex: imageRefs?.primaryReference?.messageIndex ?? null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const message =
      /Grok/i.test(msg) ? formatXaiError(error) : formatKlingError(error);
    res.status(400).json({error: message});
  }
});

app.post("/api/images/correct", async (req, res) => {
  try {
    const {
      json: jsonText,
      messageIndex,
      imageEditPrompt,
      stylePrompt,
      provider: providerRaw,
      aspectRatio,
    } = req.body ?? {};

    const provider = normalizeImageProvider(providerRaw);

    if (!jsonText || typeof jsonText !== "string") {
      res.status(400).json({error: "Поле json обязательно"});
      return;
    }
    if (typeof messageIndex !== "number" || messageIndex < 0) {
      res.status(400).json({error: "Поле messageIndex обязательно"});
      return;
    }
    const editText =
      typeof imageEditPrompt === "string"
        ? imageEditPrompt.trim()
        : "";
    if (!editText) {
      res.status(400).json({error: "Укажите imageEditPrompt — что исправить на кадре"});
      return;
    }

    if (provider === "kling" && !isKlingConfigured()) {
      res.status(400).json({error: "Kling API не настроен"});
      return;
    }
    if (provider === "grok" && !isXaiImageConfigured()) {
      res.status(400).json({error: "Grok Imagine не настроен"});
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
      provider,
      aspectRatio: aspectRatio ?? CHAT_IMAGE_ASPECT_RATIO,
    });

    const publicPath = await saveImageBuffer(result.buffer, result.ref);
    const previewUrl = await buildImagePreviewUrl(publicPath);

    res.json({
      publicPath,
      previewUrl,
      promptUsed: result.promptUsed,
      provider: result.provider,
      requestedProvider: result.requestedProvider,
      usedGrokFallback: result.usedGrokFallback,
      mode: "correct",
      imageModel:
        result.provider === "grok" ? getXaiImageModel() : getKlingImageModel(),
    });
  } catch (error) {
    if (error instanceof ImageCorrectionUnchangedError) {
      res.status(400).json({error: error.message});
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    const message =
      /Grok/i.test(msg) ? formatXaiError(error) : formatKlingError(error);
    res.status(400).json({error: message});
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

app.get("/api/dialogues", (_req, res) => {
  try {
    res.json({dialogues: listDialogues()});
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

app.post("/api/dialogues", (req, res) => {
  try {
    const {title, json: jsonText, wallpaper, music} = req.body ?? {};
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
      conversation,
      wallpaper: wallpaper === "dark" ? "dark" : "default",
      music: typeof music === "string" ? music : "",
    });
    res.status(201).json(dialogue);
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

app.put("/api/dialogues/:id", (req, res) => {
  try {
    const {title, json: jsonText, wallpaper, music} = req.body ?? {};
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
      conversation,
      wallpaper: wallpaper === "dark" ? "dark" : wallpaper === "default" ? "default" : undefined,
      music: typeof music === "string" ? music : undefined,
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
    const imageLogs = await resolveConversationImages(conversation);
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

    const fileName = resolveName(rawName, conversation);
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
        job.outputFile = data.outputFile ?? job.outputFile;
        job.downloadUrl = `/api/jobs/${job.id}/download`;
      } else {
        job.status = data.status;
      }
      res.json({
        ...data,
        id: job.id,
        target: "remote",
        outputPath: job.outputRel,
        downloadUrl: data.status === "done" ? `/api/jobs/${job.id}/download` : null,
        renderCommand: job.renderCommand,
        logs: [...job.logs, ...(data.logs ?? [])],
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
  });
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

app.use("/out", express.static(OUT_DIR));
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
await loadKlingEnv();
await loadXaiEnv();
await syncAudioToPublic();

if (isKlingConfigured()) {
  console.log("Kling API: ключи загружены");
} else {
  console.log("Kling API: не настроен (KLING_ACCESS_KEY / KLING_SECRET_KEY в .env)");
}

if (isXaiConfigured()) {
  console.log(`Grok API: ключ загружен (LLM ${getXaiModel()}, Imagine ${getXaiImageModel()})`);
} else {
  console.log("Grok API: не настроен (XAI_API_KEY в docs/.env)");
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
