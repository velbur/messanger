import {execFile} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";
import {mkdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {PUBLIC_DIR} from "./image-assets.mjs";
import {isStoryVisualLayout} from "../src/chat/story.ts";
import {parseConversation} from "../src/chat/schema.ts";
import {buildTimeline} from "../src/chat/timeline.ts";
import {FPS} from "../src/chat/fps.ts";
import {mergeStorySfxConfig} from "../src/chat/sfx.ts";

const execFileAsync = promisify(execFile);

/** Исходные WAV из sfx:generate очень тихие (~−37 dB); mystic.mp3 ~0 dB */
const SFX_MIX_LINEAR_GAIN = 55;

/** @typedef {{ wavPath: string, startSec: number, durationSec: number, volume: number, loop: boolean }} SfxMixEvent */

/** @returns {{ events: SfxMixEvent[], totalSec: number } | null} */
export const collectStorySfxMixPlan = (conversation) => {
  if (!isStoryVisualLayout(conversation)) {
    return null;
  }
  const sfxConfig = mergeStorySfxConfig(conversation);
  if (!sfxConfig.enabled) {
    return null;
  }

  const timeline = buildTimeline(conversation);
  const story = timeline.story;
  if (!story.enabled) {
    return null;
  }

  /** @type {SfxMixEvent[]} */
  const events = [];

  const pushCue = (cue, startFrame, endFrame) => {
    const from = startFrame + cue.delayFrames;
    if (from >= endFrame || endFrame <= startFrame) {
      return;
    }
    const wavPath = path.join(PUBLIC_DIR, cue.path);
    if (!existsSync(wavPath)) {
      throw new Error(`SFX не найден для микса: ${cue.path}`);
    }
    events.push({
      wavPath,
      startSec: from / FPS,
      durationSec: (endFrame - from) / FPS,
      volume: cue.volume * story.sfxMasterVolume * SFX_MIX_LINEAR_GAIN,
      loop: cue.loop,
    });
  };

  for (const cue of story.openingSfx) {
    pushCue(cue, story.openingStartFrame, story.openingSfxEndFrame);
  }
  for (const scene of story.sceneEvents) {
    for (const cue of scene.sfx) {
      pushCue(cue, scene.startFrame, scene.endFrame);
    }
  }

  if (events.length === 0) {
    return null;
  }

  return {
    events,
    totalSec: timeline.durationInFrames / FPS,
  };
};

/**
 * Собрать один WAV со всеми story-SFX (ffmpeg) — надёжнее, чем десятки <Audio> в Remotion.
 * @param {object} conversation
 * @param {{ namespace?: string, targetRef?: string }} [opts]
 */
export const buildStorySfxMix = async (conversation, opts = {}) => {
  const plan = collectStorySfxMixPlan(conversation);
  if (!plan) {
    if (conversation.story) {
      delete conversation.story.sfxMix;
    }
    return null;
  }

  const namespace = String(opts.namespace ?? "render").trim() || "render";
  const targetRef = opts.targetRef?.trim() || `audio/${namespace}/story-sfx-mix.wav`;
  const outputAbs = path.join(PUBLIC_DIR, targetRef);
  await mkdir(path.dirname(outputAbs), {recursive: true});

  const {events, totalSec} = plan;
  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=48000:cl=stereo:d=${totalSec.toFixed(6)}`,
  ];

  for (const event of events) {
    args.push("-i", event.wavPath);
  }

  const filterParts = [];
  const mixLabels = ["[0:a]"];

  events.forEach((event, index) => {
    const inputIndex = index + 1;
    const label = `[s${inputIndex}]`;
    const delayMs = Math.max(0, Math.round(event.startSec * 1000));
    const vol = event.volume.toFixed(4);
    const dur = event.durationSec.toFixed(6);

    if (event.loop) {
      filterParts.push(
        `[${inputIndex}:a]aloop=loop=-1:size=4800000,atrim=0:${dur},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${vol}${label}`,
      );
    } else {
      filterParts.push(
        `[${inputIndex}:a]atrim=0:${dur},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${vol}${label}`,
      );
    }
    mixLabels.push(label);
  });

  filterParts.push(
    `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0,alimiter=limit=0.98,atrim=0:${totalSec.toFixed(6)}[out]`,
  );

  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[out]");
  args.push("-ar", "48000");
  args.push("-ac", "2");
  args.push(outputAbs);

  await execFileAsync("ffmpeg", args, {maxBuffer: 8 * 1024 * 1024});

  if (!conversation.story) {
    conversation.story = {};
  }
  conversation.story.sfxMix = targetRef;
  return targetRef;
};

export const collectStorySfxMixRef = (conversation) => {
  const ref = String(conversation?.story?.sfxMix ?? "").trim().replace(/^\/+/, "");
  return ref ? [ref] : [];
};

export const syncStorySfxMixToRemote = async (conversation, remoteBaseUrl, logs) => {
  const refs = collectStorySfxMixRef(conversation);
  for (const ref of refs) {
    const abs = path.join(PUBLIC_DIR, ref);
    let buffer;
    try {
      const {readFile} = await import("node:fs/promises");
      buffer = await readFile(abs);
    } catch {
      logs.push(`SFX-mix не найден локально: ${ref}`);
      continue;
    }
    const resp = await fetch(`${remoteBaseUrl}/api/images/upload`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({targetRef: ref, contentBase64: buffer.toString("base64")}),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(`Не удалось отправить SFX-mix на воркер: ${data.error ?? resp.status}`);
    }
    logs.push(`SFX-mix отправлен на воркер: ${ref}`);
  }
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const inputPath = process.argv[2] ?? "json/chto-za-zvuk-na-cherdake.json";
  const {readFile} = await import("node:fs/promises");
  const conversation = parseConversation(JSON.parse(await readFile(inputPath, "utf8")));
  const ref = await buildStorySfxMix(conversation, {
    namespace: path.basename(inputPath, path.extname(inputPath)),
  });
  console.log(ref ? `SFX mix → ${ref}` : "Нет SFX для микса");
}
