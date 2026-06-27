#!/usr/bin/env node
/**
 * Процедурная генерация библиотеки SFX (ffmpeg).
 * Запуск: node scripts/generate-sfx-library.mjs
 */
import {execSync} from "node:child_process";
import {mkdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SFX_CATALOG, SFX_CATALOG_VERSION} from "./sfx-catalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "sfx");
const catalogJsonPath = path.join(__dirname, "..", "src", "chat", "data", "sfx-catalog.json");

mkdirSync(outDir, {recursive: true});
mkdirSync(path.dirname(catalogJsonPath), {recursive: true});

const AR = 48000;
const STEREO = 2;

const ffmpeg = (args) => {
  execSync(`ffmpeg -y ${args}`, {stdio: "inherit"});
};

const outPath = (id) => path.join(outDir, `${id}.wav`);

/** @param {number} durationSec @param {string} color @param {string} af */
const noiseLoop = (id, durationSec, color, af) => {
  ffmpeg(
    `-f lavfi -i "anoisesrc=duration=${durationSec}:color=${color}:sample_rate=${AR}:amplitude=0.45" ` +
      `-af "${af},afade=t=in:st=0:d=0.15,afade=t=out:st=${Math.max(0, durationSec - 0.2)}:d=0.2" ` +
      `-ar ${AR} -ac ${STEREO} "${outPath(id)}"`,
  );
};

/** @param {string} source lavfi source @param {string} [af] @param {number} durationSec */
const lavfiShot = (id, source, af, durationSec) => {
  const afPart = af ? `-af "${af}"` : "";
  ffmpeg(
    `-f lavfi -i "${source}" ${afPart} -t ${durationSec} -ar ${AR} -ac ${STEREO} "${outPath(id)}"`,
  );
};

/** @param {string} filterComplex @param {number} durationSec */
const filterGraph = (id, filterComplex, durationSec = 2) => {
  ffmpeg(
    `-filter_complex "${filterComplex}" -map "[out]" -t ${durationSec} -ar ${AR} -ac ${STEREO} "${outPath(id)}"`,
  );
};

/** @param {Array<{f:number,d:number,v?:number}>} tones */
const toneSequence = (id, tones, tail = 0.08) => {
  const inputs = tones
    .map((t) => `-f lavfi -i "sine=frequency=${t.f}:duration=${t.d}"`)
    .join(" ");
  const labels = tones.map((_, i) => `[${i}:a]`).join("");
  const total = tones.reduce((sum, tone) => sum + tone.d, 0);
  const vol = (tones[0]?.v ?? 0.35).toFixed(2);
  ffmpeg(
    `${inputs} -filter_complex "${labels}concat=n=${tones.length}:v=0:a=1,volume=${vol},afade=t=out:st=${Math.max(0, total - tail)}:d=${tail}" ` +
      `-ar ${AR} -ac ${STEREO} "${outPath(id)}"`,
  );
};

/** Два коротких шума с задержкой — шаги, скрип */
const dualTap = (id, durationSec, gapMs, af = "lowpass=f=700,volume=0.6") => {
  ffmpeg(
    `-f lavfi -i "anoisesrc=d=0.08:c=pink:a=0.5" ` +
      `-f lavfi -i "anoisesrc=d=0.08:c=pink:a=0.45" ` +
      `-filter_complex "[0:a]${af}[a0];[1:a]${af},adelay=${gapMs}|${gapMs}[a1];` +
      `[a0][a1]amix=inputs=2:duration=longest" ` +
      `-t ${durationSec} -ar ${AR} -ac ${STEREO} "${outPath(id)}"`,
  );
};

