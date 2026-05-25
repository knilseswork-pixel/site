#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Извлекает текст из «Документ Microsoft Word.docx» и обновляет data/content.json.
Запуск: python scripts/build-content.py
"""

import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCX_GLOB = "*.docx"
OUT_JSON = ROOT / "data" / "content.json"

# Соответствие заголовков в Word → id статей на сайте
SECTION_MAP = {
    "организация тренировочного": "org-process",
    "подготовительный": "prep-level",
    "разминка": "warmup",
    "продвинутый": "advanced-level",
    "рекомендации": "recommendations",
    "средний уровень": "middle-level",
    "начальный уровень": "beginner-level",
}


def extract_paragraphs(docx_path: Path) -> list[str]:
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml")
    import xml.etree.ElementTree as ET

    root = ET.fromstring(xml)
    W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paras = []
    for p in root.iter(W + "p"):
        parts = []
        for t in p.iter(W + "t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        text = "".join(parts).strip()
        if text:
            paras.append(text)
    return paras


def parse_videos(text: str) -> list[dict]:
    videos = []
    iframe = re.search(
        r'<iframe[^>]+src=["\']([^"\']+)["\']',
        text,
        re.I,
    )
    if iframe:
        title = "Видео"
        before = text[: iframe.start()].strip()
        after = text[iframe.end() :].strip()
        if before:
            title = before
        elif after:
            m = re.match(r"^([^\s<]+)", after)
            if m:
                title = m.group(1)
        videos.append({"title": title, "embed": iframe.group(1)})
    return videos


def merge_docx_into_json(paras: list[str], data: dict) -> dict:
    """Первый абзац Word → org-process; остальное по ключевым словам."""
    articles = {a["id"]: a for a in data.get("articles", [])}

    if paras:
        first = paras[0]
        if "org-process" in articles:
            body = []
            for p in paras[1:]:
                if parse_videos(p):
                    continue
                if p.upper().startswith("ПРИМЕР"):
                    body.append("**Пример расписания:**\n\n" + p.replace("ПРИМЕР:", "").strip())
                else:
                    body.append(p)
            if body:
                articles["org-process"]["body"] = body[:5]

        # Подготовительный уровень — абзац про упражнения
        for p in paras:
            low = p.lower()
            if "упражнения данного уровня" in low and "prep-level" in articles:
                articles["prep-level"]["body"] = [p]
                if "научить" in p or "техник" in p:
                    articles["prep-level"]["body"].append(
                        "Основная задача тренера — правильная техника с первого занятия."
                    )
            if "подтягивания" in low.lower() and "prep-level" in articles:
                vids = parse_videos(p)
                if not vids and "iframe" in p:
                    vids = parse_videos(p + " ")
                iframe = re.search(r'src=["\']([^"\']+vk\.com[^"\']+)["\']', p)
                if iframe:
                    articles["prep-level"].setdefault("videos", []).append(
                        {"title": "Подтягивания", "embed": iframe.group(1)}
                    )

    data["articles"] = list(articles.values())
    return data


def main():
    docx_files = list(ROOT.glob(DOCX_GLOB))
    if not docx_files:
        print("Word-файл не найден в корне проекта.")
        return 1

    docx = docx_files[0]
    paras = extract_paragraphs(docx)
    print(f"Извлечено абзацев: {len(paras)} из {docx.name}")

    if OUT_JSON.exists():
        with open(OUT_JSON, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"site": {}, "articles": []}

    data = merge_docx_into_json(paras, data)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Обновлено: {OUT_JSON}")

    assign = Path(__file__).parent / "assign-videos.py"
    if assign.exists():
        import importlib.util
        spec = importlib.util.spec_from_file_location("assign_videos", assign)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.main()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
