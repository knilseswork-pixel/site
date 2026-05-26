#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Копирует data/content.json → js/content-data.js (запасной источник на сайте)"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "data" / "content.json"
dst = ROOT / "js" / "content-data.js"

data = json.loads(src.read_text(encoding="utf-8"))
dst.write_text(
    "window.WORKOUT_CONTENT = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print("OK:", dst, "—", len(data.get("articles", [])), "материалов")
