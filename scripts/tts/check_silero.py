#!/usr/bin/env python3
import json
import sys


def main() -> int:
    try:
        import torch  # noqa: F401
    except ImportError:
        print(json.dumps({"ok": False, "error": "torch not installed"}), flush=True)
        return 1

    print(json.dumps({"ok": True, "provider": "silero"}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
