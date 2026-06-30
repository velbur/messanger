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


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    span = max(edge1 - edge0, 1e-6)
    t = np.clip((x - edge0) / span, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def prepare_depth(depth_u8: np.ndarray, w: int, h: int) -> np.ndarray:
    """uint8 depth → float[0..1], растянуть по перцентилям, сгладить (near=1)."""
    d = depth_u8.astype(np.float32)
    lo = float(np.percentile(d, 2))
    hi = float(np.percentile(d, 98))
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    
    # Используем bilateral filter, чтобы выровнять глубину внутри объектов (лиц)
    # и сохранить резкие границы. Обычный GaussianBlur делает из объектов "холмы",
    # из-за чего они растягиваются ("плывут") при parallax-сдвиге.
    d_8u = (d * 255).astype(np.uint8)
    d_8u = cv2.bilateralFilter(d_8u, d=7, sigmaColor=45, sigmaSpace=45)
    return d_8u.astype(np.float32) / 255.0


def depth_stiffness_mask(depth: np.ndarray) -> np.ndarray:
    """На резких перепадах глубины (лицо, предметы) уменьшаем смещение — меньше «резины»."""
    gx = cv2.Sobel(depth, cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(depth, cv2.CV_32F, 0, 1, ksize=5)
    grad = np.hypot(gx, gy)
    grad_cap = float(np.percentile(grad, 90)) + 1e-6
    stiff = 1.0 - np.clip(grad / grad_cap, 0.0, 1.0) * 0.88
    return np.clip(stiff, 0.1, 1.0)


def compress_displacement(disp: np.ndarray) -> np.ndarray:
    """Сжать крайние значения глубины — меньше растяжки на ближнем плане."""
    return np.tanh(disp * 1.9) * 0.28


def camera_phase(t: float) -> float:
    """Ease по времени: камера медленнее на разворотах."""
    return t * t * (3.0 - 2.0 * t)


def scene_sweep_phase(t: float, sweep: str = "round-trip") -> float:
    """Профиль движения камеры по длине клипа."""
    tri = t * 2.0 if t < 0.5 else 2.0 - t * 2.0
    return camera_phase(tri)


def build_foreground_alpha(depth: np.ndarray, w: int, h: int) -> np.ndarray:
    """Маска переднего плана из самых близких глубин, адаптивно по перцентилям."""
    p60 = float(np.percentile(depth, 60))
    p85 = float(np.percentile(depth, 88))
    lo = max(p60, 0.45)
    hi = max(p85, lo + 0.12)
    alpha = smoothstep(lo, hi, depth)
    feather = max(1.0, min(w, h) * 0.004)
    alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=feather, sigmaY=feather)
    return np.clip(alpha, 0.0, 1.0)


def inpaint_background(img_rgb: np.ndarray, fg_alpha: np.ndarray, depth: np.ndarray):
    """Убрать передний план и заполнить фон (цвет + глубину) через Telea-inpaint."""
    h, w = depth.shape
    mask = (fg_alpha > 0.45).astype(np.uint8) * 255
    dilate = max(3, int(min(w, h) * 0.012))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate, dilate))
    mask = cv2.dilate(mask, kernel)
    radius = max(4, int(min(w, h) * 0.02))

    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    bg_bgr = cv2.inpaint(img_bgr, mask, radius, cv2.INPAINT_TELEA)
    bg_rgb = cv2.cvtColor(bg_bgr, cv2.COLOR_BGR2RGB)

    depth_u8 = (np.clip(depth, 0, 1) * 255).astype(np.uint8)
    depth_bg_u8 = cv2.inpaint(depth_u8, mask, radius, cv2.INPAINT_TELEA)
    depth_bg = depth_bg_u8.astype(np.float32) / 255.0
    sigma = max(1.0, min(w, h) * 0.01)
    depth_bg = cv2.GaussianBlur(depth_bg, (0, 0), sigmaX=sigma, sigmaY=sigma)
    return bg_rgb, depth_bg


