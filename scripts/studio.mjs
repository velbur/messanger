/**
 * Студия: одиночные кадры (фото + анимация) вне диалогов.
 * Файлы: data/studio/<id>.json · public/images/studio/<id>/frame.png|.video.mp4
 */
import {randomUUID} from "node:crypto";
import {existsSync} from "node:fs";
import {mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildImagePreviewUrl, deletePublicImage, deleteStoryImageAssets, saveImageBuffer} from "./image-assets.mjs";
import {loadPublicImageBuffer} from "./image-references.mjs";
import {correctFrameImage} from "./image-correction.mjs";
import {readStoryStylePrompt} from "./image-prompt.mjs";
import {
  generateStoryImageBuffer,
  getStoryImageGenerationStatus,
  isStoryImageGenerationConfigured,
} from "./story-image-provider.mjs";
import {STORY_IMAGE_ASPECT_RATIO} from "./story-image-spec.mjs";
import {storyVideoPathForImage} from "../src/chat/story-video-paths.ts";
import {buildStoryMotionPrompt} from "./story-motion-prompt.mjs";
import {
  describeStoryVideoProvider,
  generateStoryVideoFile,
  getStoryVideoGenerationStatus,
  getStoryVideoProvider,
  isStoryVideoGenerationConfigured,
} from "./story-video-provider.mjs";
import {getLocalGpuVideoModel} from "./local-gpu-video.mjs";
import {getOpenRouterStoryVideoModel} from "./openrouter-video.mjs";
import {snapStoryVideoDuration, STORY_VIDEO_SUPPORTED_DURATIONS} from "./openrouter-video.mjs";
import {normalizeStoryVideoModelId} from "./story-video-model-catalog.mjs";
import {ensureLocalGpuModel} from "./local-gpu-models.mjs";
import {probeVideoDurationMs} from "./media-duration.mjs";

/** Дефолты Студии (отдельно от Shorts) */
export const STUDIO_DEFAULT_IMAGE_MODEL = "openai/gpt-5.4-image-2";
export const STUDIO_DEFAULT_VIDEO_MODEL = "google/veo-3.1";
export const STUDIO_DEFAULT_VIDEO_DURATION_SEC = 4;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data", "studio");
const PUBLIC_DIR = path.join(ROOT, "public");

const ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1", "4:3"]);

const normalizeSpace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const ensureDataDir = async () => {
  await mkdir(DATA_DIR, {recursive: true});
};

const clipPath = (id) => path.join(DATA_DIR, `${id}.json`);

const assetDirRel = (id) => `images/studio/${id}`;

const frameImageRel = (id) => `${assetDirRel(id)}/frame.png`;

const nowMs = () => Date.now();

const withPreviews = async (clip) => {
  const imagePreviewUrl = clip.image ? await buildImagePreviewUrl(clip.image) : null;
  const videoPreviewUrl = clip.video
    ? `/${String(clip.video).replace(/^\/+/, "")}?t=${clip.updatedAt ?? Date.now()}`
    : null;
  return {...clip, imagePreviewUrl, videoPreviewUrl};
};

export const normalizeStudioAspectRatio = (value) => {
  const raw = String(value ?? "").trim();
  return ASPECT_RATIOS.has(raw) ? raw : STORY_IMAGE_ASPECT_RATIO;
};

export const normalizeStudioVideoDurationSec = (value) => {
  const n = Number(value);
  if (STORY_VIDEO_SUPPORTED_DURATIONS.includes(n)) {
    return n;
  }
  return snapStoryVideoDuration(n) || STUDIO_DEFAULT_VIDEO_DURATION_SEC;
};

const scrubClip = (raw) => {
  const id = String(raw?.id ?? "").trim();
  if (!id) {
    throw new Error("Клип без id");
  }
  return {
    id,
    title: normalizeSpace(raw?.title) || "Без названия",
    prompt: String(raw?.prompt ?? ""),
    motionPrompt: String(raw?.motionPrompt ?? ""),
    editPrompt: String(raw?.editPrompt ?? ""),
    image: normalizeSpace(raw?.image) || null,
    video: normalizeSpace(raw?.video) || null,
    videoDurationMs:
      typeof raw?.videoDurationMs === "number" && raw.videoDurationMs > 0
        ? Math.round(raw.videoDurationMs)
        : null,
    videoDurationSec: normalizeStudioVideoDurationSec(
      raw?.videoDurationSec ?? STUDIO_DEFAULT_VIDEO_DURATION_SEC,
    ),
    aspectRatio: normalizeStudioAspectRatio(raw?.aspectRatio),
    createdAt: Number(raw?.createdAt) || nowMs(),
    updatedAt: Number(raw?.updatedAt) || nowMs(),
  };
};

