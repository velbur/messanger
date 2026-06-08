import {createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {
  CHAT_IMAGE_ASPECT_RATIO,
  DEFAULT_KLING_IMAGE_MODEL,
  getChatImageKlingResolution,
} from "./chat-image-spec.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const API_BASE = process.env.KLING_API_BASE ?? "https://api.klingai.com";

let cachedToken = null;
let cachedTokenExp = 0;

const base64url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signJwt = (accessKey, secretKey) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({alg: "HS256", typ: "JWT"}));
  const payload = base64url(
    JSON.stringify({
      iss: accessKey,
      exp: now + 1800,
      nbf: now - 5,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secretKey)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
};

export const loadKlingEnv = async () => {
  const files = [
    path.join(ROOT, ".env"),
    path.join(ROOT, "docs", ".env"),
  ];

  for (const file of files) {
    try {
      const text = await readFile(file, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq === -1) {
          continue;
        }
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      /* file optional */
    }
  }
};

export const getKlingCredentials = () => {
  const accessKey = process.env.KLING_ACCESS_KEY?.trim();
  const secretKey = process.env.KLING_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) {
    return null;
  }
  return {accessKey, secretKey};
};

export const isKlingConfigured = () => Boolean(getKlingCredentials());

export const getKlingImageModel = () =>
  process.env.KLING_IMAGE_MODEL?.trim() || DEFAULT_KLING_IMAGE_MODEL;

const getToken = () => {
  const creds = getKlingCredentials();
  if (!creds) {
    throw new Error("Kling API: задайте KLING_ACCESS_KEY и KLING_SECRET_KEY в .env");
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExp > now + 60) {
    return cachedToken;
  }

  cachedToken = signJwt(creds.accessKey, creds.secretKey);
  cachedTokenExp = now + 1800;
  return cachedToken;
};

const KLING_ERROR_HINTS = [
  {
    match: /balance not enough|insufficient balance|余额不足|1102/i,
    message:
      "На API-аккаунте Kling нет единиц для генерации изображений. Trial Package «Video» покрывает только видео — купите Resource Package с Image (или комбинированный) в app.klingai.com → Billing. Пока используйте «Прикрепить файл».",
  },
  {
    match: /unauthorized|invalid token|401/i,
    message: "Ошибка авторизации Kling: проверьте KLING_ACCESS_KEY и KLING_SECRET_KEY в .env.",
  },
];

export const formatKlingError = (error) => {
  const raw = error instanceof Error ? error.message : String(error);
  for (const {match, message} of KLING_ERROR_HINTS) {
    if (match.test(raw)) {
      return message;
    }
  }
  return raw.startsWith("Kling") ? raw : `Kling: ${raw}`;
};

