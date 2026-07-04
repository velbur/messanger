#!/usr/bin/env python3
"""
Запекает 3D-photo parallax-loop из одной картинки + depth-карты.

Идея (почему так, а не CSS-слои в Remotion):
  - фон inpaint'ится (передний план вырезается и заполняется) → когда ближний
    план сдвигается, за ним виден реальный фон, а не «двоение лица»;
  - смещение по-пиксельное, пропорционально глубине (а не жёсткий translate
    cutout-слоёв) → нет halo и ступенек на силуэте;
  - камера: `motion: "linear"` — одно плавное движение 0→1 за всю длину клипа;
    `motion: "loop"` — sin(2π·t) для бесшовного 3 с цикла (legacy);
  - всё запекается в MP4 → в Remotion остаётся только проиграть видео (быстро,
    без WebGL, не трогает путь рендера Veo/Ken Burns).

Вход — JSON из stdin:
  {
    "jobs": [
      {
        "image": "/abs/story-opening.png",
        "depth_raw": "/abs/depth.raw",      # опц.: 8 байт (w,h BE) + w*h uint8
        "out_video": "/abs/story-opening.parallax.mp4",
        "out_depth": "/abs/story-opening.depth.png",  # опц.: для verify/масок
        "frames": 90,
        "fps": 30,
        "amplitude_px": 30.0
      }
    ]
  }
Выход — JSON в stdout: {"ok": true, "results": [...]}.
"""
import json
import os
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
import cv2
from PIL import Image


def log(msg: str) -> None:
    sys.stderr.write(f"[parallax_bake] {msg}\n")
    sys.stderr.flush()


def read_depth_raw(path: str):
    with open(path, "rb") as handle:
        buf = handle.read()
    if len(buf) < 8:
        raise ValueError(f"Повреждён depth raw: {path}")
    w, h = struct.unpack(">II", buf[:8])
    expected = 8 + w * h
    if len(buf) < expected:
        raise ValueError(f"Depth raw size mismatch: {path}")
    arr = np.frombuffer(buf[8 : 8 + w * h], dtype=np.uint8).reshape(h, w)
    return arr.copy(), w, h


def compute_depth_torch(image_path: str):
    """Fallback: посчитать depth прямо тут (нужен torch+transformers)."""
    import torch  # noqa: WPS433
    from transformers import pipeline  # noqa: WPS433

    if torch.cuda.is_available():
        device, dtype = 0, torch.float16
        model = os.environ.get("STORY_DEPTH_V2_MODEL", "depth-anything/Depth-Anything-V2-Large-hf")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device, dtype = "mps", torch.float32
        model = os.environ.get("STORY_DEPTH_V2_MODEL", "depth-anything/Depth-Anything-V2-Large-hf")
    else:
        device, dtype = -1, torch.float32
        model = os.environ.get("STORY_DEPTH_V2_MODEL", "depth-anything/Depth-Anything-V2-Small-hf")

    pipe = pipeline("depth-estimation", model=model, device=device, torch_dtype=dtype)
    pil = Image.open(image_path).convert("RGB")
    w, h = pil.size
    out = pipe(pil)
    depth = out["depth"]
    if depth.size != (w, h):
        depth = depth.resize((w, h), Image.BILINEAR)
    arr = np.array(depth, dtype=np.float32)
    d_min, d_max = float(arr.min()), float(arr.max())
    if d_max - d_min < 1e-6:
        normed = np.zeros(arr.shape, dtype=np.uint8)
    else:
        normed = ((arr - d_min) / (d_max - d_min) * 255.0).astype(np.uint8)
    return normed, w, h