export const listStudioClips = async () => {
  await ensureDataDir();
  const names = await readdir(DATA_DIR);
  const clips = [];
  for (const name of names) {
    if (!name.endsWith(".json")) {
      continue;
    }
    try {
      const raw = JSON.parse(await readFile(path.join(DATA_DIR, name), "utf8"));
      clips.push(await withPreviews(scrubClip(raw)));
    } catch {
      /* skip broken */
    }
  }
  clips.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return clips;
};

export const getStudioClip = async (id) => {
  const clipId = String(id ?? "").trim();
  if (!clipId) {
    throw new Error("id обязателен");
  }
  const abs = clipPath(clipId);
  if (!existsSync(abs)) {
    const error = new Error("Клип не найден");
    error.statusCode = 404;
    throw error;
  }
  const raw = JSON.parse(await readFile(abs, "utf8"));
  return withPreviews(scrubClip(raw));
};

const writeClip = async (clip) => {
  await ensureDataDir();
  const next = scrubClip({...clip, updatedAt: nowMs()});
  await writeFile(clipPath(next.id), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return withPreviews(next);
};

export const createStudioClip = async ({title, prompt, motionPrompt, aspectRatio, videoDurationSec} = {}) => {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const clip = {
    id,
    title: normalizeSpace(title) || "Новый кадр",
    prompt: String(prompt ?? ""),
    motionPrompt: String(motionPrompt ?? ""),
    editPrompt: "",
    image: null,
    video: null,
    videoDurationMs: null,
    videoDurationSec: normalizeStudioVideoDurationSec(videoDurationSec),
    aspectRatio: normalizeStudioAspectRatio(aspectRatio),
    createdAt: nowMs(),
    updatedAt: nowMs(),
  };
  await mkdir(path.join(PUBLIC_DIR, assetDirRel(id)), {recursive: true});
  return writeClip(clip);
};

export const updateStudioClip = async (id, patch = {}) => {
  const clip = scrubClip(await getStudioClip(id));
  if (patch.title !== undefined) {
    clip.title = normalizeSpace(patch.title) || clip.title;
  }
  if (patch.prompt !== undefined) {
    clip.prompt = String(patch.prompt ?? "");
  }
  if (patch.motionPrompt !== undefined) {
    clip.motionPrompt = String(patch.motionPrompt ?? "");
  }
  if (patch.editPrompt !== undefined) {
    clip.editPrompt = String(patch.editPrompt ?? "");
  }
  if (patch.aspectRatio !== undefined) {
    clip.aspectRatio = normalizeStudioAspectRatio(patch.aspectRatio);
  }
  if (patch.videoDurationSec !== undefined) {
    clip.videoDurationSec = normalizeStudioVideoDurationSec(patch.videoDurationSec);
  }
  return writeClip(clip);
};

const clearVideoFields = (clip) => {
  clip.video = null;
  clip.videoDurationMs = null;
};

export const deleteStudioClipImage = async (id) => {
  const clip = scrubClip(await getStudioClip(id));
  const logs = [];
  if (clip.image) {
    const result = await deleteStoryImageAssets(clip.image);
    logs.push(`Удалены ассеты кадра: ${(result.deleted ?? []).length}`);
  }
  if (clip.video) {
    try {
      await deletePublicImage(clip.video);
    } catch {
      /* skip */
    }
  }
  clip.image = null;
  clearVideoFields(clip);
  return {clip: await writeClip(clip), logs};
};

export const deleteStudioClipVideo = async (id) => {
  const clip = scrubClip(await getStudioClip(id));
  const logs = [];
  if (clip.image) {
    const videoRef = clip.video || storyVideoPathForImage(clip.image);
    const base = videoRef.replace(/\.video\.mp4$/i, "");
    for (const ref of [
      videoRef,
      `${base}.video-hold.png`,
      `${base}.video-hold.depth.png`,
      `${base}.video-hold.parallax.mp4`,
      `${base}.video-hold.depth-meta.json`,
      `${base}.video.seamless.mp4`,
      `${base}.video.loop.mp4`,
    ]) {
      try {
        const result = await deletePublicImage(ref);
        if (result.deleted) {
          logs.push(`удалено: ${ref}`);
        }
      } catch {
        /* skip */
      }
    }
  } else if (clip.video) {
    try {
      await deletePublicImage(clip.video);
    } catch {
      /* skip */
    }
  }
  clearVideoFields(clip);
  return {clip: await writeClip(clip), logs};
};

export const deleteStudioClip = async (id) => {
  const clip = scrubClip(await getStudioClip(id));
  if (clip.image) {
    await deleteStoryImageAssets(clip.image).catch(() => {});
  }
  if (clip.video) {
    await deletePublicImage(clip.video).catch(() => {});
  }
  await rm(path.join(PUBLIC_DIR, assetDirRel(clip.id)), {recursive: true, force: true}).catch(() => {});
  await rm(clipPath(clip.id), {force: true});
  return {ok: true, id: clip.id};
};

export const uploadStudioClipImage = async (id, {contentBase64, fileName} = {}) => {
  if (!contentBase64 || typeof contentBase64 !== "string") {
    throw new Error("contentBase64 обязателен");
  }
  const clip = scrubClip(await getStudioClip(id));
  const match = contentBase64.match(/^data:([^;]+);base64,(.+)$/);
  const base64 = match ? match[2] : contentBase64;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length < 32) {
    throw new Error("Пустой файл");
  }
  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error("Файл слишком большой (макс. 25 МБ)");
  }

  if (clip.image) {
    await deleteStoryImageAssets(clip.image).catch(() => {});
  }
  clearVideoFields(clip);

  const targetRef = frameImageRel(clip.id);
  const publicPath = await saveImageBuffer(buffer, targetRef);
  clip.image = publicPath;
  if (fileName && !clip.title) {
    clip.title = String(fileName).replace(/\.[^.]+$/, "").slice(0, 80);
  }
  return writeClip(clip);
};