const klingFetch = async (pathname, {method = "GET", body} = {}) => {
  const token = getToken();
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Kling API: некорректный ответ (${response.status})`);
  }

  if (!response.ok || (typeof data.code === "number" && data.code !== 0)) {
    const msg = data.message ?? data.msg ?? response.statusText ?? "Ошибка Kling API";
    throw new Error(formatKlingError(new Error(msg)));
  }

  return data;
};

/** Список активных resource packages и остатков (официальный API) */
export const fetchKlingResourcePacks = async () => {
  const end = Date.now();
  const start = end - 90 * 24 * 3600 * 1000;
  const query = new URLSearchParams({
    start_time: String(start),
    end_time: String(end),
  });

  const result = await klingFetch(`/account/costs?${query}`);
  const infos =
    result.data?.resource_pack_subscribe_infos ??
    result.data?.data?.resource_pack_subscribe_infos ??
    [];

  return infos.map((pack) => ({
    name: pack.resource_pack_name ?? "—",
    id: pack.resource_pack_id,
    type: pack.resource_pack_type,
    total: pack.total_quantity,
    remaining: pack.remaining_quantity,
    status: pack.status,
    isVideo: /video/i.test(String(pack.resource_pack_name ?? "")),
    isImage: /image|kolors|图片/i.test(String(pack.resource_pack_name ?? "")),
  }));
};

export const filterImagePacks = (packs) =>
  packs.filter((pack) => pack.isImage && pack.status === "online");

export const filterVideoPacks = (packs) =>
  packs.filter((pack) => pack.isVideo && pack.status === "online");

/** Есть ли пакет Image с остатком единиц */
export const hasKlingImageCredits = (packs) =>
  filterImagePacks(packs).some((pack) => pack.remaining > 0);

export const sumImageCredits = (packs) =>
  filterImagePacks(packs).reduce((sum, pack) => sum + Math.max(0, pack.remaining), 0);

/** Текст для UI: отдельно Image и Video, без путаницы «100/100 = картинки» */
export const formatKlingBalanceHint = ({
  packs = [],
  imageGenerationAvailable = false,
  error,
} = {}) => {
  if (error) {
    return error;
  }

  const imagePacks = filterImagePacks(packs);
  const videoPacks = filterVideoPacks(packs);
  const lines = [];

  if (imagePacks.length > 0) {
    for (const pack of imagePacks) {
      lines.push(`${pack.name}: ${pack.remaining} / ${pack.total} ед. (Image API)`);
    }
    const total = sumImageCredits(packs);
    if (imageGenerationAvailable && total > 0) {
      lines.push(
        `Для картинок (${getKlingImageModel()}): ≈ ${total} генераций — по 1 ед. за изображение, если иное не указано в тарифе.`,
      );
    } else if (!imageGenerationAvailable) {
      lines.push("Единицы Image закончились — купите или продлите пакет Image.");
    }
  } else {
    lines.push("Нет пакета Image — генерация картинок через API недоступна.");
  }

  if (videoPacks.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Пакеты Video (не списываются на /v1/images/generations):");
    for (const pack of videoPacks) {
      lines.push(`  ${pack.name}: ${pack.remaining} / ${pack.total} ед.`);
    }
  }

  if (packs.length === 0) {
    return "Нет активных API-пакетов. Проверьте Billing в app.klingai.com.";
  }

  return lines.join("\n");
};

export const getKlingAccountSummary = async () => {
  if (!isKlingConfigured()) {
    return {
      configured: false,
      packs: [],
      imagePacks: [],
      imageCreditsRemaining: 0,
      imageGenerationAvailable: false,
      balanceHint: "",
    };
  }

  try {
    const packs = await fetchKlingResourcePacks();
    const imagePacks = filterImagePacks(packs);
    const imageCreditsRemaining = sumImageCredits(packs);
    const imageGenerationAvailable = imageCreditsRemaining > 0;
    const balanceHint = formatKlingBalanceHint({packs, imageGenerationAvailable});
    return {
      configured: true,
      packs,
      imagePacks,
      imageCreditsRemaining,
      imageGenerationAvailable,
      balanceHint,
    };
  } catch (error) {
    const message = formatKlingError(error);
    return {
      configured: true,
      packs: [],
      imagePacks: [],
      imageCreditsRemaining: 0,
      imageGenerationAvailable: false,
      balanceHint: message,
      error: message,
    };
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Kling API: поле `image` — только base64, без префикса data URI.
 */
export const normalizeKlingImageReference = (input) => {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return null;
  }
  const dataUrl = raw.match(/^data:image\/[a-z0-9+.+-]+;base64,(.+)$/i);
  if (dataUrl) {
    return dataUrl[1].replace(/\s/g, "");
  }
  return raw.replace(/\s/g, "");
};

const extractImageUrl = (taskData) => {
  const images = taskData?.task_result?.images;
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }
  const first = images[0];
  return typeof first === "string" ? first : first?.url ?? null;
};

const pollImageTask = async (taskId, {maxAttempts = 60, intervalMs = 2000} = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await klingFetch(`/v1/images/generations/${taskId}`);
    const task = result.data ?? result;
    const status = task.task_status ?? task.status;

    if (status === "succeed" || status === "success") {
      const url = extractImageUrl(task);
      if (!url) {
        throw new Error("Kling: задача завершена, но URL изображения не найден");
      }
      return url;
    }

    if (status === "failed" || status === "fail") {
      throw new Error(task.task_status_msg ?? task.message ?? "Генерация изображения не удалась");
    }

    await sleep(intervalMs);
  }

  throw new Error("Kling: превышено время ожидания генерации");
};

const downloadImageBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось скачать изображение (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("Сгенерированное изображение слишком большое");
  }
  return buffer;
};

/**
 * @param {{ prompt: string, aspectRatio?: string, negativePrompt?: string }} opts
 */
export const generateKlingImage = async ({
  prompt,
  aspectRatio = CHAT_IMAGE_ASPECT_RATIO,
  resolution = getChatImageKlingResolution(),
  negativePrompt = "blur, distortion, low quality, watermark, text",
  referenceImage,
  /** continuity — новый кадр в том же мире; edit — правка текущего файла */
  referenceMode = "continuity",
  /** 0–1: ниже — больше свободы промпту при правке */
  imageFidelity,
  omitNegativePrompt = false,
}) => {
  const trimmed = String(prompt ?? "").trim();
  if (!trimmed) {
    throw new Error("Нужен текст промпта для генерации");
  }
  if (trimmed.length > 500) {
    throw new Error("Промпт слишком длинный (макс. 500 символов)");
  }

  const account = await getKlingAccountSummary();
  if (!account.imageGenerationAvailable) {
    const videoOnly = account.packs.some((p) => p.isVideo && p.remaining > 0);
    if (videoOnly) {
      throw new Error(
        "Trial-Video пакет не включает генерацию изображений. Купите API Resource Package с Image в Kling Billing.",
      );
    }
    throw new Error(
      account.error ??
        "Нет активного API-пакета для изображений. Проверьте Billing в app.klingai.com.",
    );
  }

  const ref = normalizeKlingImageReference(referenceImage);
  const body = {
    model_name: getKlingImageModel(),
    prompt: trimmed,
    n: 1,
    aspect_ratio: aspectRatio,
    resolution,
  };

  if (!ref || !omitNegativePrompt) {
    body.negative_prompt = negativePrompt;
  }

  if (ref) {
    body.image = ref;
    if (referenceMode === "edit") {
      body.prompt = trimmed;
      body.image_fidelity =
        typeof imageFidelity === "number" ? imageFidelity : 0.55;
    } else {
      body.prompt = [
        "Тот же визуальный мир и стиль, что на референсе (вагон, интерьер, персонажи).",
        trimmed,
      ].join(" ");
      if (typeof imageFidelity === "number") {
        body.image_fidelity = imageFidelity;
      }
    }
  }

  const createResult = await klingFetch("/v1/images/generations", {
    method: "POST",
    body,
  });

  const taskId = createResult.data?.task_id ?? createResult.task_id;
  if (!taskId) {
    throw new Error("Kling: не получен task_id");
  }

  const imageUrl = await pollImageTask(taskId);
  return {taskId, imageUrl};
};

export const generateKlingImageBuffer = async (opts) => {
  const {imageUrl} = await generateKlingImage(opts);
  const buffer = await downloadImageBuffer(imageUrl);
  return {buffer, imageUrl};
};