def load_mask_raw(path, w: int, h: int):
    """Маска-raw (тот же формат, что depth) → float[0..1], resize + мягкий blur."""
    if not path or not os.path.exists(path):
        return None
    arr, mw, mh = read_depth_raw(path)
    if (mw, mh) != (w, h):
        arr = cv2.resize(arr, (w, h), interpolation=cv2.INTER_LINEAR)
    m = arr.astype(np.float32) / 255.0
    m = cv2.GaussianBlur(m, (0, 0), sigmaX=max(1.0, min(w, h) * 0.006))
    return np.clip(m, 0.0, 1.0)


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    span = max(edge1 - edge0, 1e-6)
    t = np.clip((x - edge0) / span, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def guided_filter(guide: np.ndarray, src: np.ndarray, radius: int, eps: float) -> np.ndarray:
    """Edge-aware сглаживание (He et al.): src выравнивается по краям guide.

    Привязывает разрывы depth к реальным контурам картинки → силуэты не «плывут»
    при parallax-сдвиге. Реализация через box-фильтры — без opencv-contrib.
    """
    r = max(1, int(radius))
    ksize = (2 * r + 1, 2 * r + 1)
    mean_i = cv2.boxFilter(guide, cv2.CV_32F, ksize)
    mean_p = cv2.boxFilter(src, cv2.CV_32F, ksize)
    mean_ip = cv2.boxFilter(guide * src, cv2.CV_32F, ksize)
    cov_ip = mean_ip - mean_i * mean_p
    mean_ii = cv2.boxFilter(guide * guide, cv2.CV_32F, ksize)
    var_i = mean_ii - mean_i * mean_i
    a = cov_ip / (var_i + eps)
    b = mean_p - a * mean_i
    mean_a = cv2.boxFilter(a, cv2.CV_32F, ksize)
    mean_b = cv2.boxFilter(b, cv2.CV_32F, ksize)
    return mean_a * guide + mean_b


def prepare_depth(depth_u8: np.ndarray, w: int, h: int, guide_rgb: np.ndarray = None) -> np.ndarray:
    """uint8 depth → float[0..1], растянуть по перцентилям, сгладить (near=1)."""
    d = depth_u8.astype(np.float32)
    lo = float(np.percentile(d, 2))
    hi = float(np.percentile(d, 98))
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0.0, 1.0)

    # Bilateral выравнивает глубину внутри объектов (лиц) и сохраняет границы.
    # Обычный GaussianBlur делает из объектов "холмы" → они «плывут» при сдвиге.
    d_8u = (d * 255).astype(np.uint8)
    d_8u = cv2.bilateralFilter(d_8u, d=7, sigmaColor=45, sigmaSpace=45)
    d = d_8u.astype(np.float32) / 255.0

    # Guided filter привязывает разрывы глубины к контурам самой картинки —
    # силуэт переднего плана перестаёт «резинить» при parallax-warp.
    if guide_rgb is not None:
        try:
            guide = cv2.cvtColor(guide_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
            radius = max(2, int(min(w, h) * 0.012))
            d = guided_filter(guide, d, radius, eps=1.2e-3)
            d = np.clip(d, 0.0, 1.0)
        except Exception as error:  # noqa: BLE001
            log(f"guided_filter пропущен: {error}")
    return d


def compress_displacement(disp: np.ndarray) -> np.ndarray:
    """Сжать крайние значения глубины — меньше растяжки на ближнем плане.

    Мягче колено (1.8 вместо 1.9) + чуть больше хода (0.48): средние планы
    получают больше объёма, экстремумы всё ещё зажаты → без смаза по краям.
    """
    return np.tanh(disp * 1.8) * 0.48


def camera_phase(t: float) -> float:
    """Ease по времени: камера медленнее на разворотах."""
    return t * t * (3.0 - 2.0 * t)


def scene_sweep_phase(t: float, sweep: str = "round-trip") -> float:
    """Профиль движения камеры по длине клипа."""
    if sweep in ("forward", "one-way"):
        return camera_phase(t)
    tri = t * 2.0 if t < 0.5 else 2.0 - t * 2.0
    return camera_phase(tri)


def region_mask(weight: np.ndarray, w: int, h: int, thr: float = 0.4) -> np.ndarray:
    """Бинарная (расширенная) маска зоны, занятой слоем — для inpaint позади."""
    mask = (weight > thr).astype(np.uint8) * 255
    dilate = max(3, int(min(w, h) * 0.012))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate, dilate))
    return cv2.dilate(mask, kernel)