export const generateStudioClipImage = async (id, {storyImageModel} = {}) => {
  if (!isStoryImageGenerationConfigured()) {
    throw new Error(
      "Генерация изображений недоступна: STORY_IMAGE_PROVIDER=local-gpu + LOCAL_GPU_VIDEO_URL или OPENROUTER_API_KEY",
    );
  }
  const clip = scrubClip(await getStudioClip(id));
  const prompt = normalizeSpace(clip.prompt);
  if (!prompt) {
    throw new Error("Заполните промпт для генерации фото");
  }

  const style = await readStoryStylePrompt();
  const finalPrompt = [style, prompt].filter(Boolean).join("\n\n").trim();
  const {buffer} = await generateStoryImageBuffer({
    prompt: finalPrompt,
    aspectRatio: clip.aspectRatio || STORY_IMAGE_ASPECT_RATIO,
    model: storyImageModel || STUDIO_DEFAULT_IMAGE_MODEL,
  });

  if (clip.image) {
    await deleteStoryImageAssets(clip.image).catch(() => {});
  }
  clearVideoFields(clip);

  const publicPath = await saveImageBuffer(buffer, frameImageRel(clip.id));
  clip.image = publicPath;
  const saved = await writeClip(clip);
  return {
    clip: saved,
    provider: getStoryImageGenerationStatus().provider,
    logs: [`Сгенерировано → ${publicPath}`],
  };
};

