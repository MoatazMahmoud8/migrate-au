"""
Home Affairs scraper — monitors:
  - Visa policy updates & announcements
  - Points test (EOI) changes
  - SkillSelect invitation rounds
  - General migration policy news
"""

import hashlib
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

SOURCES = [
    {
        "id": "home_affairs_news",
        "topic": "au_migration",
        "category": "Policy Update",
        "url": "https://immi.homeaffairs.gov.au/what-we-do/migration-program/migration-program-news",
        "selector": ".news-listing__item, article.listing-item, .field--name-title",
        "title_attr": None,  # use text
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "home_affairs_visas",
        "topic": "au_migration",
        "category": "Visa Change",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
        "selector": ".last-updated, .alert, .field--name-body p",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "skillselect_rounds",
        "topic": "skillselect",
        "category": "SkillSelect Round",
        "url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds",
        "selector": "table tr, .invitation-round, h3",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "points_test",
        "topic": "au_migration",
        "category": "Points Test",
        "url": "https://immi.homeaffairs.gov.au/points-test/points-calculator",
        "selector": "table, .field--name-body",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "processing_times",
        "topic": "processing_times",
        "category": "Processing Time",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times",
        "selector": "table tr",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-AU,en;q=0.9",
}


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def scrape(db) -> list[dict]:
    """Returns list of new notification payloads."""
    notifications = []
    meta_ref = db.collection("_scraper_meta")

    for src in SOURCES:
        try:
            resp = requests.get(src["url"], headers=HEADERS, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            elements = soup.select(src["selector"])
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:20])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src["id"]).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if current_hash == stored_hash:
                continue  # no change

            # Extract a meaningful title from the first changed element
            first = elements[0].get_text(" ", strip=True) if elements else "Update detected"
            title_text = first[:80] if first else "Home Affairs Update"

            notifications.append({
                "source_id": src["id"],
                "topic": src["topic"],
                "category": src["category"],
                "title": f"🇦🇺 {src['category']} — Home Affairs",
                "body": title_text,
                "url": src["url"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            # Update stored hash
            meta_ref.document(src["id"]).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
            })

        except Exception as e:
            print(f"  [home_affairs] ⚠️  {src['id']}: {e}")

    return notifications
