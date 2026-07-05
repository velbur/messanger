"""
FastAPI GPU-сервис: T2I (FLUX.1-dev) + I2V (Wan 2.1 → upscale 1080p).
Запуск: uvicorn app:app --host 0.0.0.0 --port 8008

POST /t2i — text-to-image (job queue).
POST /i2v — image-to-video (job queue).
GET /{t2i,i2v}/jobs/{id} — статус; GET .../download — файл.
Wan и FLUX не держатся в VRAM одновременно — переключение по запросу.
"""
from __future__ import annotations

import asyncio
import io
import logging
import os
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from diffusers import AutoencoderKLWan, FluxImg2ImgPipeline, FluxPipeline, WanImageToVideoPipeline
from diffusers.utils import export_to_video
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from starlette.background import BackgroundTask
from transformers import CLIPVisionModel

logging.basicConfig(level=logging.INFO, format="[gpu-i2v] %(message)s")
log = logging.getLogger("gpu-i2v")

ROOT = Path(__file__).resolve().parent
MODELS_DIR = Path(os.environ.get("MODELS_DIR", ROOT / "models"))
WAN_MODEL_PATH = Path(
    os.environ.get("WAN_MODEL_PATH", MODELS_DIR / "wan-i2v-14b-720p"),
)
FLUX_MODEL_PATH = Path(
    os.environ.get("FLUX_MODEL_PATH", MODELS_DIR / "flux-1-dev"),
)
REALESRGAN_DIR = Path(os.environ.get("REALESRGAN_DIR", MODELS_DIR / "realesrgan"))

DEFAULT_FPS = int(os.environ.get("GPU_I2V_FPS", "16"))
DEFAULT_DURATION = float(os.environ.get("GPU_I2V_DURATION", "4"))
DEFAULT_GUIDANCE = float(os.environ.get("GPU_I2V_GUIDANCE", "5.0"))
DEFAULT_STEPS = int(os.environ.get("GPU_I2V_STEPS", "30"))
UPSCALER = os.environ.get("GPU_UPSCALER", "realesrgan").strip().lower()
TARGET_WIDTH = int(os.environ.get("GPU_I2V_WIDTH", "1080"))
TARGET_HEIGHT = int(os.environ.get("GPU_I2V_HEIGHT", "1920"))
MAX_AREA_720P = 720 * 1280
MAX_JOBS = int(os.environ.get("GPU_I2V_MAX_JOBS", "32"))
DEFAULT_T2I_WIDTH = int(os.environ.get("GPU_T2I_WIDTH", "1080"))
DEFAULT_T2I_HEIGHT = int(os.environ.get("GPU_T2I_HEIGHT", "1920"))
DEFAULT_T2I_STEPS = int(os.environ.get("GPU_T2I_STEPS", "28"))
DEFAULT_T2I_GUIDANCE = float(os.environ.get("GPU_T2I_GUIDANCE", "3.5"))
DEFAULT_T2I_IMG2IMG_STRENGTH = float(os.environ.get("GPU_T2I_IMG2IMG_STRENGTH", "0.65"))
MAX_T2I_JOBS = int(os.environ.get("GPU_T2I_MAX_JOBS", "32"))

NEGATIVE_PROMPT = (
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，"
    "整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，"
    "画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，"
    "静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走，"
    "flying, floating, levitating, jumping, falling, soaring, hovering, "
    "deformed body, distorted limbs, extra limbs, missing limbs, morphing, "
    "teleporting, sliding feet, unnatural pose, body distortion, "
    "melting face, warped anatomy, disfigured, grotesque motion"
)

_pipeline: WanImageToVideoPipeline | None = None
_flux_pipeline: FluxPipeline | None = None
_flux_img2img_pipeline: FluxImg2ImgPipeline | None = None
_upscaler_model = None
_device = "cuda" if torch.cuda.is_available() else "cpu"
_gpu_lock = asyncio.Lock()


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Job:
    id: str
    status: JobStatus
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    finished_at: float | None = None
    error: str | None = None
    output_path: str | None = None
    meta: dict[str, Any] | None = None


_jobs: dict[str, Job] = {}
_t2i_jobs: dict[str, Job] = {}


def _snap_dim(value: int, mod: int) -> int:
    return max(mod, round(value / mod) * mod)


def _wan_dims_for_aspect(aspect_ratio: str, mod_value: int) -> tuple[int, int]:
    """Вертикальный 9:16 в пределах max area 720p."""
    ratio = aspect_ratio.strip()
    if ratio in {"9:16", "9/16", "vertical"}:
        ar = 16 / 9
    elif ratio in {"16:9", "16/9", "horizontal"}:
        ar = 9 / 16
    else:
        ar = 16 / 9
    height = _snap_dim(int(np.sqrt(MAX_AREA_720P * ar)), mod_value)
    width = _snap_dim(int(np.sqrt(MAX_AREA_720P / ar)), mod_value)
    return height, width


