"""Scan Articles/ PDFs and regenerate data/articles.json."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "Articles")
OUT = os.path.join(ROOT, "data", "articles.json")

INVALID_TITLE = re.compile(
    r"\.eps$|Main_Text|^Testing$|^Abstract$|^doi:|ORCID|Crossmark|Adobe Illustrator|"
    r"antioxidants_logo|^pone\.|PowerPoint|FDA reminds",
    re.I,
)

CAT_LABELS = {
    "nad": "NAD+",
    "pdrn": "PDRN",
    "agf": "AGF",
}


def clean_title(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\\n", " ").replace("\\r", " ")
    text = re.sub(r"\\\s*n", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if "\x00" in text:
        return ""
    if INVALID_TITLE.search(text):
        return ""
    if len(text) < 8:
        return ""
    return text


def extract_from_pdf(path: str) -> dict:
    with open(path, "rb") as f:
        data = f.read(800_000)
    text = data.decode("latin-1", errors="ignore")
    title = ""

    for pattern in (
        r"/Title\s*\(([^)]+)\)",
        r"<dc:title>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]+)</rdf:li>",
        r"<pdf:Title>([^<]+)</pdf:Title>",
    ):
        match = re.search(pattern, text, re.I)
        if match:
            title = clean_title(match.group(1))
            if title:
                break

    if not title:
        match = re.search(r"/Title\s*<([0-9A-Fa-f]+)>", text)
        if match:
            try:
                title = clean_title(bytes.fromhex(match.group(1)).decode("utf-16-be", errors="ignore"))
            except ValueError:
                title = ""

    years = [int(y) for y in re.findall(r"\b(19\d{2}|20[0-2]\d)\b", text[:150_000])]
    recent_years = [y for y in years if 2000 <= y <= 2026]
    year = max(recent_years) if recent_years else (max(years) if years else 2020)

    keywords = ""
    match = re.search(r"/Keywords\s*\(([^)]+)\)", text)
    if match:
        keywords = clean_title(match.group(1))
    if keywords and len(keywords) > 200:
        keywords = keywords[:197] + "..."

    return {"title": title, "year": year, "keywords": keywords}


def num_from_filename(filename: str) -> int:
    match = re.search(r"\((\d+)\)", filename)
    return int(match.group(1)) if match else 0


def build_articles() -> list:
    articles = []
    folders = [
        ("Articles - NAD", "nad"),
        ("Articles - PDRN", "pdrn"),
        ("Articles - AGF", "agf"),
    ]

    for folder, category in folders:
        directory = os.path.join(ART, folder)
        files = sorted(
            [name for name in os.listdir(directory) if name.lower().endswith(".pdf")],
            key=num_from_filename,
        )
        label = CAT_LABELS[category]

        for filename in files:
            number = num_from_filename(filename)
            rel_path = f"Articles/{folder}/{filename}"
            meta = extract_from_pdf(os.path.join(directory, filename))

            title_en = meta["title"] or f"{label} Research Article {number}"
            title_fa = f"مقاله علمی {label} — شماره {number}"
            journal_en = "Scientific Journal"
            journal_fa = "ژورنال علمی"
            summary_en = (
                meta["keywords"]
                or f"Peer-reviewed research on {label} in aesthetic medicine and regenerative therapies."
            )
            summary_fa = f"مقاله مرجع در حوزه {label} — قابل دانلود به‌صورت PDF."

            articles.append(
                {
                    "id": f"{category}-{number:02d}",
                    "category": category,
                    "titleFa": title_fa,
                    "titleEn": title_en,
                    "year": meta["year"],
                    "journalFa": journal_fa,
                    "journalEn": journal_en,
                    "pdf": rel_path,
                    "summaryFa": summary_fa,
                    "summaryEn": summary_en,
                }
            )

    return articles


def main() -> None:
    payload = {
        "categories": {
            "nad": {"label": "NAD+", "labelFa": "NAD+"},
            "pdrn": {"label": "PDRN", "labelFa": "PDRN"},
            "agf": {"label": "AGF", "labelFa": "AGF"},
            "other": {"label": "Other", "labelFa": "سایر"},
        },
        "articles": build_articles(),
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(payload['articles'])} articles to {OUT}")


if __name__ == "__main__":
    main()
