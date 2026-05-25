#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Применяет data/vk-videos.json к data/content.json"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VK = ROOT / "data" / "vk-videos.json"
CONTENT = ROOT / "data" / "content.json"


def main():
    with open(VK, encoding="utf-8") as f:
        overrides = json.load(f)
    with open(CONTENT, encoding="utf-8") as f:
        data = json.load(f)

    for article in data.get("articles", []):
        aid = article["id"]
        if aid in overrides:
            article["videos"] = overrides[aid]
            print(f"  {aid}: {len(overrides[aid])} VK")

    with open(CONTENT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK -> {CONTENT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