export const correctStudioClipImage = async (id, {editPrompt, storyImageModel} = {}) => {
  const clip = scrubClip(await getStudioClip(id));
  if (!clip.image) {
    throw new Error("Сначала сгенерируйте или вставьте фото");
  }
  const text = normalizeSpace(editPrompt ?? clip.editPrompt);
  if (!text) {
    throw new Error("Укажите, что исправить на кадре");
  }

  const result = await correctFrameImage({
    messages: [{storyImage: clip.image}],
    messageIndex: 0,
    imageEditPrompt: text,
    kind: "story",
    aspectRatio: clip.aspectRatio,
    model: storyImageModel,
  });

  clearVideoFields(clip);
  const publicPath = await saveImageBuffer(result.buffer, frameImageRel(clip.id));
  clip.image = publicPath;
  clip.editPrompt = text;
  const saved = await writeClip(clip);
  return {
    clip: saved,
    provider: result.provider,
    logs: [`Кадр исправлен → ${publicPath}`],
  };
};

export const generateStudioClipVideo = async (
  id,
  {storyVideoModel, videoDurationSec, publicBaseUrl, onProgress} = {},
) => {
  if (!isStoryVideoGenerationConfigured()) {
    throw new Error(
      "Анимация недоступна: OPENROUTER_API_KEY (Veo) или STORY_VIDEO_PROVIDER=local-gpu + LOCAL_GPU_VIDEO_URL",
    );
  }
  const clip = scrubClip(await getStudioClip(id));
  if (!clip.image) {
    throw new Error("Сначала нужно фото");
  }

  const logs = [];
  const videoStatus = getStoryVideoGenerationStatus();
  const videoProvider = getStoryVideoProvider();
  logs.push(`Анимация: провайдер ${describeStoryVideoProvider()}`);

  if (videoProvider === "local-gpu") {
    await ensureLocalGpuModel("wan", {
      onStatus: (message) => logs.push(message),
    });
  }

  const imageAbs = path.join(PUBLIC_DIR, clip.image.replace(/^\/+/, ""));
  if (!existsSync(imageAbs)) {
    throw new Error(`Файл кадра не найден: ${clip.image}`);
  }

  const videoRel = storyVideoPathForImage(clip.image);
  const videoAbs = path.join(PUBLIC_DIR, videoRel);
  await mkdir(path.dirname(videoAbs), {recursive: true});

  const motionPrompt =
    normalizeSpace(clip.motionPrompt) ||
    buildStoryMotionPrompt(clip.prompt, {loop: false, provider: videoProvider});

  if (!normalizeSpace(clip.motionPrompt)) {
    clip.motionPrompt = motionPrompt;
  }

  const model =
    videoProvider === "local-gpu"
      ? getLocalGpuVideoModel()
      : normalizeStoryVideoModelId(storyVideoModel, {
          fallback: STUDIO_DEFAULT_VIDEO_MODEL || getOpenRouterStoryVideoModel(),
        });

  const duration = normalizeStudioVideoDurationSec(
    videoDurationSec ?? clip.videoDurationSec ?? STUDIO_DEFAULT_VIDEO_DURATION_SEC,
  );
  clip.videoDurationSec = duration;

  const base = String(publicBaseUrl ?? "").trim().replace(/\/$/, "");
  const imagePublicUrl = base
    ? `${base}/${clip.image.replace(/^\/+/, "")}`
    : undefined;

  onProgress?.({stage: "generating", label: clip.title});

  const result = await generateStoryVideoFile({
    imageAbsolutePath: imageAbs,
    imagePublicUrl,
    prompt: motionPrompt,
    outputPath: videoAbs,
    model,
    duration,
    resolution: videoStatus.resolution,
    onPoll: ({attempt, maxAttempts, status}) => {
      onProgress?.({
        stage: videoProvider === "local-gpu" ? "generating" : "polling",
        attempt,
        maxAttempts,
        status,
        label: clip.title,
      });
    },
  });

  clip.video = path
    .relative(PUBLIC_DIR, result.outputPath)
    .split(path.sep)
    .join("/");
  clip.videoDurationMs = await probeVideoDurationMs(result.outputPath);
  const saved = await writeClip(clip);
  logs.push(
    `Анимация готова → ${clip.video} (запрос ${duration} с, факт ~${Math.round(clip.videoDurationMs / 100) / 10} с)`,
  );
  return {clip: saved, logs, provider: result.provider, model: result.model};
};

/** Загрузить буфер картинки из public (для проверки). */
export const loadStudioImageBuffer = async (imageRel) =>
  loadPublicImageBuffer(imageRel, {maxBytes: 25 * 1024 * 1024});
