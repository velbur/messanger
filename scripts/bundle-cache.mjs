import {createHash} from "node:crypto";
import {cp, mkdir, readFile, readdir, rm, stat, writeFile, access} from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const ENTRY_POINT = path.join(PROJECT_ROOT, "src/index.ts");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const PUBLIC_CONVERSATION = path.join(PUBLIC_DIR, "conversation.json");
const DEFAULT_CONVERSATION = path.join(PROJECT_ROOT, "src/default-conversation.json");
const BUNDLE_OUT_DIR = path.join(PROJECT_ROOT, ".cache/remotion-bundle");
const META_FILE = path.join(BUNDLE_OUT_DIR, ".bundle-meta.json");

const isBundleCacheDisabled = () =>
  ["0", "false", "no"].includes((process.env.BUNDLE_CACHE ?? "1").trim().toLowerCase());

/** @param {string} dir */
const walkFiles = async (dir, files = []) => {
  let entries;
  try {
    entries = await readdir(dir, {withFileTypes: true});
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".cache") {
        continue;
      }
      await walkFiles(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
};

/** Fingerprint по src/ и конфигам — при совпадении webpack-бандл можно не пересобирать */
const computeSrcFingerprint = async () => {
  const parts = [];
  const roots = [
    path.join(PROJECT_ROOT, "src"),
    path.join(PROJECT_ROOT, "package.json"),
    path.join(PROJECT_ROOT, "tsconfig.json"),
  ];

  for (const root of roots) {
    let st;
    try {
      st = await stat(root);
    } catch {
      continue;
    }

    if (st.isFile()) {
      parts.push(`${path.relative(PROJECT_ROOT, root)}:${st.mtimeMs}:${st.size}`);
      continue;
    }

    const files = await walkFiles(root);
    for (const file of files.sort()) {
      const fileStat = await stat(file);
      parts.push(`${path.relative(PROJECT_ROOT, file)}:${fileStat.mtimeMs}:${fileStat.size}`);
    }
  }

  return createHash("sha256").update(parts.join("\n")).digest("hex");
};

/** Fingerprint public/ — при изменении только картинок обновляем public в бандле без webpack */
const computePublicFingerprint = async () => {
  const files = await walkFiles(PUBLIC_DIR);
  const parts = [];
  for (const file of files.sort()) {
    const fileStat = await stat(file);
    parts.push(`${path.relative(PROJECT_ROOT, file)}:${fileStat.mtimeMs}:${fileStat.size}`);
  }
  return createHash("sha256").update(parts.join("\n")).digest("hex");
};

/** @returns {Promise<{ srcFingerprint: string, publicFingerprint: string, bundleLocation: string } | null>} */
const readBundleMeta = async () => {
  try {
    const raw = await readFile(META_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.srcFingerprint === "string" &&
      typeof parsed?.publicFingerprint === "string" &&
      typeof parsed?.bundleLocation === "string"
    ) {
      return parsed;
    }
  } catch {
    // нет метаданных — соберём заново
  }
  return null;
};

/** @param {{ srcFingerprint: string, publicFingerprint: string, bundleLocation: string }} meta */
const writeBundleMeta = async (meta) => {
  await mkdir(BUNDLE_OUT_DIR, {recursive: true});
  await writeFile(META_FILE, JSON.stringify(meta, null, 2), "utf8");
};

const bundleLooksValid = async (bundleLocation) => {
  try {
    await access(path.join(bundleLocation, "index.html"));
    return true;
  } catch {
    return false;
  }
};

const SRC_ROOTS = [
  path.join(PROJECT_ROOT, "src"),
  path.join(PROJECT_ROOT, "package.json"),
  path.join(PROJECT_ROOT, "tsconfig.json"),
];

/** Самый свежий mtime среди исходников Remotion */
const newestSourceMtimeMs = async () => {
  let max = 0;
  for (const root of SRC_ROOTS) {
    let st;
    try {
      st = await stat(root);
    } catch {
      continue;
    }

    if (st.isFile()) {
      max = Math.max(max, st.mtimeMs);
      continue;
    }

    const files = await walkFiles(root);
    for (const file of files) {
      const fileStat = await stat(file);
      max = Math.max(max, fileStat.mtimeMs);
    }
  }
  return max;
};

/** bundle.js старше исходников — кэш невалиден даже при совпадении fingerprint */
const isBundleOlderThanSources = async (bundleLocation) => {
  try {
    const bundleMtime = (await stat(path.join(bundleLocation, "bundle.js"))).mtimeMs;
    const srcMtime = await newestSourceMtimeMs();
    return srcMtime > bundleMtime + 500;
  } catch {
    return true;
  }
};

const bundleHasRequiredMarkers = async (bundleLocation) => {
  try {
    const bundleJs = await readFile(path.join(bundleLocation, "bundle.js"), "utf8");
    return (
      bundleJs.includes("fs-story-split-v1") &&
      bundleJs.includes("story-video-hold-overlay-v9") &&
      bundleJs.includes("StorySceneVideo") &&
      bundleJs.includes("timing-scale-050-v1") &&
      bundleJs.includes("timing-speed-v1") &&
      bundleJs.includes("voiceover-openrouter-v2") &&
      bundleJs.includes("hook-overlay-2s-v1") &&
      bundleJs.includes("tail-8000-story-split-v1") &&
      bundleJs.includes("thumb-photo-composition-v1") &&
      bundleJs.includes("fullscreenStartFrame") &&
      bundleJs.includes("FullscreenImage") &&
      bundleJs.includes("StoryPanel") &&
      bundleJs.includes("StorySfxLayer") &&
      bundleJs.includes("story-sfx-mix-v1") &&
      bundleJs.includes("sfxMixSrc") &&
      bundleJs.includes("default-conversation.json")
    );
  } catch {
    return false;
  }
};

/** Remotion Studio / старый Root.tsx импортируют public/conversation.json при сборке bundle */
const ensurePublicConversationJson = async () => {
  try {
    await access(PUBLIC_CONVERSATION);
    return;
  } catch {
    // нет файла — создаём из src/default-conversation.json
  }

  await mkdir(PUBLIC_DIR, {recursive: true});
  try {
    await cp(DEFAULT_CONVERSATION, PUBLIC_CONVERSATION);
    return;
  } catch {
    // fallback если src/ ещё не обновлён на воркере
  }

  await writeFile(
    PUBLIC_CONVERSATION,
    `${JSON.stringify(
      {
        contactName: "Contact",
        contactStatus: "в сети",
        contactAvatar: "avatar.svg",
        wallpaper: "default",
        myName: "You",
        messages: [
          {author: "them", text: "Привет", sentAt: "12:00"},
          {author: "me", text: "Привет", sentAt: "12:01"},
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
};

const isBundleFresh = async (bundleLocation) => {
  if (!(await bundleLooksValid(bundleLocation))) {
    return false;
  }
  if (await isBundleOlderThanSources(bundleLocation)) {
    return false;
  }
  return bundleHasRequiredMarkers(bundleLocation);
};

/** Синхронизирует public/ в собранный бандл (картинки, звуки) */
const syncPublicIntoBundle = async (bundleLocation) => {
  const dest = path.join(bundleLocation, "public");
  try {
    await stat(PUBLIC_DIR);
  } catch {
    return;
  }
  await rm(dest, {recursive: true, force: true});
  await cp(PUBLIC_DIR, dest, {recursive: true});
};

/** @type {{ location: string | null, srcFingerprint: string | null }} */
const memoryCache = {
  location: null,
  srcFingerprint: null,
};

export const invalidateBundleCache = async () => {
  memoryCache.location = null;
  memoryCache.srcFingerprint = null;
  await rm(BUNDLE_OUT_DIR, {recursive: true, force: true});
};

const refreshPublicIfNeeded = async (bundleLocation, srcFingerprint, publicFingerprint, onStatus) => {
  const meta = await readBundleMeta();
  const cachedPublic = meta?.publicFingerprint ?? null;
  if (cachedPublic === publicFingerprint) {
    onStatus("Bundle из кэша");
    return bundleLocation;
  }

  onStatus("Обновление public/ в bundle-кэше…");
  await syncPublicIntoBundle(bundleLocation);
  await writeBundleMeta({srcFingerprint, publicFingerprint, bundleLocation});
  onStatus("Bundle из кэша (public/ обновлён)");
  return bundleLocation;
};

/**
 * Возвращает путь к Remotion bundle.
 * @param {{ onStatus?: (message: string) => void }} [opts]
 */
export const getBundleLocation = async (opts = {}) => {
  const onStatus = opts.onStatus ?? (() => {});
  const srcFingerprint = await computeSrcFingerprint();
  const publicFingerprint = await computePublicFingerprint();

  if (
    memoryCache.location &&
    memoryCache.srcFingerprint === srcFingerprint &&
    (await isBundleFresh(memoryCache.location))
  ) {
    return refreshPublicIfNeeded(
      memoryCache.location,
      srcFingerprint,
      publicFingerprint,
      onStatus,
    );
  }

  if (!isBundleCacheDisabled()) {
    const meta = await readBundleMeta();
    if (
      meta &&
      meta.srcFingerprint === srcFingerprint &&
      (await isBundleFresh(meta.bundleLocation))
    ) {
      memoryCache.location = meta.bundleLocation;
      memoryCache.srcFingerprint = srcFingerprint;
      return refreshPublicIfNeeded(
        meta.bundleLocation,
        srcFingerprint,
        publicFingerprint,
        (msg) => onStatus(msg === "Bundle из кэша" ? "Bundle из дискового кэша" : msg),
      );
    }
  }

  if (memoryCache.location || (await readBundleMeta())) {
    onStatus("Bundle устарел — пересборка…");
    memoryCache.location = null;
    memoryCache.srcFingerprint = null;
  }

  onStatus("Сборка Remotion bundle…");
  await mkdir(BUNDLE_OUT_DIR, {recursive: true});
  await ensurePublicConversationJson();

  const {bundle} = await import("@remotion/bundler");
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    outDir: BUNDLE_OUT_DIR,
    enableCaching: true,
    webpackOverride: (config) => config,
  });

  await writeBundleMeta({srcFingerprint, publicFingerprint, bundleLocation});
  memoryCache.location = bundleLocation;
  memoryCache.srcFingerprint = srcFingerprint;
  onStatus("Bundle собран");
  return bundleLocation;
};