def _num_frames_for_duration(duration_sec: float, fps: int) -> int:
    frames = max(17, int(round(duration_sec * fps)))
    if (frames - 1) % 4 != 0:
        frames += 4 - ((frames - 1) % 4)
    return frames


def _normalize_output_resolution(resolution: str) -> str:
    raw = resolution.strip().lower().replace(" ", "")
    if raw in {"720", "720p", "720x1280", "1280x720"}:
        return "720p"
    return "1080p"


def _clear_cuda_cache() -> None:
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _unload_wan_pipeline() -> None:
    global _pipeline
    if _pipeline is None:
        return
    log.info("Выгрузка Wan I2V из VRAM…")
    try:
        _pipeline.to("cpu")
    except Exception:
        pass
    del _pipeline
    _pipeline = None
    _clear_cuda_cache()


def _unload_flux_pipeline() -> None:
    global _flux_pipeline, _flux_img2img_pipeline
    if _flux_pipeline is not None:
        log.info("Выгрузка FLUX T2I из VRAM…")
        try:
            _flux_pipeline.to("cpu")
        except Exception:
            pass
        del _flux_pipeline
        _flux_pipeline = None
    if _flux_img2img_pipeline is not None:
        log.info("Выгрузка FLUX img2img из VRAM…")
        try:
            _flux_img2img_pipeline.to("cpu")
        except Exception:
            pass
        del _flux_img2img_pipeline
        _flux_img2img_pipeline = None
    _clear_cuda_cache()


def _load_pipeline() -> WanImageToVideoPipeline:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    _unload_flux_pipeline()

    if not WAN_MODEL_PATH.exists():
        raise RuntimeError(
            f"Веса Wan не найдены: {WAN_MODEL_PATH}. Запустите ./download_models.sh",
        )

    model_source = str(WAN_MODEL_PATH)
    log.info("Загрузка Wan I2V из %s на %s…", model_source, _device)

    image_encoder = CLIPVisionModel.from_pretrained(
        model_source,
        subfolder="image_encoder",
        torch_dtype=torch.float32,
    )
    vae = AutoencoderKLWan.from_pretrained(
        model_source,
        subfolder="vae",
        torch_dtype=torch.float32,
    )
    pipe = WanImageToVideoPipeline.from_pretrained(
        model_source,
        vae=vae,
        image_encoder=image_encoder,
        torch_dtype=torch.bfloat16,
    )
    pipe.to(_device)
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass

    _pipeline = pipe
    log.info("Wan I2V готов (bf16, без offload)")
    return _pipeline


def _load_flux_pipeline() -> FluxPipeline:
    global _flux_pipeline, _flux_img2img_pipeline
    if _flux_pipeline is not None:
        return _flux_pipeline

    _unload_wan_pipeline()
    if _flux_img2img_pipeline is not None:
        try:
            _flux_img2img_pipeline.to("cpu")
        except Exception:
            pass
        del _flux_img2img_pipeline
        _flux_img2img_pipeline = None
        _clear_cuda_cache()

    if not FLUX_MODEL_PATH.exists():
        raise RuntimeError(
            f"Веса FLUX не найдены: {FLUX_MODEL_PATH}. Запустите ./download_models.sh",
        )

    model_source = str(FLUX_MODEL_PATH)
    log.info("Загрузка FLUX T2I из %s на %s…", model_source, _device)
    pipe = FluxPipeline.from_pretrained(
        model_source,
        torch_dtype=torch.bfloat16,
    )
    pipe.to(_device)
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass

    _flux_pipeline = pipe
    log.info("FLUX T2I готов (bf16)")
    return _flux_pipeline


def _load_flux_img2img_pipeline() -> FluxImg2ImgPipeline:
    global _flux_img2img_pipeline, _flux_pipeline
    if _flux_img2img_pipeline is not None:
        return _flux_img2img_pipeline

    _unload_wan_pipeline()
    if _flux_pipeline is not None:
        try:
            _flux_pipeline.to("cpu")
        except Exception:
            pass
        del _flux_pipeline
        _flux_pipeline = None
        _clear_cuda_cache()

    if not FLUX_MODEL_PATH.exists():
        raise RuntimeError(
            f"Веса FLUX не найдены: {FLUX_MODEL_PATH}. Запустите ./download_models.sh",
        )

    model_source = str(FLUX_MODEL_PATH)
    log.info("Загрузка FLUX img2img из %s на %s…", model_source, _device)
    pipe = FluxImg2ImgPipeline.from_pretrained(
        model_source,
        torch_dtype=torch.bfloat16,
    )
    pipe.to(_device)
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass

    _flux_img2img_pipeline = pipe
    log.info("FLUX img2img готов (bf16)")
    return _flux_img2img_pipeline


