#!/usr/bin/env python3
"""Проверка: доступен ли Depth Anything V2 (transformers + torch)."""
import json
import sys


def main() -> None:
    try:
        import torch
        from transformers import pipeline  # noqa: F401

        payload = {
            "ok": True,
            "cuda": bool(torch.cuda.is_available()),
            "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }
    except Exception as error:  # noqa: BLE001
        payload = {"ok": False, "error": str(error)}
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
