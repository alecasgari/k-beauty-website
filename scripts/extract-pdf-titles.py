"""Extract titles from article PDFs for manual review."""
import json
import os
import re
import sys

from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "articles.json")

PLACEHOLDER = re.compile(r"Research Article \d+$", re.I)


def clean_line(line: str) -> str:
    line = re.sub(r"\s+", " ", line).strip()
    return line


def extract_title_from_text(text: str) -> str:
    lines = [clean_line(l) for l in text.split("\n") if clean_line(l)]
    candidates = []

    for i, line in enumerate(lines[:40]):
        if len(line) < 20 or len(line) > 300:
            continue
        lower = line.lower()
        if any(
            skip in lower
            for skip in (
                "abstract",
                "introduction",
                "keywords",
                "correspondence",
                "received",
                "accepted",
                "published",
                "copyright",
                "http",
                "www.",
                "doi:",
                "volume",
                "issn",
                "article type",
                "open access",
                "review article",
                "original article",
                "case report",
                "research article",
            )
        ):
            continue
        if re.match(r"^\d+$", line):
            continue
        if re.match(r"^[A-Z\s]{3,}$", line) and len(line) < 40:
            continue
        # title-like: starts with capital, has spaces
        if re.match(r"^[A-Z0-9]", line) and " " in line:
            score = len(line)
            # prefer earlier lines
            score += max(0, 30 - i) * 2
            # penalize author-like lines (many commas or et al)
            if " et al" in lower or line.count(",") > 3:
                score -= 50
            candidates.append((score, line))

    if not candidates:
        return ""

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def get_pdf_title(path: str) -> dict:
    reader = PdfReader(path)
    meta = reader.metadata or {}

    title = ""
    if meta.title:
        title = clean_line(str(meta.title))

    if not title or PLACEHOLDER.search(title) or title.lower() in ("abstract", "main_text", "testing"):
        title = ""

    if not title:
        for key in ("/Title", "title"):
            val = getattr(meta, key, None) if hasattr(meta, key) else None
            if val:
                title = clean_line(str(val))
                break

    first_pages_text = ""
    for i in range(min(2, len(reader.pages))):
        try:
            first_pages_text += reader.pages[i].extract_text() or ""
            first_pages_text += "\n"
        except Exception:
            pass

    text_title = extract_title_from_text(first_pages_text)

    if not title and text_title:
        title = text_title

    # multi-line title: join first short lines at start
    if not title and first_pages_text:
        lines = [clean_line(l) for l in first_pages_text.split("\n") if clean_line(l)]
        merged = []
        for line in lines[:6]:
            if len(line) < 15:
                continue
            if any(x in line.lower() for x in ("abstract", "keywords", "introduction")):
                break
            merged.append(line)
            if len(" ".join(merged)) > 40:
                break
        if merged:
            title = " ".join(merged[:3])

    return {
        "meta_title": clean_line(str(meta.title)) if meta.title else "",
        "extracted": title,
        "preview": first_pages_text[:500].replace("\n", " | "),
    }


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    for article in data["articles"]:
        if not PLACEHOLDER.search(article["titleEn"]):
            continue
        pdf_path = os.path.join(ROOT, article["pdf"].replace("/", os.sep))
        print("=" * 80)
        print(article["id"], article["pdf"])
        if not os.path.isfile(pdf_path):
            print("  MISSING FILE")
            continue
        result = get_pdf_title(pdf_path)
        print("  meta:", result["meta_title"][:120])
        print("  extracted:", result["extracted"][:200])
        print("  preview:", result["preview"][:300])


if __name__ == "__main__":
    main()