def _snap_t2i_dim(value: int, mod: int = 8) -> int:
    return max(mod, round(value / mod) * mod)


def _generate_t2i(
    prompt: str,
    *,
    width: int,
    height: int,
    steps: int | None = None,
    guidance: float | None = None,
    seed: int | None = None,
) -> tuple[Image.Image, dict]:
    pipe = _load_flux_pipeline()
    out_w = _snap_t2i_dim(width)
    out_h = _snap_t2i_dim(height)
    inference_steps = steps if steps and steps > 0 else DEFAULT_T2I_STEPS
    guidance_scale = guidance if guidance and guidance > 0 else DEFAULT_T2I_GUIDANCE

    generator = None
    if seed is not None and seed >= 0:
        generator = torch.Generator(device=_device).manual_seed(seed)

    log.info(
        "T2I: %dx%d, %d steps, guidance=%.1f",
        out_w,
        out_h,
        inference_steps,
        guidance_scale,
    )
    started = time.time()
    result = pipe(
        prompt=prompt,
        width=out_w,
        height=out_h,
        num_inference_steps=inference_steps,
        guidance_scale=guidance_scale,
        generator=generator,
        max_sequence_length=512,
    )
    image = result.images[0]
    meta = {
        "width": out_w,
        "height": out_h,
        "inference_sec": round(time.time() - started, 1),
        "inference_steps": inference_steps,
        "guidance_scale": guidance_scale,
        "seed": seed,
    }
    return image, meta


def _render_t2i_image(
    prompt: str,
    *,
    width: int,
    height: int,
    steps: int | None = None,
    guidance: float | None = None,
    seed: int | None = None,
) -> tuple[str, dict]:
    image, meta = _generate_t2i(
        prompt,
        width=width,
        height=height,
        steps=steps,
        guidance=guidance,
        seed=seed,
    )
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_path = tmp.name
    tmp.close()
    image.save(tmp_path, format="PNG")
    meta["format"] = "png"
    return tmp_path, meta


def _generate_t2i_img2img(
    image: Image.Image,
    prompt: str,
    *,
    strength: float,
    steps: int | None = None,
    guidance: float | None = None,
    seed: int | None = None,
) -> tuple[Image.Image, dict]:
    pipe = _load_flux_img2img_pipeline()
    init = image.convert("RGB")
    out_w = _snap_t2i_dim(init.width)
    out_h = _snap_t2i_dim(init.height)
    if init.size != (out_w, out_h):
        init = init.resize((out_w, out_h), Image.LANCZOS)
    inference_steps = steps if steps and steps > 0 else DEFAULT_T2I_STEPS
    guidance_scale = guidance if guidance and guidance > 0 else DEFAULT_T2I_GUIDANCE
    strength_value = min(0.98, max(0.05, strength))

    generator = None
    if seed is not None and seed >= 0:
        generator = torch.Generator(device=_device).manual_seed(seed)

    log.info(
        "img2img: %dx%d, strength=%.2f, %d steps, guidance=%.1f",
        out_w,
        out_h,
        strength_value,
        inference_steps,
        guidance_scale,
    )
    started = time.time()
    result = pipe(
        prompt=prompt,
        image=init,
        strength=strength_value,
        num_inference_steps=inference_steps,
        guidance_scale=guidance_scale,
        generator=generator,
        max_sequence_length=512,
    )
    out_image = result.images[0]
    meta = {
        "width": out_w,
        "height": out_h,
        "strength": strength_value,
        "inference_sec": round(time.time() - started, 1),
        "inference_steps": inference_steps,
        "guidance_scale": guidance_scale,
        "seed": seed,
        "mode": "img2img",
    }
    return out_image, meta


def _render_t2i_img2img_image(
    image_bytes: bytes,
    prompt: str,
    *,
    strength: float,
    steps: int | None = None,
    guidance: float | None = None,
    seed: int | None = None,
) -> tuple[str, dict]:
    pil = Image.open(io.BytesIO(image_bytes))
    image, meta = _generate_t2i_img2img(
        pil,
        prompt,
        strength=strength,
        steps=steps,
        guidance=guidance,
        seed=seed,
    )
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_path = tmp.name
    tmp.close()
    image.save(tmp_path, format="PNG")
    meta["format"] = "png"
    return tmp_path, meta