const RECIPES = {
  "rain-light": () =>
    noiseLoop("rain-light", 10, "pink", "lowpass=f=1100,highpass=f=180,tremolo=f=0.25:d=0.06,volume=0.38"),
  "rain-heavy": () =>
    noiseLoop("rain-heavy", 10, "brown", "lowpass=f=1800,highpass=f=120,tremolo=f=0.4:d=0.1,volume=0.5"),
  "rain-roof": () =>
    noiseLoop("rain-roof", 10, "pink", "lowpass=f=700,highpass=f=250,aecho=0.6:0.55:40:0.25,volume=0.42"),
  "thunder-distant": () =>
    lavfiShot(
      "thunder-distant",
      "anoisesrc=d=2.8:c=brown:a=0.55",
      "lowpass=f=220,aecho=0.85:0.7:180:0.35,volume=0.55",
      2.8,
    ),
  "thunder-close": () =>
    lavfiShot(
      "thunder-close",
      "anoisesrc=d=3.2:c=brown:a=0.75",
      "lowpass=f=380,aecho=0.9:0.8:60:0.5,volume=0.7",
      3.2,
    ),
  "wind-soft": () =>
    noiseLoop("wind-soft", 10, "pink", "highpass=f=120,lowpass=f=900,tremolo=f=0.15:d=0.04,volume=0.3"),
  "wind-gust": () =>
    lavfiShot(
      "wind-gust",
      "anoisesrc=d=2.5:c=pink:a=0.5",
      "highpass=f=200,lowpass=f=1400,afade=t=in:st=0:d=0.4,afade=t=out:st=1.8:d=0.6,volume=0.55",
      2.5,
    ),
  "wind-howling": () =>
    noiseLoop("wind-howling", 10, "pink", "highpass=f=350,lowpass=f=2200,tremolo=f=0.55:d=0.12,volume=0.42"),
  "storm-ambient": () =>
    noiseLoop("storm-ambient", 12, "brown", "lowpass=f=1600,highpass=f=100,tremolo=f=0.35:d=0.08,volume=0.48"),
  "birds-day": () =>
    toneSequence("birds-day", [
      {f: 2800, d: 0.06, v: 0.2},
      {f: 3200, d: 0.05, v: 0.18},
      {f: 2400, d: 0.07, v: 0.16},
      {f: 3000, d: 0.05, v: 0.15},
      {f: 2600, d: 0.06, v: 0.14},
    ]),
  "crickets-night": () =>
    noiseLoop("crickets-night", 8, "pink", "highpass=f=3500,lowpass=f=9000,tremolo=f=18:d=0.35,volume=0.22"),
  owl: () => toneSequence("owl", [{f: 420, d: 0.35, v: 0.4}, {f: 380, d: 0.28, v: 0.32}]),
  "ocean-waves": () =>
    noiseLoop("ocean-waves", 12, "brown", "lowpass=f=500,highpass=f=60,tremolo=f=0.12:d=0.18,volume=0.4"),
  "river-soft": () =>
    noiseLoop("river-soft", 10, "pink", "lowpass=f=900,highpass=f=200,tremolo=f=0.8:d=0.05,volume=0.32"),
  "water-drip": () =>
    lavfiShot("water-drip", "sine=f=880:d=0.04", "aecho=0.9:0.85:120:0.35,volume=0.35,apad=pad_dur=1.2", 1.3),
  "fire-crackle": () =>
    noiseLoop("fire-crackle", 10, "pink", "highpass=f=800,lowpass=f=4500,tremolo=f=6:d=0.2,volume=0.35"),
  "snow-wind": () =>
    noiseLoop("snow-wind", 10, "pink", "highpass=f=400,lowpass=f=1800,tremolo=f=0.2:d=0.06,volume=0.3"),
  "traffic-distant": () =>
    noiseLoop("traffic-distant", 10, "pink", "lowpass=f=600,highpass=f=80,volume=0.28"),
  "traffic-rain": () =>
    noiseLoop("traffic-rain", 10, "brown", "lowpass=f=900,highpass=f=150,tremolo=f=0.3:d=0.07,volume=0.35"),
  "city-night": () =>
    noiseLoop("city-night", 10, "pink", "lowpass=f=1200,highpass=f=100,volume=0.25"),
  "subway-pass": () =>
    lavfiShot(
      "subway-pass",
      "anoisesrc=d=3.5:c=brown:a=0.5",
      "lowpass=f=280,tremolo=f=1.2:d=0.25,afade=t=in:st=0:d=0.5,afade=t=out:st=2.8:d=0.6,volume=0.55",
      3.5,
    ),
  "cafe-murmur": () =>
    noiseLoop("cafe-murmur", 10, "pink", "lowpass=f=1400,highpass=f=200,volume=0.22"),
  "office-hum": () =>
    noiseLoop("office-hum", 10, "pink", "lowpass=f=400,highpass=f=60,volume=0.18"),
  "elevator-ding": () => toneSequence("elevator-ding", [{f: 880, d: 0.12, v: 0.45}, {f: 1320, d: 0.18, v: 0.35}]),
  "siren-distant": () =>
    lavfiShot(
      "siren-distant",
      "sine=f=650:d=2.5",
      "tremolo=f=2.5:d=0.9,lowpass=f=1200,aecho=0.7:0.6:200:0.3,volume=0.45",
      2.5,
    ),
  "construction-distant": () =>
    noiseLoop("construction-distant", 8, "pink", "lowpass=f=500,highpass=f=80,tremolo=f=4:d=0.15,volume=0.2"),
  "door-creak-slow": () =>
    lavfiShot(
      "door-creak-slow",
      "anoisesrc=d=2.2:c=pink:a=0.35",
      "lowpass=f=900,highpass=f=200,tremolo=f=0.4:d=0.5,afade=t=in:st=0:d=0.3,afade=t=out:st=1.6:d=0.5,volume=0.55",
      2.2,
    ),
  "door-creak-fast": () =>
    lavfiShot(
      "door-creak-fast",
      "anoisesrc=d=1.2:c=pink:a=0.4",
      "lowpass=f=1200,highpass=f=300,tremolo=f=1.2:d=0.4,volume=0.5",
      1.2,
    ),
  "door-slam-soft": () =>
    lavfiShot(
      "door-slam-soft",
      "anoisesrc=d=0.35:c=brown:a=0.7",
      "lowpass=f=400,aecho=0.8:0.7:40:0.4,volume=0.6",
      0.8,
    ),
  "door-knock": () =>
    toneSequence("door-knock", [
      {f: 180, d: 0.05, v: 0.55},
      {f: 160, d: 0.05, v: 0.5},
      {f: 170, d: 0.06, v: 0.48},
    ]),
  doorbell: () => toneSequence("doorbell", [{f: 740, d: 0.15, v: 0.4}, {f: 988, d: 0.22, v: 0.38}]),
  "footsteps-wood-slow": () => dualTap("footsteps-wood-slow", 1.8, 550),
  "footsteps-wood-fast": () => dualTap("footsteps-wood-fast", 1.0, 280),
  "footsteps-stairs": () =>
    dualTap("footsteps-stairs", 1.4, 400, "lowpass=f=500,volume=0.65"),
  "footsteps-concrete": () =>
    dualTap("footsteps-concrete", 1.0, 350, "lowpass=f=1200,highpass=f=400,volume=0.6"),
  "floor-creak-1": () =>
    lavfiShot(
      "floor-creak-1",
      "anoisesrc=d=0.9:c=pink:a=0.4",
      "lowpass=f=800,tremolo=f=0.8:d=0.35,volume=0.55",
      0.9,
    ),
  "floor-creak-2": () =>
    lavfiShot(
      "floor-creak-2",
      "anoisesrc=d=0.7:c=pink:a=0.38",
      "lowpass=f=950,tremolo=f=1.1:d=0.4,volume=0.5",
      0.7,
    ),
  "attic-creak": () =>
    lavfiShot(
      "attic-creak",
      "anoisesrc=d=1.4:c=pink:a=0.42",
      "lowpass=f=700,highpass=f=180,tremolo=f=0.5:d=0.45,aecho=0.6:0.5:80:0.25,volume=0.58",
      1.4,
    ),
  "basement-drip": () =>
    lavfiShot(
      "basement-drip",
      "sine=f=920:d=0.03",
      "aecho=0.95:0.9:200:0.45,apad=pad_dur=2.5,volume=0.32",
      2.6,
    ),
  "window-rattle": () =>
    lavfiShot(
      "window-rattle",
      "anoisesrc=d=1.5:c=white:a=0.25",
      "highpass=f=2000,lowpass=f=6000,tremolo=f=8:d=0.4,volume=0.45",
      1.5,
    ),
  "glass-tap": () => toneSequence("glass-tap", [{f: 2200, d: 0.04, v: 0.35}, {f: 1800, d: 0.05, v: 0.28}]),
  "heartbeat-calm": () =>
    lavfiShot(
      "heartbeat-calm",
      "sine=f=55:d=0.12",
      "aecho=0.9:0.85:700:0.45,apad=pad_dur=2,volume=0.55",
      2.2,
    ),
  "heartbeat-fast": () =>
    lavfiShot(
      "heartbeat-fast",
      "sine=f=60:d=0.1",
      "aecho=0.9:0.85:380:0.5,apad=pad_dur=2,volume=0.6",
      2.0,
    ),
  "breath-nervous": () =>
    noiseLoop(
      "breath-nervous",
      2.5,
      "pink",
      "lowpass=f=800,highpass=f=120,tremolo=f=0.5:d=0.2,volume=0.4",
    ),
  gasp: () =>
    lavfiShot(
      "gasp",
      "anoisesrc=d=0.5:c=pink:a=0.5",
      "highpass=f=300,lowpass=f=2500,afade=t=in:st=0:d=0.02,afade=t=out:st=0.25:d=0.2,volume=0.55",
      0.5,
    ),
  "whisper-wind": () =>
    noiseLoop("whisper-wind", 8, "pink", "highpass=f=500,lowpass=f=3000,tremolo=f=0.35:d=0.08,volume=0.22"),
  "scratch-wall": () =>
    lavfiShot(
      "scratch-wall",
      "anoisesrc=d=1.2:c=white:a=0.3",
      "highpass=f=2500,lowpass=f=7000,tremolo=f=12:d=0.5,volume=0.45",
      1.2,
    ),
  "metal-clang-soft": () =>
    toneSequence("metal-clang-soft", [{f: 420, d: 0.08, v: 0.5}, {f: 280, d: 0.2, v: 0.35}]),
  "chain-rattle": () =>
    lavfiShot(
      "chain-rattle",
      "anoisesrc=d=1.0:c=white:a=0.35",
      "highpass=f=1500,lowpass=f=8000,acrusher=level_in=1:level_out=0.65:bits=5,volume=0.48",
      1.0,
    ),
  "static-radio": () =>
    noiseLoop("static-radio", 8, "white", "highpass=f=2000,lowpass=f=8000,volume=0.2"),
  "electric-hum": () =>
    noiseLoop("electric-hum", 8, "pink", "lowpass=f=180,highpass=f=50,tremolo=f=60:d=0.02,volume=0.22"),
  "phone-vibrate": () =>
    lavfiShot(
      "phone-vibrate",
      "sine=f=130:d=0.35",
      "tremolo=f=18:d=0.8,lowpass=f=300,volume=0.5",
      0.4,
    ),
  "dog-bark-distant": () =>
    lavfiShot(
      "dog-bark-distant",
      "sine=f=280:d=0.15",
      "aecho=0.8:0.7:120:0.35,lowpass=f=900,volume=0.4",
      0.6,
    ),
  "dog-bark-close": () =>
    toneSequence("dog-bark-close", [{f: 320, d: 0.12, v: 0.55}, {f: 260, d: 0.1, v: 0.48}]),
  "cat-meow": () => toneSequence("cat-meow", [{f: 520, d: 0.2, v: 0.4}, {f: 680, d: 0.15, v: 0.32}]),
  crow: () => toneSequence("crow", [{f: 380, d: 0.18, v: 0.42}, {f: 320, d: 0.22, v: 0.35}]),
  "mice-scurry": () => dualTap("mice-scurry", 0.5, 120, "highpass=f=3000,volume=0.5"),
  "laughter-distant": () =>
    noiseLoop("laughter-distant", 3, "pink", "lowpass=f=1800,highpass=f=300,tremolo=f=3:d=0.25,volume=0.28"),
  "crowd-murmur": () =>
    noiseLoop("crowd-murmur", 10, "pink", "lowpass=f=1600,highpass=f=180,volume=0.2"),
  "clock-tick": () =>
    lavfiShot(
      "clock-tick",
      "sine=f=1200:d=0.02",
      "aecho=0.95:0.9:1000:0.35,apad=pad_dur=3,volume=0.35",
      3.2,
    ),
  "clock-chime": () => toneSequence("clock-chime", [{f: 660, d: 0.4, v: 0.38}, {f: 880, d: 0.55, v: 0.32}]),
  "room-tone-warm": () =>
    noiseLoop("room-tone-warm", 10, "pink", "lowpass=f=350,highpass=f=40,volume=0.16"),
  "room-tone-cold": () =>
    noiseLoop("room-tone-cold", 10, "pink", "lowpass=f=500,highpass=f=80,volume=0.14"),
  "basement-ambience": () =>
    noiseLoop("basement-ambience", 10, "brown", "lowpass=f=450,highpass=f=50,aecho=0.5:0.45:100:0.2,volume=0.22"),
  "attic-ambience": () =>
    noiseLoop("attic-ambience", 10, "pink", "lowpass=f=700,highpass=f=120,tremolo=f=0.2:d=0.05,volume=0.2"),
  "forest-ambience": () =>
    noiseLoop("forest-ambience", 10, "pink", "lowpass=f=1200,highpass=f=100,volume=0.24"),
  "park-ambience": () =>
    noiseLoop("park-ambience", 10, "pink", "lowpass=f=1400,highpass=f=120,volume=0.22"),
  "yard-night": () =>
    noiseLoop("yard-night", 10, "pink", "lowpass=f=900,highpass=f=80,volume=0.22"),
  "kitchen-hum": () =>
    noiseLoop("kitchen-hum", 8, "pink", "lowpass=f=300,highpass=f=50,tremolo=f=40:d=0.02,volume=0.16"),
  "kettle-boil": () =>
    noiseLoop("kettle-boil", 8, "pink", "highpass=f=800,lowpass=f=4000,tremolo=f=2:d=0.15,volume=0.24"),
  "typing-distant": () => dualTap("typing-distant", 4.2, 450, "highpass=f=2000,volume=0.3"),
  "drizzle-soft": () =>
    noiseLoop("drizzle-soft", 10, "pink", "lowpass=f=900,highpass=f=200,tremolo=f=0.2:d=0.04,volume=0.3"),
  "hail-rattle": () =>
    noiseLoop("hail-rattle", 8, "white", "highpass=f=2000,lowpass=f=8000,tremolo=f=5:d=0.2,volume=0.35"),
  "fog-damp": () =>
    noiseLoop("fog-damp", 10, "brown", "lowpass=f=500,highpass=f=80,volume=0.24"),
  "car-pass-distant": () =>
    lavfiShot(
      "car-pass-distant",
      "anoisesrc=d=1.8:c=pink:a=0.45",
      "lowpass=f=700,afade=t=in:st=0:d=0.2,afade=t=out:st=1.4:d=0.35,volume=0.45",
      1.8,
    ),
  "car-interior-hum": () =>
    noiseLoop("car-interior-hum", 8, "pink", "lowpass=f=350,highpass=f=60,tremolo=f=0.3:d=0.05,volume=0.2"),
  "bus-idle": () =>
    noiseLoop("bus-idle", 8, "brown", "lowpass=f=280,highpass=f=50,tremolo=f=0.8:d=0.1,volume=0.22"),
  "train-distant": () =>
    lavfiShot(
      "train-distant",
      "anoisesrc=d=3:c=brown:a=0.5",
      "lowpass=f=300,tremolo=f=1.5:d=0.3,aecho=0.7:0.6:150:0.3,volume=0.4",
      3,
    ),
  "airplane-distant": () =>
    lavfiShot(
      "airplane-distant",
      "anoisesrc=d=2.5:c=pink:a=0.35",
      "lowpass=f=900,highpass=f=200,afade=t=in:st=0:d=0.5,afade=t=out:st=1.8:d=0.5,volume=0.35",
      2.5,
    ),
  "bicycle-bell": () => toneSequence("bicycle-bell", [{f: 1200, d: 0.08, v: 0.35}, {f: 1500, d: 0.1, v: 0.3}]),
  "hospital-hall": () =>
    noiseLoop("hospital-hall", 10, "pink", "lowpass=f=800,highpass=f=120,volume=0.18"),
  "school-hallway": () =>
    noiseLoop("school-hallway", 10, "pink", "lowpass=f=1200,highpass=f=150,volume=0.2"),
  "supermarket": () =>
    noiseLoop("supermarket", 10, "pink", "lowpass=f=1400,highpass=f=180,volume=0.2"),
  "restaurant-ambience": () =>
    noiseLoop("restaurant-ambience", 10, "pink", "lowpass=f=1500,highpass=f=200,volume=0.22"),
  "bar-murmur": () =>
    noiseLoop("bar-murmur", 10, "pink", "lowpass=f=1200,highpass=f=180,tremolo=f=0.5:d=0.08,volume=0.24"),
  "library-quiet": () =>
    noiseLoop("library-quiet", 10, "pink", "lowpass=f=600,highpass=f=80,volume=0.12"),
  "shower-running": () =>
    noiseLoop("shower-running", 8, "pink", "highpass=f=500,lowpass=f=3500,tremolo=f=1.5:d=0.1,volume=0.28"),
  "pool-splashes": () =>
    noiseLoop("pool-splashes", 8, "pink", "highpass=f=400,lowpass=f=2500,tremolo=f=2:d=0.15,volume=0.26"),
  "leaves-rustle": () =>
    noiseLoop("leaves-rustle", 10, "pink", "highpass=f=300,lowpass=f=2000,tremolo=f=0.4:d=0.08,volume=0.26"),
  "waterfall-soft": () =>
    noiseLoop("waterfall-soft", 10, "brown", "lowpass=f=1200,highpass=f=200,volume=0.28"),
  "campfire-night": () =>
    noiseLoop("campfire-night", 10, "pink", "highpass=f=600,lowpass=f=4000,tremolo=f=4:d=0.2,volume=0.26"),
  "meadow-wind": () =>
    noiseLoop("meadow-wind", 10, "pink", "highpass=f=150,lowpass=f=1100,tremolo=f=0.2:d=0.05,volume=0.22"),
  "keys-jingle": () =>
    toneSequence("keys-jingle", [{f: 2200, d: 0.03, v: 0.3}, {f: 1800, d: 0.04, v: 0.28}, {f: 2400, d: 0.03, v: 0.26}]),
  "lock-click": () => toneSequence("lock-click", [{f: 420, d: 0.04, v: 0.4}, {f: 280, d: 0.06, v: 0.32}]),
  "drawer-creak": () =>
    lavfiShot(
      "drawer-creak",
      "anoisesrc=d=0.8:c=pink:a=0.35",
      "lowpass=f=900,tremolo=f=1:d=0.35,volume=0.45",
      0.8,
    ),
  "dishes-clink": () =>
    toneSequence("dishes-clink", [{f: 1800, d: 0.04, v: 0.3}, {f: 2200, d: 0.03, v: 0.28}]),
  "microwave-beep": () => toneSequence("microwave-beep", [{f: 1100, d: 0.12, v: 0.35}, {f: 1100, d: 0.12, v: 0.32}]),
  "washing-machine": () =>
    noiseLoop("washing-machine", 8, "brown", "lowpass=f=400,highpass=f=80,tremolo=f=1.2:d=0.2,volume=0.2"),
  "cough-short": () =>
    lavfiShot(
      "cough-short",
      "anoisesrc=d=0.35:c=pink:a=0.4",
      "lowpass=f=1200,highpass=f=200,afade=t=out:st=0.15:d=0.15,volume=0.45",
      0.35,
    ),
  sigh: () =>
    lavfiShot(
      "sigh",
      "anoisesrc=d=0.6:c=pink:a=0.35",
      "lowpass=f=700,highpass=f=120,afade=t=in:st=0:d=0.05,afade=t=out:st=0.35:d=0.2,volume=0.35",
      0.6,
    ),
  "laugh-soft": () =>
    noiseLoop("laugh-soft", 2, "pink", "lowpass=f=1800,highpass=f=300,tremolo=f=3:d=0.25,volume=0.28"),
  "cry-distant": () =>
    lavfiShot(
      "cry-distant",
      "sine=f=420:d=0.25",
      "tremolo=f=5:d=0.4,aecho=0.8:0.7:180:0.35,lowpass=f=900,volume=0.3",
      0.8,
    ),
  "computer-fan": () =>
    noiseLoop("computer-fan", 8, "pink", "lowpass=f=500,highpass=f=100,tremolo=f=30:d=0.02,volume=0.16"),
  "notification-ding": () => toneSequence("notification-ding", [{f: 880, d: 0.1, v: 0.32}, {f: 1175, d: 0.14, v: 0.28}]),
  "tv-muffled": () =>
    noiseLoop("tv-muffled", 8, "pink", "lowpass=f=900,highpass=f=200,volume=0.18"),
  "cat-purr": () =>
    noiseLoop("cat-purr", 6, "pink", "lowpass=f=300,highpass=f=60,tremolo=f=8:d=0.35,volume=0.22"),
  "frog-night": () =>
    toneSequence("frog-night", [{f: 280, d: 0.12, v: 0.28}, {f: 320, d: 0.1, v: 0.24}, {f: 300, d: 0.11, v: 0.22}]),
  "horror-drone-low": () =>
    noiseLoop("horror-drone-low", 12, "brown", "lowpass=f=180,highpass=f=40,tremolo=f=0.15:d=0.2,volume=0.22"),
  "wind-chimes": () =>
    toneSequence("wind-chimes", [{f: 1400, d: 0.2, v: 0.22}, {f: 1760, d: 0.18, v: 0.2}, {f: 1200, d: 0.22, v: 0.18}]),
  "crowd-cheer-distant": () =>
    noiseLoop("crowd-cheer-distant", 3, "pink", "lowpass=f=1600,highpass=f=250,tremolo=f=2:d=0.3,volume=0.3"),
  "neon-hum": () =>
    noiseLoop("neon-hum", 8, "pink", "highpass=f=1200,lowpass=f=5000,tremolo=f=60:d=0.03,volume=0.18"),
  printer: () =>
    lavfiShot(
      "printer",
      "anoisesrc=d=1.2:c=white:a=0.3",
      "highpass=f=1500,lowpass=f=6000,tremolo=f=8:d=0.4,volume=0.4",
      1.2,
    ),
  "phone-ring": () =>
    toneSequence("phone-ring", [{f: 440, d: 0.2, v: 0.35}, {f: 480, d: 0.2, v: 0.35}, {f: 440, d: 0.2, v: 0.32}]),
  "alley-echo": () =>
    noiseLoop("alley-echo", 10, "pink", "lowpass=f=900,highpass=f=120,aecho=0.5:0.45:120:0.25,volume=0.22"),
  "market-murmur": () =>
    noiseLoop("market-murmur", 10, "pink", "lowpass=f=1500,highpass=f=200,volume=0.22"),
  "church-bells-distant": () =>
    toneSequence("church-bells-distant", [{f: 520, d: 0.5, v: 0.35}, {f: 660, d: 0.55, v: 0.3}]),
  "toilet-flush": () =>
    lavfiShot(
      "toilet-flush",
      "anoisesrc=d=2:c=pink:a=0.4",
      "lowpass=f=1200,highpass=f=200,afade=t=in:st=0:d=0.1,afade=t=out:st=1.6:d=0.3,volume=0.45",
      2,
    ),
  "garage-door": () =>
    lavfiShot(
      "garage-door",
      "anoisesrc=d=2.5:c=brown:a=0.45",
      "lowpass=f=500,tremolo=f=0.6:d=0.3,volume=0.45",
      2.5,
    ),
  sprinkler: () =>
    noiseLoop("sprinkler", 8, "pink", "highpass=f=400,lowpass=f=2500,tremolo=f=3:d=0.2,volume=0.24"),
  "vacuum-cleaner": () =>
    noiseLoop("vacuum-cleaner", 8, "brown", "lowpass=f=700,highpass=f=120,tremolo=f=2:d=0.15,volume=0.24"),
  "baby-cry-distant": () =>
    lavfiShot(
      "baby-cry-distant",
      "sine=f=520:d=0.3",
      "tremolo=f=6:d=0.5,aecho=0.8:0.7:150:0.35,lowpass=f=1000,volume=0.28",
      1.0,
    ),
};

let generated = 0;
const failed = [];
for (const item of SFX_CATALOG) {
  const recipe = RECIPES[item.id];
  if (!recipe) {
    console.warn(`Нет рецепта для ${item.id}, пропуск`);
    failed.push(item.id);
    continue;
  }
  try {
    recipe();
    generated += 1;
  } catch (error) {
    failed.push(item.id);
    console.warn(`Ошибка ${item.id}:`, error instanceof Error ? error.message : String(error));
  }
}

const catalogExport = {
  version: SFX_CATALOG_VERSION,
  generatedAt: new Date().toISOString(),
  items: SFX_CATALOG.map((item) => ({
    ...item,
    path: `sfx/${item.id}.wav`,
  })),
};

writeFileSync(catalogJsonPath, `${JSON.stringify(catalogExport, null, 2)}\n`, "utf8");
writeFileSync(path.join(outDir, "catalog.json"), `${JSON.stringify(catalogExport, null, 2)}\n`, "utf8");

console.log(`SFX: ${generated}/${SFX_CATALOG.length} → public/sfx/`);
if (failed.length > 0) {
  console.warn(`Не удалось: ${failed.join(", ")}`);
}
console.log(`Каталог: ${catalogJsonPath}`);
