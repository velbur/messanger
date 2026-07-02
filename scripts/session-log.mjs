import {appendFile, mkdir, rename, stat} from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LOG_DIR = path.join(ROOT, "logs");
const JOBS_DIR = path.join(LOG_DIR, "jobs");
const MAX_SESSION_BYTES = 8 * 1024 * 1024;

let role = "ui";
let sessionPath = path.join(LOG_DIR, "ui.log");
let booted = false;

const stamp = () => new Date().toISOString();

const formatLine = (message) => `[${stamp()}] ${String(message ?? "").trim()}\n`;

const rotateIfNeeded = async (filePath) => {
  try {
    const {size} = await stat(filePath);
    if (size < MAX_SESSION_BYTES) {
      return;
    }
    const rotated = `${filePath}.1`;
    await rename(filePath, rotated);
  } catch {
    /* no file yet */
  }
};

const appendLine = async (filePath, message) => {
  const line = formatLine(message);
  if (!line.trim()) {
    return;
  }
  await mkdir(path.dirname(filePath), {recursive: true});
  await rotateIfNeeded(filePath);
  await appendFile(filePath, line, "utf8");
};

export const initSessionLog = ({worker = false} = {}) => {
  role = worker ? "worker" : "ui";
  sessionPath = path.join(LOG_DIR, `${role}.log`);
  booted = true;

  const boot = [
    `--- ${role} start pid=${process.pid} port=${process.env.PORT ?? "?"}`,
    `cwd=${process.cwd()}`,
    `root=${ROOT}`,
  ].join(" | ");

  void appendLine(sessionPath, boot);

  const onFatal = (label, error) => {
    const text =
      error instanceof Error ? `${label}: ${error.stack ?? error.message}` : `${label}: ${error}`;
    void appendLine(sessionPath, text);
    void appendLine(sessionPath, `--- ${role} crash`);
  };

  process.on("uncaughtException", (error) => onFatal("uncaughtException", error));
  process.on("unhandledRejection", (reason) => onFatal("unhandledRejection", reason));

  return {logDir: LOG_DIR, sessionPath, role};
};

export const sessionLog = (message) => {
  if (!booted) {
    initSessionLog({
      worker: ["1", "true", "yes"].includes((process.env.RENDER_WORKER ?? "").trim().toLowerCase()),
    });
  }
  return appendLine(sessionPath, message);
};

export const jobLogPath = (job) => {
  const id = String(job?.id ?? "0").padStart(4, "0");
  const name = String(job?.fileName ?? "job")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);
  return path.join(JOBS_DIR, `${id}-${name}.log`);
};

export const jobLog = async (job, message) => {
  const line = String(message ?? "").trim();
  if (!line || !job?.id) {
    return;
  }
  const file = jobLogPath(job);
  await appendLine(file, line);
  await appendLine(sessionPath, `[job ${job.id}] ${line}`);
};

export const jobLogHeader = async (job, extra = "") => {
  if (!job?.id) {
    return;
  }
  const header = [
    `--- job ${job.id} ${job.fileName ?? ""} target=${job.target ?? "local"}`,
    extra,
  ]
    .filter(Boolean)
    .join(" | ");
  await jobLog(job, header);
};

/** Дописать на UI логи, пришедшие с удалённого воркера (без дублей). */
export const mirrorRemoteJobLogs = async (job, remoteData) => {
  if (!job?.id || !remoteData) {
    return;
  }
  const remoteLogs = Array.isArray(remoteData.logs) ? remoteData.logs : [];
  if (!job._mirroredRemoteLogCount) {
    job._mirroredRemoteLogCount = 0;
  }
  const fresh = remoteLogs.slice(job._mirroredRemoteLogCount);
  if (fresh.length === 0 && remoteData.phase) {
    await jobLog(job, `[worker ${remoteData.status ?? "?"}] ${remoteData.phase}`);
    return;
  }
  for (const line of fresh) {
    await jobLog(job, `[worker] ${line}`);
  }
  job._mirroredRemoteLogCount = remoteLogs.length;
  if (remoteData.phase) {
    await jobLog(
      job,
      `[worker ${remoteData.status ?? "?"} ${Math.round((remoteData.progress ?? 0) * 100)}%] ${remoteData.phase}`,
    );
  }
  if (remoteData.error) {
    await jobLog(job, `[worker ERROR] ${remoteData.error}`);
  }
};

export const sessionLogPaths = () => ({
  logDir: LOG_DIR,
  sessionPath,
  jobsDir: JOBS_DIR,
  role,
});