def _find_realesrgan_checkpoint() -> Path | None:
    if not REALESRGAN_DIR.exists():
        return None
    for pattern in ("*.pth", "*.safetensors", "**/*.pth", "**/*.safetensors"):
        matches = sorted(REALESRGAN_DIR.glob(pattern))
        if matches:
            return matches[0]
    return None


def _load_upscaler():
    global _upscaler_model
    if _upscaler_model is not None or UPSCALER != "realesrgan":
        return _upscaler_model

    checkpoint = _find_realesrgan_checkpoint()
    if checkpoint is None:
        log.warning("Real-ESRGAN не найден — fallback на Lanczos")
        return None

    try:
        from spandrel import ModelLoader

        _upscaler_model = ModelLoader().load(checkpoint).eval().to(_device)
        log.info("Real-ESRGAN загружен: %s", checkpoint.name)
    except Exception as error:
        log.warning("Real-ESRGAN не загрузился (%s) — Lanczos", error)
        _upscaler_model = None
    return _upscaler_model


def _upscale_frame_lanczos(frame: np.ndarray, width: int, height: int) -> np.ndarray:
    if frame.dtype != np.uint8:
        frame = np.clip(frame, 0, 255).astype(np.uint8)
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_LANCZOS4)


def _upscale_frame_realesrgan(frame: np.ndarray, width: int, height: int) -> np.ndarray:
    model = _load_upscaler()
    if model is None:
        return _upscale_frame_lanczos(frame, width, height)

    tensor = torch.from_numpy(frame).permute(2, 0, 1).float().div(255.0).unsqueeze(0).to(_device)
    with torch.inference_mode():
        try:
            out = model(tensor)
            if isinstance(out, (list, tuple)):
                out = out[0]
            out = out.squeeze(0).permute(1, 2, 0).clamp(0, 1).mul(255).byte().cpu().numpy()
        except Exception:
            return _upscale_frame_lanczos(frame, width, height)
    return _upscale_frame_lanczos(out, width, height)


def _upscale_frames(frames: list[np.ndarray], width: int, height: int) -> list[np.ndarray]:
    upscale_fn = _upscale_frame_realesrgan if UPSCALER == "realesrgan" else _upscale_frame_lanczos
    return [upscale_fn(frame, width, height) for frame in frames]


def _generate_i2v(
    image: Image.Image,
    prompt: str,
    *,
    duration: float,
    fps: int,
    aspect_ratio: str,
    steps: int | None = None,
) -> tuple[list[np.ndarray], dict]:
    pipe = _load_pipeline()
    mod_value = pipe.vae_scale_factor_spatial * pipe.transformer.config.patch_size[1]
    height, width = _wan_dims_for_aspect(aspect_ratio, mod_value)
    image = image.convert("RGB").resize((width, height), Image.LANCZOS)
    num_frames = _num_frames_for_duration(duration, fps)
    inference_steps = steps if steps and steps > 0 else DEFAULT_STEPS

    log.info(
        "Генерация: %dx%d, %d кадров (~%.1f с @ %d fps), %d steps",
        width,
        height,
        num_frames,
        num_frames / fps,
        fps,
        inference_steps,
    )
    started = time.time()
    result = pipe(
        image=image,
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        height=height,
        width=width,
        num_frames=num_frames,
        guidance_scale=DEFAULT_GUIDANCE,
        num_inference_steps=inference_steps,
    )
    frames = list(result.frames[0])
    meta = {
        "native_width": width,
        "native_height": height,
        "num_frames": num_frames,
        "fps": fps,
        "duration_sec": round(num_frames / fps, 2),
        "inference_sec": round(time.time() - started, 1),
        "inference_steps": inference_steps,
    }
    return frames, meta


def _render_i2v_video(
    image_bytes: bytes,
    prompt: str,
    *,
    duration: float,
    fps: int,
    aspect_ratio: str,
    resolution: str = "1080p",
    steps: int | None = None,
) -> tuple[str, dict]:
    """Синхронный рендер в worker-thread (не блокирует event loop uvicorn)."""
    output_mode = _normalize_output_resolution(resolution)
    pil = Image.open(io.BytesIO(image_bytes))
    frames_720, meta = _generate_i2v(
        pil,
        prompt,
        duration=duration,
        fps=fps,
        aspect_ratio=aspect_ratio,
        steps=steps,
    )

    if output_mode == "720p":
        log.info("Вывод 720p без апскейла (%dx%d)", meta["native_width"], meta["native_height"])
        frames_out = frames_720
        meta["output_width"] = meta["native_width"]
        meta["output_height"] = meta["native_height"]
        meta["upscaled"] = False
    else:
        log.info("Апскейл %s → %dx%d (%s)", meta["native_width"], TARGET_WIDTH, TARGET_HEIGHT, UPSCALER)
        frames_out = _upscale_frames(frames_720, TARGET_WIDTH, TARGET_HEIGHT)
        meta["output_width"] = TARGET_WIDTH
        meta["output_height"] = TARGET_HEIGHT
        meta["upscaled"] = True

    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    tmp_path = tmp.name
    tmp.close()
    export_to_video(frames_out, tmp_path, fps=fps)
    return tmp_path, meta


