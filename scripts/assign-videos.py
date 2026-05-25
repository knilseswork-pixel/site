#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сопоставляет файлы из папки video/ с разделами сайта по названию.
Запуск: python scripts/assign-videos.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "video"
CONTENT_JSON = ROOT / "data" / "content.json"
VK_OVERRIDES_JSON = ROOT / "data" / "vk-videos.json"

# Порядок проверки (от более специфичных к общим)
ARTICLE_RULES = [
    ("warmup-2", re.compile(r"разминка\s+и\s+разогрев\s+доп", re.I)),
    ("warmup", re.compile(r"разминка\s+и\s+разогрев", re.I)),
    ("recommendations", re.compile(r"рекомендации\s+по\s+тренировочному", re.I)),
    ("prep-level", re.compile(r"подготовительн", re.I)),
    ("beginner-level", re.compile(r"начальн", re.I)),
    ("middle-level", re.compile(r"средн", re.I)),
    ("advanced-level", re.compile(r"продвинут", re.I)),
]

EXERCISE_ORDER = {"подтягивания": 0, "отжимания": 1}


def detect_article_id(name: str) -> str | None:
    low = name.lower().replace(".mp4", "")
    for article_id, pattern in ARTICLE_RULES:
        if pattern.search(low):
            return article_id
    return None


def video_title(filename: str) -> str:
    base = filename.replace(".mp4", "").replace(".MP4", "")
    low = base.lower()
    m = re.search(r"(\d+)\s*$", base)
    num = m.group(1) if m else ""

    if "подтягивания" in low:
        return f"Подтягивания — видео {num}".strip(" —")
    if "отжимания" in low:
        return f"Отжимания — видео {num}".strip(" —")
    if "разминка" in low:
        return f"Разминка — видео {num}".strip(" —")
    if "рекомендации" in low:
        return f"Рекомендации — видео {num}".strip(" —")
    return base


def sort_key(item: dict) -> tuple:
    title_low = item["title"].lower()
    exercise = 2
    for key, order in EXERCISE_ORDER.items():
        if key in title_low:
            exercise = order
            break
    num_m = re.search(r"(\d+)", item.get("src", ""))
    num = int(num_m.group(1)) if num_m else 0
    return (exercise, num)


def collect_videos() -> dict[str, list[dict]]:
    by_article: dict[str, list[dict]] = {}
    if not VIDEO_DIR.is_dir():
        print(f"Папка не найдена: {VIDEO_DIR}")
        return by_article

    for path in sorted(VIDEO_DIR.glob("*.mp4")):
        article_id = detect_article_id(path.name)
        if not article_id:
            print(f"  ⚠ не сопоставлено: {path.name}")
            continue
        entry = {
            "title": video_title(path.name),
            "src": f"video/{path.name}",
        }
        by_article.setdefault(article_id, []).append(entry)

    for aid in by_article:
        by_article[aid].sort(key=sort_key)

    return by_article


def main():
    if not CONTENT_JSON.exists():
        print("Нет data/content.json")
        return 1

    with open(CONTENT_JSON, encoding="utf-8") as f:
        data = json.load(f)

    mapping = collect_videos()
    vk_overrides = {}
    if VK_OVERRIDES_JSON.exists():
        with open(VK_OVERRIDES_JSON, encoding="utf-8") as f:
            vk_overrides = json.load(f)

    total = 0

    for article in data.get("articles", []):
        aid = article["id"]
        if aid in vk_overrides:
            article["videos"] = vk_overrides[aid]
            total += len(article["videos"])
            print(f"  {aid}: {len(article['videos'])} видео (VK)")
            continue
        videos = mapping.get(aid, [])
        article["videos"] = videos
        total += len(videos)
        if videos:
            print(f"  {aid}: {len(videos)} видео")

    with open(CONTENT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nВсего привязано: {total} видео -> {CONTENT_JSON}")
    unmapped = set(mapping.keys()) - {a["id"] for a in data.get("articles", [])}
    if unmapped:
        print("Лишние ключи:", unmapped)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
