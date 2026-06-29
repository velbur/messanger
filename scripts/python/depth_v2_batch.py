#!/usr/bin/env python3
"""
Depth Anything V2 через Hugging Face transformers.
Читает JSON из stdin, пишет JSON в stdout.
Каждый кадр → raw-файл: 8 байт (w,h big-endian) + w*h uint8 depth.
"""
import hashlib
import json
import os
import struct
import sys
from pathlib import Path


def pick_accelerator():
    import torch

    if torch.cuda.is_available():
        return {
            "kind": "cuda",
            "pipeline_device": 0,
            "dtype": torch.float16,
            "fast": True,
        }
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return {
            "kind": "mps",
            "pipeline_device": "mps",
            "dtype": torch.float32,
            "fast": True,
        }
    return {
        "kind": "cpu",
        "pipeline_device": -1,
        "dtype": torch.float32,
        "fast": False,
    }


def resolve_model_id(fast_accelerator: bool) -> str:
    from_env = os.environ.get("STORY_DEPTH_V2_MODEL", "").strip()
    if from_env:
        return from_env
    if fast_accelerator:
        return "depth-anything/Depth-Anything-V2-Large-hf"
    return "depth-anything/Depth-Anything-V2-Small-hf"


def main() -> None:
    req = json.load(sys.stdin)
    images = [str(p) for p in (req.get("images") or []) if str(p).strip()]
    if not images:
        json.dump({"ok": True, "results": []}, sys.stdout)
        sys.stdout.write("\n")
        return

    cache_dir = Path(req.get("cache_dir") or os.environ.get("STORY_DEPTH_V2_CACHE", ".cache/depth-v2/raw"))
    cache_dir.mkdir(parents=True, exist_ok=True)

    import numpy as np
    from PIL import Image
    from transformers import pipeline

    accel = pick_accelerator()
    model_id = str(req.get("model") or resolve_model_id(accel["fast"]))

    pipe = pipeline(
        task="depth-estimation",
        model=model_id,
        device=accel["pipeline_device"],
        torch_dtype=accel["dtype"],
    )

    results = []
    for image_path in images:
        pil = Image.open(image_path).convert("RGB")
        target_w, target_h = pil.size
        out = pipe(pil)
        depth = out["depth"]
        if depth.size != (target_w, target_h):
            depth = depth.resize((target_w, target_h), Image.BILINEAR)

        arr = np.array(depth, dtype=np.float32)
        d_min = float(arr.min())
        d_max = float(arr.max())
        if d_max - d_min < 1e-6:
            normed = np.zeros(arr.shape, dtype=np.uint8)
        else:
            normed = ((arr - d_min) / (d_max - d_min) * 255.0).astype(np.uint8)

        key = hashlib.sha256(image_path.encode("utf-8")).hexdigest()[:20]
        raw_path = cache_dir / f"{key}.raw"
        with raw_path.open("wb") as handle:
            handle.write(struct.pack(">II", target_w, target_h))
            handle.write(normed.tobytes())

        results.append(
            {
                "image": image_path,
                "width": target_w,
                "height": target_h,
                "raw": str(raw_path),
                "device": accel["kind"],
                "model": model_id,
            }
        )

    json.dump(
        {
            "ok": True,
            "results": results,
            "accelerator": accel["kind"],
            "cuda": accel["kind"] == "cuda",
            "mps": accel["kind"] == "mps",
            "model": model_id,
        },
        sys.stdout,
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        json.dump({"ok": False, "error": str(error)}, sys.stdout)
        sys.stdout.write("\n")
        sys.exit(1)