def _get_job(job_id: str) -> Job:
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job не найден")
    return job


def _job_to_dict(job: Job) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status.value,
        "created_at": job.created_at,
    }
    if job.started_at is not None:
        payload["started_at"] = job.started_at
    if job.finished_at is not None:
        payload["finished_at"] = job.finished_at
    if job.error:
        payload["error"] = job.error
    if job.meta:
        payload["meta"] = job.meta
    if job.status == JobStatus.COMPLETED:
        payload["download_url"] = f"/i2v/jobs/{job.id}/download"
    return payload


def _cleanup_old_jobs() -> None:
    if len(_jobs) <= MAX_JOBS:
        return
    finished = [
        (job_id, job)
        for job_id, job in _jobs.items()
        if job.status in {JobStatus.COMPLETED, JobStatus.FAILED}
    ]
    finished.sort(key=lambda item: item[1].finished_at or item[1].created_at)
    for job_id, job in finished[: max(0, len(_jobs) - MAX_JOBS)]:
        if job.output_path and os.path.exists(job.output_path):
            os.unlink(job.output_path)
        _jobs.pop(job_id, None)


def _get_t2i_job(job_id: str) -> Job:
    job = _t2i_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job не найден")
    return job


def _t2i_job_to_dict(job: Job) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status.value,
        "created_at": job.created_at,
    }
    if job.started_at is not None:
        payload["started_at"] = job.started_at
    if job.finished_at is not None:
        payload["finished_at"] = job.finished_at
    if job.error:
        payload["error"] = job.error
    if job.meta:
        payload["meta"] = job.meta
    if job.status == JobStatus.COMPLETED:
        payload["download_url"] = f"/t2i/jobs/{job.id}/download"
    return payload


def _cleanup_old_t2i_jobs() -> None:
    if len(_t2i_jobs) <= MAX_T2I_JOBS:
        return
    finished = [
        (job_id, job)
        for job_id, job in _t2i_jobs.items()
        if job.status in {JobStatus.COMPLETED, JobStatus.FAILED}
    ]
    finished.sort(key=lambda item: item[1].finished_at or item[1].created_at)
    for job_id, job in finished[: max(0, len(_t2i_jobs) - MAX_T2I_JOBS)]:
        if job.output_path and os.path.exists(job.output_path):
            os.unlink(job.output_path)
        _t2i_jobs.pop(job_id, None)


async def _run_t2i_img2img_job(
    job_id: str,
    image_bytes: bytes,
    prompt: str,
    *,
    strength: float,
    steps: int | None,
    guidance: float | None,
    seed: int | None,
) -> None:
    job = _get_t2i_job(job_id)
    async with _gpu_lock:
        job.status = JobStatus.RUNNING
        job.started_at = time.time()
        log.info("T2I img2img job %s: старт", job_id)
        try:
            output_path, meta = await asyncio.to_thread(
                _render_t2i_img2img_image,
                image_bytes,
                prompt,
                strength=strength,
                steps=steps,
                guidance=guidance,
                seed=seed,
            )
            job.output_path = output_path
            job.meta = meta
            job.status = JobStatus.COMPLETED
            log.info("T2I img2img job %s: готово за %.1f с", job_id, time.time() - job.started_at)
        except Exception as error:
            job.status = JobStatus.FAILED
            job.error = str(error)
            log.exception("T2I img2img job %s: ошибка", job_id)
        finally:
            job.finished_at = time.time()
            _cleanup_old_t2i_jobs()


