"""
ANZSCO occupation list scraper — monitors:
  - New occupations added / removed
  - MLTSSL / STSOL / ROL list changes
  - Skills assessment authority changes
"""

import hashlib
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

SOURCES = [
    {
        "id": "anzsco_mltssl",
        "topic": "anzsco",
        "category": "ANZSCO Occupation List",
        "url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
        "link_url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
        "selector": "table, .field--name-body",
        "description": "Medium and Long-term Strategic Skills List (MLTSSL)",
    },
    {
        "id": "anzsco_stsol",
        "topic": "anzsco",
        "category": "ANZSCO Occupation List",
        "url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
        "link_url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
        "selector": "table tr td",
        "description": "Short-term Skilled Occupation List (STSOL)",
    },
    {
        "id": "anzsco_full",
        "topic": "anzsco",
        "category": "ANZSCO Classification",
        "url": "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/latest-release",
        "link_url": "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/latest-release",
        "selector": ".content-body p, table",
        "description": "Full ANZSCO classification update",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def scrape(db) -> list[dict]:
    notifications = []
    meta_ref = db.collection("_scraper_meta")
    session = requests.Session()
    session.headers.update(HEADERS)

    for src in SOURCES:
        try:
            resp = session.get(src["url"], timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            elements = soup.select(src["selector"])
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:50])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src["id"]).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if current_hash == stored_hash:
                continue

            notifications.append({
                "source_id": src["id"],
                "topic": src["topic"],
                "category": src["category"],
                "title": f"📋 {src['category']} Changed",
                "body": f"{src['description']} has been updated. Tap to see the changes.",
                "url": src.get("link_url", src["url"]),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            meta_ref.document(src["id"]).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
            })

        except Exception as e:
            print(f"  [anzsco] ⚠️  {src['id']}: {e}")

    return notifications