def warp_layer(src: np.ndarray, depth_layer: np.ndarray, base_x, base_y, focus, ox, oy, stiff=None):
    """Backward-warp по глубине: pixel сэмплится из src со смещением (d-focus)*offset.

    Два прохода уточняют глубину в точке сэмпла → меньше «тянучки» на разрывах.
    """
    if stiff is None:
        stiff = depth_stiffness_mask(depth_layer)
    disp = compress_displacement(depth_layer - focus) * stiff
    map_x = (base_x - disp * ox).astype(np.float32)
    map_y = (base_y - disp * oy).astype(np.float32)
    for _ in range(2):
        d_at = cv2.remap(
            depth_layer, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
        )
        disp = compress_displacement(d_at - focus) * stiff
        map_x = (base_x - disp * ox).astype(np.float32)
        map_y = (base_y - disp * oy).astype(np.float32)
    warped = cv2.remap(src, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
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
    motion = str(job.get("motion", "linear"))
    sweep = str(job.get("sweep", "round-trip"))

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

    depth = prepare_depth(depth_u8, w, h)
    fg_alpha = build_foreground_alpha(depth, w, h)
    bg_rgb, depth_bg = inpaint_background(img, fg_alpha, depth)

    out_depth = job.get("out_depth")
    if out_depth:
        Path(out_depth).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(out_depth, (np.clip(depth, 0, 1) * 255).astype(np.uint8))

    focus = float(np.percentile(depth, 50))
    # меньше разницы fg/bg → меньше «разрыва» на контурах лиц и предметов
    near_gain = 0.92
    far_gain = 0.72
    depth_stiff = depth_stiffness_mask(depth)

    # overscan: запас под parallax-смещение + опциональный зум
    overscan_gain = 1.65 if motion == "linear" else 1.5
    zoom_overscan = 1.0 + (amp / max(w, h)) * overscan_gain
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)

    fg_alpha_f = fg_alpha.astype(np.float32)

    # Depth-of-field / aerial haze считаем по «дальности» от фокальной плоскости
    focus_span = max(focus, 1e-3)
    dof_sigma = max(1.0, min(w, h) * 0.013)
    # тёплый ambient для дымки — берём из ярких (ламповых) пикселей
    ambient = np.clip(np.percentile(img.reshape(-1, 3), 85, axis=0), 0, 255).astype(np.float32)
    dust_tint = np.array([1.0, 0.96, 0.86], dtype=np.float32)
    dust_gain = 38.0

    motes = make_motes(effect_seed, dust_count, w, h) if dust_count > 0 else None

    proc = open_ffmpeg(out_video, w, h, fps)
    two_pi = 2.0 * np.pi
    linear = motion == "linear"
    try:
        for i in range(frames):
            if linear:
                t = i / max(frames - 1, 1)
                sweep_val = scene_sweep_phase(t, sweep)
                zoom = zoom_overscan + zoom_frac * sweep_val
                ox = amp * pan_x * sweep_val
                oy = amp * pan_y * 0.18 * sweep_val
            else:
                t = i / frames
                pt = camera_phase(t)
                zoom = zoom_overscan + zoom_frac * np.sin(np.pi * pt)
                ox = amp * pan_x * np.sin(two_pi * pt)
                oy = amp * pan_y * 0.4 * np.cos(two_pi * pt)

            base_x = (grid_x - cx) / zoom + cx
            base_y = (grid_y - cy) / zoom + cy

            bg_warp, bg_mx, bg_my = warp_layer(
                bg_rgb, depth_bg, base_x, base_y, focus, ox * far_gain, oy * far_gain, depth_stiff
            )
            fg_warp, map_x, map_y = warp_layer(
                img, depth, base_x, base_y, focus, ox * near_gain, oy * near_gain, depth_stiff
            )
            a_warp = cv2.remap(
                fg_alpha_f, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
            )[..., None]

            out = bg_warp.astype(np.float32) * (1.0 - a_warp) + fg_warp.astype(np.float32) * a_warp

            # Глубина на каждый выходной пиксель — для DOF, дымки и перекрытия пылинок
            depth_n = cv2.remap(depth, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            depth_f = cv2.remap(
                depth_bg, bg_mx, bg_my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
            )
            scene_depth = a_warp[..., 0] * depth_n + (1.0 - a_warp[..., 0]) * depth_f
            farness = np.clip((focus - scene_depth) / focus_span, 0.0, 1.0)

            if dof_strength > 0.0:
                w_dof = (farness ** 1.2 * dof_strength)[..., None]
                blurred = cv2.GaussianBlur(out, (0, 0), sigmaX=dof_sigma, sigmaY=dof_sigma)
                out = out * (1.0 - w_dof) + blurred * w_dof

            if haze_strength > 0.0:
                w_haze = (farness * haze_strength)[..., None]
                out = out * (1.0 - w_haze) + ambient[None, None, :] * w_haze

            if motes is not None:
                acc = np.zeros((h, w), dtype=np.float32)
                drift = motes["drift"]
                if linear:
                    px = motes["bx"] + drift * sweep * np.cos(motes["phase"])
                    py = motes["by"] + drift * sweep * np.sin(motes["phase"])
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
                ix = np.clip(sx.astype(int), 0, w - 1)
                iy = np.clip(sy.astype(int), 0, h - 1)
                for k in range(len(px)):
                    if sx[k] < 0 or sx[k] >= w or sy[k] < 0 or sy[k] >= h:
                        continue
                    # мягкое перекрытие передним планом (жёсткий порог прятал почти всё)
                    depth_delta = float(scene_depth[iy[k], ix[k]] - motes["dm"][k])
                    if depth_delta > 0.16:
                        continue
                    occ = 1.0 if depth_delta <= 0.02 else max(0.0, 1.0 - (depth_delta - 0.02) / 0.14)
                    stamp_soft(acc, sx[k], sy[k], r_eff[k], b_eff[k] * occ)
                out = out + (dust_strength * dust_gain) * acc[..., None] * dust_tint[None, None, :]

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
