#!/usr/bin/env python3
"""Проверка: доступен ли Depth Anything V2 (transformers + torch)."""
import json
import sys


def accelerator_info():
    import torch

    if torch.cuda.is_available():
        return {
            "accelerator": "cuda",
            "cuda": True,
            "mps": False,
            "device": torch.cuda.get_device_name(0),
        }
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return {
            "accelerator": "mps",
            "cuda": False,
            "mps": True,
            "device": "Apple Metal (MPS)",
        }
    return {
        "accelerator": "cpu",
        "cuda": False,
        "mps": False,
        "device": None,
    }


def main() -> None:
    try:
        from transformers import pipeline  # noqa: F401

        payload = {"ok": True, **accelerator_info()}
    except Exception as error:  # noqa: BLE001
        payload = {"ok": False, "error": str(error)}
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