async def _run_t2i_job(
    job_id: str,
    prompt: str,
    *,
    width: int,
    height: int,
    steps: int | None,
    guidance: float | None,
    seed: int | None,
) -> None:
    job = _get_t2i_job(job_id)
    async with _gpu_lock:
        job.status = JobStatus.RUNNING
        job.started_at = time.time()
        log.info("T2I job %s: старт (%dx%d)", job_id, width, height)
        try:
            output_path, meta = await asyncio.to_thread(
                _render_t2i_image,
                prompt,
                width=width,
                height=height,
                steps=steps,
                guidance=guidance,
                seed=seed,
            )
            job.output_path = output_path
            job.meta = meta
            job.status = JobStatus.COMPLETED
            log.info("T2I job %s: готово за %.1f с", job_id, time.time() - job.started_at)
        except Exception as error:
            job.status = JobStatus.FAILED
            job.error = str(error)
            log.exception("T2I job %s: ошибка", job_id)
        finally:
            job.finished_at = time.time()
            _cleanup_old_t2i_jobs()


async def _run_job(
    job_id: str,
    image_bytes: bytes,
    prompt: str,
    *,
    duration: float,
    fps: int,
    aspect_ratio: str,
    resolution: str,
    steps: int | None,
) -> None:
    job = _get_job(job_id)
    async with _gpu_lock:
        job.status = JobStatus.RUNNING
        job.started_at = time.time()
        log.info("Job %s: старт (%s)", job_id, _normalize_output_resolution(resolution))
        try:
            output_path, meta = await asyncio.to_thread(
                _render_i2v_video,
                image_bytes,
                prompt,
                duration=duration,
                fps=fps,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                steps=steps,
            )
            job.output_path = output_path
            job.meta = meta
            job.status = JobStatus.COMPLETED
            log.info("Job %s: готово за %.1f с", job_id, time.time() - job.started_at)
        except Exception as error:
            job.status = JobStatus.FAILED
            job.error = str(error)
            log.exception("Job %s: ошибка", job_id)
        finally:
            job.finished_at = time.time()
            _cleanup_old_jobs()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await asyncio.to_thread(_load_pipeline)
        await asyncio.to_thread(_load_upscaler)
    except Exception as error:
        log.warning("Прогрев при старте пропущен: %s", error)
    yield


app = FastAPI(title="Messanger GPU Service", version="1.2.0", lifespan=lifespan)


@app.get("/health")
async def health():
    cuda = torch.cuda.is_available()
    active_i2v = [
        job_id
        for job_id, job in _jobs.items()
        if job.status in {JobStatus.QUEUED, JobStatus.RUNNING}
    ]
    active_t2i = [
        job_id
        for job_id, job in _t2i_jobs.items()
        if job.status in {JobStatus.QUEUED, JobStatus.RUNNING}
    ]
    info = {
        "ok": True,
        "device": _device,
        "cuda": cuda,
        "model_path": str(WAN_MODEL_PATH),
        "flux_model_path": str(FLUX_MODEL_PATH),
        "model_ready": _pipeline is not None,
        "flux_model_ready": _flux_pipeline is not None,
        "flux_img2img_ready": _flux_img2img_pipeline is not None,
        "upscaler": UPSCALER,
        "target_resolution": f"{TARGET_WIDTH}x{TARGET_HEIGHT}",
        "t2i_default_resolution": f"{DEFAULT_T2I_WIDTH}x{DEFAULT_T2I_HEIGHT}",
        "active_jobs": len(active_i2v) + len(active_t2i),
        "active_i2v_jobs": len(active_i2v),
        "active_t2i_jobs": len(active_t2i),
        "queue_mode": True,
    }
    if cuda:
        info["gpu_name"] = torch.cuda.get_device_name(0)
        info["vram_gb"] = round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
    return info


@app.get("/t2i/jobs/{job_id}")
async def t2i_job_status(job_id: str):
    return _t2i_job_to_dict(_get_t2i_job(job_id))


@app.get("/t2i/jobs/{job_id}/download")
async def t2i_job_download(job_id: str):
    job = _get_t2i_job(job_id)
    if job.status != JobStatus.COMPLETED or not job.output_path:
        raise HTTPException(status_code=409, detail=f"job {job.status.value}")
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=410, detail="файл уже удалён")

    meta = job.meta or {}
    headers = {
        "X-Job-Id": job.id,
        "X-Output-Resolution": f"{meta.get('width')}x{meta.get('height')}",
        "X-Inference-Sec": str(meta.get("inference_sec", "")),
    }
    return FileResponse(
        job.output_path,
        media_type="image/png",
        filename="output.png",
        headers=headers,
        background=BackgroundTask(
            lambda p=job.output_path: os.unlink(p) if p and os.path.exists(p) else None,
        ),
    )