def inpaint_rgb(img_rgb: np.ndarray, mask_u8: np.ndarray, w: int, h: int) -> np.ndarray:
    """Заполнить закрытую (mask) область цветом соседнего фона (Telea)."""
    radius = max(4, int(min(w, h) * 0.02))
    bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    filled = cv2.inpaint(bgr, mask_u8, radius, cv2.INPAINT_TELEA)
    return cv2.cvtColor(filled, cv2.COLOR_BGR2RGB)


def inpaint_depth(depth: np.ndarray, mask_u8: np.ndarray, w: int, h: int) -> np.ndarray:
    """Заполнить глубину под закрытой областью и мягко сгладить."""
    d8 = (np.clip(depth, 0, 1) * 255).astype(np.uint8)
    radius = max(4, int(min(w, h) * 0.02))
    filled = cv2.inpaint(d8, mask_u8, radius, cv2.INPAINT_TELEA).astype(np.float32) / 255.0
    sigma = max(1.0, min(w, h) * 0.01)
    return cv2.GaussianBlur(filled, (0, 0), sigmaX=sigma, sigmaY=sigma)


def build_layers(img: np.ndarray, depth: np.ndarray, w: int, h: int):
    """LDI-декомпозиция на 3 плоскости near/mid/far (back→front).

    Модель «непрозрачных листов» с over-композитингом:
      - far  — сплошной фон (alpha=1), RGB = картинка с закрашенными near+mid;
      - mid  — перекрывает far в зоне «mid или ближе», RGB = картинка без near;
      - near — только ближний план, RGB = оригинал.
    За каждым слоем свои inpaint'нутые RGB и depth, поэтому при parallax-сдвиге
    открывается корректно заполненный слой позади, а не одна общая «замазка».
    """
    b_far = float(np.percentile(depth, 42))
    b_near = float(np.percentile(depth, 74))
    if b_near - b_far < 0.08:  # низкий контраст глубины — раздвинуть границы
        mid = 0.5 * (b_far + b_near)
        b_far, b_near = mid - 0.06, mid + 0.06
    feather = max(0.03, (b_near - b_far) * 0.4)

    a_far = np.ones((h, w), np.float32)
    a_mid = smoothstep(b_far - feather, b_far + feather, depth).astype(np.float32)
    a_near = smoothstep(b_near - feather, b_near + feather, depth).astype(np.float32)
    fea = max(1.0, min(w, h) * 0.004)
    a_mid = np.clip(cv2.GaussianBlur(a_mid, (0, 0), sigmaX=fea, sigmaY=fea), 0.0, 1.0)
    a_near = np.clip(cv2.GaussianBlur(a_near, (0, 0), sigmaX=fea, sigmaY=fea), 0.0, 1.0)

    near_region = region_mask(a_near, w, h, 0.4)
    mid_region = region_mask(a_mid, w, h, 0.4)
    far_hidden = cv2.max(near_region, mid_region)

    mid_rgb = inpaint_rgb(img, near_region, w, h)
    far_rgb = inpaint_rgb(img, far_hidden, w, h)
    mid_depth = inpaint_depth(depth, near_region, w, h)
    far_depth = inpaint_depth(depth, far_hidden, w, h)

    return [
        {"rgb": far_rgb, "alpha": a_far, "depth": far_depth, "gain": 0.6, "opaque": True},
        {"rgb": mid_rgb, "alpha": a_mid, "depth": mid_depth, "gain": 0.82, "opaque": False},
        {"rgb": img, "alpha": a_near, "depth": depth, "gain": 1.0, "opaque": False},
    ]


