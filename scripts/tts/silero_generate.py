#!/usr/bin/env python3
"""Silero TTS v5 (ru) — локальная нейро-озвучка с мужскими/женскими голосами."""
import json
import sys
import wave

import torch


def write_wav(path: str, audio, sample_rate: int) -> None:
    tensor = audio if hasattr(audio, "detach") else torch.tensor(audio)
    samples = tensor.detach().cpu().numpy()
    if samples.ndim > 1:
        samples = samples.squeeze()
    pcm = (samples * 32767).clip(-32768, 32767).astype("int16")

    with wave.open(path, "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        print(json.dumps({"ok": False, "error": f"bad json: {error}"}), flush=True)
        return 1

    text = str(payload.get("text", "")).strip()
    speaker = str(payload.get("speaker", "xenia")).strip()
    output_path = str(payload.get("outputPath", "")).strip()
    sample_rate = int(payload.get("sampleRate", 48000))

    if not text or not output_path:
        print(json.dumps({"ok": False, "error": "text and outputPath required"}), flush=True)
        return 1

    allowed = {"aidar", "baya", "kseniya", "xenia", "eugene"}
    if speaker not in allowed:
        print(json.dumps({"ok": False, "error": f"unknown speaker: {speaker}"}), flush=True)
        return 1

    device = torch.device("cpu")
    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models",
        model="silero_tts",
        language="ru",
        speaker="v5_ru",
        trust_repo=True,
    )
    model.to(device)

    audio = model.apply_tts(text=text, speaker=speaker, sample_rate=sample_rate)
    write_wav(output_path, audio, sample_rate)

    print(
        json.dumps(
            {
                "ok": True,
                "provider": "silero",
                "speaker": speaker,
                "sampleRate": sample_rate,
                "outputPath": output_path,
            }
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