@app.post("/t2i")
async def text_to_image(
    prompt: str = Form(...),
    width: int = Form(DEFAULT_T2I_WIDTH),
    height: int = Form(DEFAULT_T2I_HEIGHT),
    steps: int = Form(0),
    guidance: float = Form(0),
    seed: int = Form(-1),
    wait: int = Query(0, ge=0, le=1, description="1 = синхронный ответ png"),
):
    clean_prompt = prompt.strip()
    if not clean_prompt:
        raise HTTPException(status_code=400, detail="prompt обязателен")
    if width < 256 or width > 2048 or height < 256 or height > 2048:
        raise HTTPException(status_code=400, detail="width/height должны быть 256–2048")
    inference_steps = steps if steps > 0 else None
    guidance_scale = guidance if guidance > 0 else None
    resolved_seed = seed if seed >= 0 else None
    if steps < 0 or steps > 80:
        raise HTTPException(status_code=400, detail="steps должен быть 0–80")

    job_id = str(uuid.uuid4())
    _t2i_jobs[job_id] = Job(id=job_id, status=JobStatus.QUEUED)
    _cleanup_old_t2i_jobs()

    if wait:
        async with _gpu_lock:
            job = _get_t2i_job(job_id)
            job.status = JobStatus.RUNNING
            job.started_at = time.time()
            try:
                output_path, meta = await asyncio.to_thread(
                    _render_t2i_image,
                    clean_prompt,
                    width=width,
                    height=height,
                    steps=inference_steps,
                    guidance=guidance_scale,
                    seed=resolved_seed,
                )
                job.output_path = output_path
                job.meta = meta
                job.status = JobStatus.COMPLETED
                job.finished_at = time.time()
            except Exception as error:
                job.status = JobStatus.FAILED
                job.error = str(error)
                job.finished_at = time.time()
                log.exception("Ошибка T2I")
                raise HTTPException(status_code=500, detail=str(error)) from error

        headers = {
            "X-Job-Id": job_id,
            "X-Output-Resolution": f"{meta['width']}x{meta['height']}",
            "X-Inference-Sec": str(meta["inference_sec"]),
        }
        return FileResponse(
            output_path,
            media_type="image/png",
            filename="output.png",
            headers=headers,
            background=BackgroundTask(
                lambda p=output_path: os.unlink(p) if os.path.exists(p) else None,
            ),
        )

    asyncio.create_task(
        _run_t2i_job(
            job_id,
            clean_prompt,
            width=width,
            height=height,
            steps=inference_steps,
            guidance=guidance_scale,
            seed=resolved_seed,
        ),
    )
    return JSONResponse(status_code=202, content=_t2i_job_to_dict(_get_t2i_job(job_id)))


@app.post("/t2i/img2img")
async def image_to_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    strength: float = Form(DEFAULT_T2I_IMG2IMG_STRENGTH),
    steps: int = Form(0),
    guidance: float = Form(0),
    seed: int = Form(-1),
    wait: int = Query(0, ge=0, le=1, description="1 = синхронный ответ png"),
):
    clean_prompt = prompt.strip()
    if not clean_prompt:
        raise HTTPException(status_code=400, detail="prompt обязателен")
    if strength <= 0 or strength > 1:
        raise HTTPException(status_code=400, detail="strength должен быть 0–1")
    inference_steps = steps if steps > 0 else None
    guidance_scale = guidance if guidance > 0 else None
    resolved_seed = seed if seed >= 0 else None
    if steps < 0 or steps > 80:
        raise HTTPException(status_code=400, detail="steps должен быть 0–80")

    try:
        raw = await image.read()
        Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Не удалось прочитать изображение: {error}") from error

    job_id = str(uuid.uuid4())
    _t2i_jobs[job_id] = Job(id=job_id, status=JobStatus.QUEUED)
    _cleanup_old_t2i_jobs()

    if wait:
        async with _gpu_lock:
            job = _get_t2i_job(job_id)
            job.status = JobStatus.RUNNING
            job.started_at = time.time()
            try:
                output_path, meta = await asyncio.to_thread(
                    _render_t2i_img2img_image,
                    raw,
                    clean_prompt,
                    strength=strength,
                    steps=inference_steps,
                    guidance=guidance_scale,
                    seed=resolved_seed,
                )
                job.output_path = output_path
                job.meta = meta
                job.status = JobStatus.COMPLETED
                job.finished_at = time.time()
            except Exception as error:
                job.status = JobStatus.FAILED
                job.error = str(error)
                job.finished_at = time.time()
                log.exception("Ошибка img2img")
                raise HTTPException(status_code=500, detail=str(error)) from error

        headers = {
            "X-Job-Id": job_id,
            "X-Output-Resolution": f"{meta['width']}x{meta['height']}",
            "X-Inference-Sec": str(meta["inference_sec"]),
        }
        return FileResponse(
            output_path,
            media_type="image/png",
            filename="output.png",
            headers=headers,
            background=BackgroundTask(
                lambda p=output_path: os.unlink(p) if os.path.exists(p) else None,
            ),
        )

    asyncio.create_task(
        _run_t2i_img2img_job(
            job_id,
            raw,
            clean_prompt,
            strength=strength,
            steps=inference_steps,
            guidance=guidance_scale,
            seed=resolved_seed,
        ),
    )
    return JSONResponse(status_code=202, content=_t2i_job_to_dict(_get_t2i_job(job_id)))


