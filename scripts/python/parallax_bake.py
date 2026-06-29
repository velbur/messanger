#!/usr/bin/env python3
"""
Запекает 3D-photo parallax-loop из одной картинки + depth-карты.

Идея (почему так, а не CSS-слои в Remotion):
  - фон inpaint'ится (передний план вырезается и заполняется) → когда ближний
    план сдвигается, за ним виден реальный фон, а не «двоение лица»;
  - смещение по-пиксельное, пропорционально глубине (а не жёсткий translate
    cutout-слоёв) → нет halo и ступенек на силуэте;
  - камера ходит по sin(2π·t) → клип сам по себе бесшовный loop (кадр 0 = кадр N,
    скорость непрерывна, без рывка на стыке);
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
    sigma = max(1.0, min(w, h) * 0.0035)
    d = cv2.GaussianBlur(d, (0, 0), sigmaX=sigma, sigmaY=sigma)
    return d


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


def warp_layer(src: np.ndarray, depth_layer: np.ndarray, base_x, base_y, focus, ox, oy):
    """Backward-warp по глубине: pixel сэмплится из src со смещением (d-focus)*offset.

    Два прохода уточняют глубину в точке сэмпла → меньше «тянучки» на разрывах.
    """
    disp = depth_layer - focus
    map_x = (base_x - disp * ox).astype(np.float32)
    map_y = (base_y - disp * oy).astype(np.float32)
    for _ in range(2):
        d_at = cv2.remap(
            depth_layer, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
        )
        disp = d_at - focus
        map_x = (base_x - disp * ox).astype(np.float32)
        map_y = (base_y - disp * oy).astype(np.float32)
    warped = cv2.remap(src, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return warped, map_x, map_y


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

    img = np.array(Image.open(image_path).convert("RGB"))
    h, w = img.shape[:2]

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
    # ближний план двигается заметно сильнее фона
    near_gain = 1.0
    far_gain = 0.55

    # overscan: ровно столько, чтобы смещения не открыли края (без лишнего кропа)
    zoom = 1.0 + (amp / max(w, h)) * 1.7
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
    base_x = (grid_x - cx) / zoom + cx
    base_y = (grid_y - cy) / zoom + cy

    fg_alpha_f = fg_alpha.astype(np.float32)

    proc = open_ffmpeg(out_video, w, h, fps)
    two_pi = 2.0 * np.pi
    try:
        for i in range(frames):
            t = i / frames
            ox = amp * pan_x * np.sin(two_pi * t)
            oy = amp * pan_y * 0.4 * np.cos(two_pi * t)

            bg_warp, _, _ = warp_layer(
                bg_rgb, depth_bg, base_x, base_y, focus, ox * far_gain, oy * far_gain
            )
            fg_warp, map_x, map_y = warp_layer(
                img, depth, base_x, base_y, focus, ox * near_gain, oy * near_gain
            )
            a_warp = cv2.remap(
                fg_alpha_f, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
            )[..., None]

            out = bg_warp.astype(np.float32) * (1.0 - a_warp) + fg_warp.astype(np.float32) * a_warp
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