def build_alive_masks(img_rgb: np.ndarray, depth: np.ndarray, w: int, h: int, seed: int = 12345):
    """Эвристические маски «оживляемых» зон (вариант A, без сегментации).

    - vegetation: зелёный оттенок + высокочастотная текстура (листья/трава/плющ),
      чтобы гладкие зелёные поверхности (машина, стена) не «дышали»;
    - sky: верх кадра + дальняя глубина + голубой/светлый малонасыщенный цвет.
    Возвращает (veg_mask, sky_mask, phase) — все float[h,w], phase для разнофазного
    покачивания листвы.
    """
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    hue = hsv[..., 0].astype(np.float32)  # 0..179
    sat = hsv[..., 1].astype(np.float32) / 255.0
    val = hsv[..., 2].astype(np.float32) / 255.0

    veg = ((hue >= 30) & (hue <= 95) & (sat > 0.18) & (val > 0.12)).astype(np.float32)
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    lap = np.abs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3))
    tex = cv2.GaussianBlur(lap, (0, 0), sigmaX=max(1.0, min(w, h) * 0.008))
    # нормировка по перцентилю (не max) — резкие края окон/стен не «съедают»
    # текстуру листвы. Текстурный гейт отделяет листья от гладкой зелени (машина).
    tex = tex / (float(np.percentile(tex, 96)) + 1e-6)
    veg = veg * np.clip(tex * 1.3, 0.0, 1.0)
    veg = cv2.GaussianBlur(veg, (0, 0), sigmaX=max(1.0, min(w, h) * 0.006))

    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    top = np.clip(1.0 - yy / 0.55, 0.0, 1.0)  # вес верхней части кадра
    blue = ((hue >= 95) & (hue <= 135)).astype(np.float32)
    bright = ((val > 0.6) & (sat < 0.35)).astype(np.float32)
    far = np.clip((0.5 - depth) / 0.5, 0.0, 1.0)  # дальняя плоскость = низкая глубина
    sky = np.clip(blue + bright, 0.0, 1.0) * top * far
    sky = cv2.GaussianBlur(sky, (0, 0), sigmaX=max(1.0, min(w, h) * 0.01))

    rng = np.random.default_rng(seed)
    coarse = rng.random((max(2, h // 48), max(2, w // 48))).astype(np.float32)
    phase = cv2.resize(coarse, (w, h), interpolation=cv2.INTER_CUBIC)

    return np.clip(veg, 0.0, 1.0), np.clip(sky, 0.0, 1.0), phase


def warp_rigid(src: np.ndarray, base_x, base_y, shift_x: float, shift_y: float):
    """Сдвиг слоя целиком — без depth-warp (лица и предметы не тянутся)."""
    map_x = (base_x - shift_x).astype(np.float32)
    map_y = (base_y - shift_y).astype(np.float32)
    warped = cv2.remap(src, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return warped, map_x, map_y

def warp_layer(src: np.ndarray, depth_layer: np.ndarray, base_x, base_y, focus, ox, oy,
               mdx=None, mdy=None):
    """Backward-warp по глубине: pixel сэмплится из src со смещением (d-focus)*offset.

    Два прохода уточняют глубину в точке сэмпла → меньше «тянучки» на разрывах.
    mdx/mdy — доп. поле смещения (procedural motion: листва/небо) в render-пикселях.
    """
    disp = compress_displacement(depth_layer - focus)
    map_x = (base_x - disp * ox).astype(np.float32)
    map_y = (base_y - disp * oy).astype(np.float32)
    for _ in range(2):
        d_at = cv2.remap(
            depth_layer, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
        )
        disp = compress_displacement(d_at - focus)
        map_x = (base_x - disp * ox).astype(np.float32)
        map_y = (base_y - disp * oy).astype(np.float32)
    if mdx is not None:
        map_x = (map_x - mdx).astype(np.float32)
        map_y = (map_y - mdy).astype(np.float32)
    # INTER_CUBIC для цвета — чётче при zoom/overscan; карты глубины/alpha ниже
    # сэмплятся линейно (кубик там даёт ringing на краях маски).
    warped = cv2.remap(src, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    return warped, map_x, map_y


def make_motes(seed: int, count: int, w: int, h: int):
    """Облако пылинок в 3D-пространстве сцены (для объёмного parallax)."""
    rng = np.random.default_rng(seed)
    scale = min(w, h) / 720.0
    # больше частиц в верхней части кадра (небо/воздух) — на лицах их depth-occlusion режет
    by = rng.uniform(0, h * 0.82, count)
    by = np.where(rng.random(count) < 0.35, rng.uniform(h * 0.55, h, count), by)
    return {
        "bx": rng.uniform(0, w, count),
        "by": by,
        "dm": np.clip(rng.beta(1.4, 2.2, count) * 0.48 + 0.36, 0.34, 0.86),
        "drift": rng.uniform(5.0, 18.0, count) * scale,
        "phase": rng.uniform(0, 2 * np.pi, count),
        "tphase": rng.uniform(0, 2 * np.pi, count),
        "radius": rng.uniform(1.8, 5.5, count) * scale,
        "bright": rng.uniform(0.65, 1.0, count),
        "harmonic": rng.integers(1, 3, count).astype(np.float32),
    }


def stamp_soft(buf: np.ndarray, cx: float, cy: float, radius: float, value: float) -> None:
    """Мягкая гауссова точка в аккумулятор (с обрезкой по краям)."""
    if value <= 0.0:
        return
    rad = max(0.6, radius)
    size = int(np.ceil(rad * 3))
    h, w = buf.shape
    ix, iy = int(np.floor(cx)), int(np.floor(cy))
    x0, x1 = ix - size, ix + size + 1
    y0, y1 = iy - size, iy + size + 1
    if x1 <= 0 or y1 <= 0 or x0 >= w or y0 >= h:
        return
    xa, xb = max(0, x0), min(w, x1)
    ya, yb = max(0, y0), min(h, y1)
    xs = np.arange(xa, xb) - cx
    ys = np.arange(ya, yb) - cy
    gx = np.exp(-(xs * xs) / (2.0 * rad * rad))
    gy = np.exp(-(ys * ys) / (2.0 * rad * rad))
    buf[ya:yb, xa:xb] += np.outer(gy, gx) * value


def even_encode_dim(n: int) -> int:
    """libx264 + yuv420p требуют чётные ширину и высоту."""
    return max(2, n - (n % 2))


def crop_to_even(img: np.ndarray) -> tuple[np.ndarray, int, int]:
    h, w = img.shape[:2]
    ew, eh = even_encode_dim(w), even_encode_dim(h)
    if ew != w or eh != h:
        img = img[:eh, :ew]
    return img, ew, eh


def open_ffmpeg(out_video: str, w: int, h: int, fps: int):
    ffmpeg = os.environ.get("FFMPEG_BIN", "ffmpeg")
    Path(out_video).parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "-",
        "-an",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
        "-preset", "medium", "-movflags", "+faststart",
        out_video,
    ]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def bake_one(job: dict) -> dict:
    image_path = job["image"]
    out_video = job["out_video"]
    frames = int(job.get("frames", 90))
    fps = int(job.get("fps", 30))
    amp = float(job.get("amplitude_px", 30.0))
    pan_x = float(job.get("pan_x", 1.0))
    pan_y = float(job.get("pan_y", -1.0))
    # Глубинно-зависимые эффекты (усиливают ощущение 3D)
    dof_strength = float(job.get("dof_strength", 0.6))
    haze_strength = float(job.get("haze_strength", 0.07))
    dust_count = int(job.get("dust_count", 130))
    dust_strength = float(job.get("dust_strength", 1.0))
    effect_seed = int(job.get("effect_seed", 12345))
    zoom_frac = float(job.get("zoom_frac", 0.028))
    hold_handoff = bool(job.get("hold_handoff", False))
    pan_y_gain = float(job.get("pan_y_gain", 0.18))
    oscillations = float(job.get("oscillations", 4.0))
    motion = str(job.get("motion", "linear"))
    sweep = str(job.get("sweep", "round-trip"))
    # Supersample: варп/композитинг в N× разрешении, downscale INTER_AREA → чистые края
    supersample = float(job.get("supersample", 1.0))
    supersample = min(2.0, max(1.0, supersample))
    # Procedural «оживление»: листва качается, небо дрейфует, вода мерцает.
    # Маски приходят из семантической сегментации (вариант B); при их отсутствии —
    # эвристика по цвету (вариант A, fallback).
    alive_motion = bool(job.get("alive_motion", False))
    alive_veg_frac = float(job.get("alive_veg_frac", 0.006))
    alive_sky_frac = float(job.get("alive_sky_frac", 0.012))
    alive_water_frac = float(job.get("alive_water_frac", 0.004))
    alive_veg_cycles = float(job.get("alive_veg_cycles", 3.5))
    veg_mask_raw = job.get("veg_mask_raw")
    sky_mask_raw = job.get("sky_mask_raw")
    water_mask_raw = job.get("water_mask_raw")

    img = np.array(Image.open(image_path).convert("RGB"))
    img, w, h = crop_to_even(img)

    depth_raw = job.get("depth_raw")
    if depth_raw and os.path.exists(depth_raw):
        depth_u8, dw, dh = read_depth_raw(depth_raw)
        if (dw, dh) != (w, h):
            depth_u8 = cv2.resize(depth_u8, (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        depth_u8, dw, dh = compute_depth_torch(image_path)
        if (dw, dh) != (w, h):
            depth_u8 = cv2.resize(depth_u8, (w, h), interpolation=cv2.INTER_LINEAR)

    # Глубина считается в выходном разрешении (для out_depth и границ слоёв)
    depth = prepare_depth(depth_u8, w, h, guide_rgb=img)

    out_depth = job.get("out_depth")
    if out_depth:
        Path(out_depth).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(out_depth, (np.clip(depth, 0, 1) * 255).astype(np.uint8))

    # Supersample: варп/композитинг в render-разрешении rw×rh, downscale перед энкодом
    rw = even_encode_dim(int(round(w * supersample)))
    rh = even_encode_dim(int(round(h * supersample)))
    if (rw, rh) != (w, h):
        img_r = cv2.resize(img, (rw, rh), interpolation=cv2.INTER_CUBIC)
        depth_r = cv2.resize(depth, (rw, rh), interpolation=cv2.INTER_LINEAR)
    else:
        img_r, depth_r = img, depth
    scale = rw / float(w)
    amp_r = amp * scale  # смещения — в render-пикселях

    layers = build_layers(img_r, depth_r, rw, rh)
    focus = float(np.percentile(depth_r, 50))

    # Маски «живых» зон + амплитуды в render-пикселях
    veg_mask = sky_mask = water_mask = veg_phase = None
    veg_amp_px = sky_amp_px = water_amp_px = 0.0
    has_alive = False
    if alive_motion:
        # Вариант B: маски из семантической сегментации (raw-файлы).
        veg_mask = load_mask_raw(veg_mask_raw, rw, rh)
        sky_mask = load_mask_raw(sky_mask_raw, rw, rh)
        water_mask = load_mask_raw(water_mask_raw, rw, rh)
        if veg_mask is None and sky_mask is None and water_mask is None:
            # Вариант A (fallback): эвристика по цвету.
            veg_mask, sky_mask, veg_phase = build_alive_masks(img_r, depth_r, rw, rh, effect_seed)
        if veg_phase is None:
            rng = np.random.default_rng(effect_seed)
            coarse = rng.random((max(2, rh // 48), max(2, rw // 48))).astype(np.float32)
            veg_phase = cv2.resize(coarse, (rw, rh), interpolation=cv2.INTER_CUBIC)
        if veg_mask is None:
            veg_mask = np.zeros((rh, rw), np.float32)
        if sky_mask is None:
            sky_mask = np.zeros((rh, rw), np.float32)
        if water_mask is None:
            water_mask = np.zeros((rh, rw), np.float32)
        veg_amp_px = alive_veg_frac * min(rw, rh)
        sky_amp_px = alive_sky_frac * rw
        water_amp_px = alive_water_frac * min(rw, rh)
        has_alive = (
            float(veg_mask.max()) > 0.02
            or float(sky_mask.max()) > 0.02
            or float(water_mask.max()) > 0.02
        )

    # overscan: запас под parallax-смещение + опциональный зум
    overscan_gain = 1.65 if motion == "linear" else 1.5
    zoom_overscan = 1.0 + (amp_r / max(rw, rh)) * overscan_gain
    cx, cy = (rw - 1) / 2.0, (rh - 1) / 2.0
    grid_y, grid_x = np.mgrid[0:rh, 0:rw].astype(np.float32)

    # Depth-of-field / aerial haze считаем по «дальности» от фокальной плоскости
    focus_span = max(focus, 1e-3)
    dof_sigma = max(1.0, min(rw, rh) * 0.013)
    # тёплый ambient для дымки — берём из ярких (ламповых) пикселей
    ambient = np.clip(np.percentile(img_r.reshape(-1, 3), 85, axis=0), 0, 255).astype(np.float32)
    dust_tint = np.array([1.0, 0.96, 0.86], dtype=np.float32)
    dust_gain = 38.0

    motes = make_motes(effect_seed, dust_count, rw, rh) if dust_count > 0 else None
    downscale = (rw, rh) != (w, h)

    proc = open_ffmpeg(out_video, w, h, fps)
    two_pi = 2.0 * np.pi
    linear = motion == "linear"
    try:
        for i in range(frames):
            if linear:
                t = i / max(frames - 1, 1)
                if hold_handoff and sweep == "oscillate":
                    # t=0 → 0 (стык с Veo), далее sin: влево-вправо-влево…
                    sweep_val = float(np.sin(two_pi * oscillations * t))
                    zoom = 1.0 + zoom_frac * t
                    ox = amp_r * pan_x * sweep_val
                    oy = amp_r * pan_y * pan_y_gain * abs(sweep_val)
                elif hold_handoff and sweep in ("forward", "one-way"):
                    sweep_val = t
                    zoom_end = zoom_overscan + zoom_frac
                    zoom = 1.0 + (zoom_end - 1.0) * sweep_val
                    ox = amp_r * pan_x * sweep_val
                    oy = amp_r * pan_y * pan_y_gain * sweep_val
                else:
                    sweep_val = scene_sweep_phase(t, sweep)
                    zoom = zoom_overscan + zoom_frac * sweep_val
                    ox = amp_r * pan_x * sweep_val
                    oy = amp_r * pan_y * pan_y_gain * sweep_val
            else:
                t = i / frames
                pt = camera_phase(t)
                zoom = zoom_overscan + zoom_frac * np.sin(np.pi * pt)
                ox = amp_r * pan_x * np.sin(two_pi * pt)
                oy = amp_r * pan_y * 0.4 * np.cos(two_pi * pt)

            base_x = (grid_x - cx) / zoom + cx
            base_y = (grid_y - cy) / zoom + cy

            # Procedural motion: листва качается, небо дрейфует, вода мерцает.
            # veg+water → mid/near слои, sky → far. env(t) даёт 0 на t=0 (стык с Veo).
            veg_dx = veg_dy = sky_dx = None
            if has_alive:
                env = smoothstep(0.0, 0.12, t) if linear else 1.0
                veg_wave = np.sin(two_pi * (alive_veg_cycles * t + veg_phase))
                veg_wave_y = np.sin(two_pi * (alive_veg_cycles * 1.3 * t + veg_phase * 1.7))
                sky_shift = sky_amp_px * env * t if linear else sky_amp_px * np.sin(two_pi * t)
                # вода: мельче и быстрее, преимущественно вертикальная рябь
                water_wave = np.sin(two_pi * (alive_veg_cycles * 1.9 * t + veg_phase * 2.3))
                water_wave_y = np.cos(two_pi * (alive_veg_cycles * 2.2 * t + veg_phase * 1.4))

                veg_dx = (
                    veg_amp_px * env * veg_wave * veg_mask
                    + 0.5 * water_amp_px * env * water_wave * water_mask
                ).astype(np.float32)
                veg_dy = (
                    0.35 * veg_amp_px * env * veg_wave_y * veg_mask
                    + water_amp_px * env * water_wave_y * water_mask
                ).astype(np.float32)
                sky_dx = (sky_shift * sky_mask).astype(np.float32)

            # Композитинг слоёв back→front (far → mid → near) с over-оператором.
            out = None
            scene_depth = None
            for idx, layer in enumerate(layers):
                gain = layer["gain"]
                if has_alive and idx == 0:  # far → небо
                    mdx, mdy = sky_dx, None if sky_dx is None else np.zeros_like(sky_dx)
                elif has_alive:  # mid/near → листва
                    mdx, mdy = veg_dx, veg_dy
                else:
                    mdx = mdy = None
                rgb_w, mx, my = warp_layer(
                    layer["rgb"], layer["depth"], base_x, base_y, focus,
                    ox * gain, oy * gain, mdx, mdy,
                )
                d_w = cv2.remap(
                    layer["depth"], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
                )
                if out is None:  # far — непрозрачный фон
                    out = rgb_w.astype(np.float32)
                    scene_depth = d_w
                    continue
                a_w = cv2.remap(
                    layer["alpha"], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
                )
                a3 = a_w[..., None]
                out = out * (1.0 - a3) + rgb_w.astype(np.float32) * a3
                scene_depth = scene_depth * (1.0 - a_w) + d_w * a_w

            farness = np.clip((focus - scene_depth) / focus_span, 0.0, 1.0)

            if dof_strength > 0.0:
                w_dof = (farness ** 1.2 * dof_strength)[..., None]
                blurred = cv2.GaussianBlur(out, (0, 0), sigmaX=dof_sigma, sigmaY=dof_sigma)
                out = out * (1.0 - w_dof) + blurred * w_dof

            if haze_strength > 0.0:
                w_haze = (farness * haze_strength)[..., None]
                out = out * (1.0 - w_haze) + ambient[None, None, :] * w_haze

            if motes is not None:
                acc = np.zeros((rh, rw), dtype=np.float32)
                drift = motes["drift"]
                if linear:
                    px = motes["bx"] + drift * t * np.cos(motes["phase"])
                    py = motes["by"] + drift * t * np.sin(motes["phase"])
                    twinkle_t = t
                else:
                    px = motes["bx"] + drift * np.cos(two_pi * pt + motes["phase"])
                    py = motes["by"] + drift * np.sin(two_pi * pt + motes["phase"])
                    twinkle_t = t
                disp_m = motes["dm"] - focus
                sx = px + disp_m * ox
                sy = py + disp_m * oy
                twinkle = 0.55 + 0.45 * np.sin(two_pi * motes["harmonic"] * twinkle_t + motes["tphase"])
                far_m = np.clip((focus - motes["dm"]) / focus_span, 0.0, 1.0)
                r_eff = motes["radius"] * (1.0 + far_m * 2.0)
                b_eff = motes["bright"] * twinkle / (1.0 + far_m * 1.2)
                ix = np.clip(sx.astype(int), 0, rw - 1)
                iy = np.clip(sy.astype(int), 0, rh - 1)
                for k in range(len(px)):
                    if sx[k] < 0 or sx[k] >= rw or sy[k] < 0 or sy[k] >= rh:
                        continue
                    # мягкое перекрытие передним планом (жёсткий порог прятал почти всё)
                    depth_delta = float(scene_depth[iy[k], ix[k]] - motes["dm"][k])
                    if depth_delta > 0.16:
                        continue
                    occ = 1.0 if depth_delta <= 0.02 else max(0.0, 1.0 - (depth_delta - 0.02) / 0.14)
                    stamp_soft(acc, sx[k], sy[k], r_eff[k], b_eff[k] * occ)
                out = out + (dust_strength * dust_gain) * acc[..., None] * dust_tint[None, None, :]

            if downscale:  # супер-сэмпл → выходное разрешение (AA краёв)
                out = cv2.resize(out, (w, h), interpolation=cv2.INTER_AREA)

            frame = np.clip(out + 0.5, 0, 255).astype(np.uint8)
            proc.stdin.write(frame.tobytes())
        proc.stdin.close()
        ret = proc.wait()
    finally:
        if proc.poll() is None:
            proc.kill()
    if ret != 0:
        raise RuntimeError(f"ffmpeg exit {ret}")

    return {
        "image": image_path,
        "out_video": out_video,
        "out_depth": out_depth,
        "width": w,
        "height": h,
        "frames": frames,
        "fps": fps,
    }


def main() -> None:
    req = json.load(sys.stdin)
    jobs = req.get("jobs") or []
    results = []
    for job in jobs:
        log(f"bake {os.path.basename(job.get('image', '?'))}")
        results.append(bake_one(job))
    json.dump({"ok": True, "results": results}, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        json.dump({"ok": False, "error": str(error)}, sys.stdout)
        sys.stdout.write("\n")
        sys.exit(1)