@app.get("/i2v/jobs/{job_id}")
async def job_status(job_id: str):
    return _job_to_dict(_get_job(job_id))


@app.get("/i2v/jobs/{job_id}/download")
async def job_download(job_id: str):
    job = _get_job(job_id)
    if job.status != JobStatus.COMPLETED or not job.output_path:
        raise HTTPException(status_code=409, detail=f"job {job.status.value}")
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=410, detail="файл уже удалён")

    meta = job.meta or {}
    out_w = meta.get("output_width", TARGET_WIDTH)
    out_h = meta.get("output_height", TARGET_HEIGHT)
    headers = {
        "X-Job-Id": job.id,
        "X-Native-Resolution": f"{meta.get('native_width')}x{meta.get('native_height')}",
        "X-Output-Resolution": f"{out_w}x{out_h}",
        "X-Num-Frames": str(meta.get("num_frames", "")),
        "X-Inference-Sec": str(meta.get("inference_sec", "")),
    }
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename="output.mp4",
        headers=headers,
        background=BackgroundTask(
            lambda p=job.output_path: os.unlink(p) if p and os.path.exists(p) else None,
        ),
    )


@app.post("/i2v")
async def image_to_video(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    duration: float = Form(DEFAULT_DURATION),
    resolution: str = Form("1080p"),
    aspect_ratio: str = Form("9:16"),
    fps: int = Form(DEFAULT_FPS),
    steps: int = Form(0),
    wait: int = Query(0, ge=0, le=1, description="1 = синхронный ответ mp4 (не для прода)"),
):
    output_resolution = _normalize_output_resolution(resolution)
    inference_steps = steps if steps > 0 else None
    if steps < 0 or steps > 50:
        raise HTTPException(status_code=400, detail="steps должен быть 0–50")
    if duration <= 0 or duration > 12:
        raise HTTPException(status_code=400, detail="duration должен быть 0–12 сек")
    if fps < 8 or fps > 30:
        raise HTTPException(status_code=400, detail="fps должен быть 8–30")

    try:
        raw = await image.read()
        Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Не удалось прочитать изображение: {error}") from error

    clean_prompt = prompt.strip() or "Subtle natural motion, cinematic lighting."
    job_id = str(uuid.uuid4())
    _jobs[job_id] = Job(id=job_id, status=JobStatus.QUEUED)
    _cleanup_old_jobs()

    if wait:
        async with _gpu_lock:
            job = _get_job(job_id)
            job.status = JobStatus.RUNNING
            job.started_at = time.time()
            try:
                output_path, meta = await asyncio.to_thread(
                    _render_i2v_video,
                    raw,
                    clean_prompt,
                    duration=duration,
                    fps=fps,
                    aspect_ratio=aspect_ratio,
                    resolution=output_resolution,
                    steps=inference_steps,
                )
                job.output_path = output_path
                job.meta = meta
                job.status = JobStatus.COMPLETED
                job.finished_at = time.time()
            except Exception as error:
                job.status = JobStatus.FAILED
                job.error = str(error)
                job.finished_at = time.time()
                log.exception("Ошибка генерации")
                raise HTTPException(status_code=500, detail=str(error)) from error

        headers = {
            "X-Job-Id": job_id,
            "X-Native-Resolution": f"{meta['native_width']}x{meta['native_height']}",
            "X-Output-Resolution": f"{meta['output_width']}x{meta['output_height']}",
            "X-Num-Frames": str(meta["num_frames"]),
            "X-Inference-Sec": str(meta["inference_sec"]),
        }
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="output.mp4",
            headers=headers,
            background=BackgroundTask(
                lambda p=output_path: os.unlink(p) if os.path.exists(p) else None,
            ),
        )

    asyncio.create_task(
        _run_job(
            job_id,
            raw,
            clean_prompt,
            duration=duration,
            fps=fps,
            aspect_ratio=aspect_ratio,
            resolution=output_resolution,
            steps=inference_steps,
        ),
    )
    return JSONResponse(status_code=202, content=_job_to_dict(_get_job(job_id)))


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(status_code=500, content={"error": str(exc)})
