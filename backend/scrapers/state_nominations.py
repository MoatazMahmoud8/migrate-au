"""
State & territory nomination scraper — all 8 states/territories.
Monitors:
  - Nomination quota announcements
  - Open/closed status changes
  - EOI invite thresholds
  - New nomination streams
"""

import hashlib
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

STATES = [
    {
        "code": "NSW",
        "name": "New South Wales",
        "topic": "state_NSW",
        "url": "https://www.nsw.gov.au/topics/visas-and-migration",
        "selector": ".nsw-card__title, h2, h3, .alert",
        "icon": "🔵",
    },
    {
        "code": "VIC",
        "name": "Victoria",
        "topic": "state_VIC",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
        "selector": "h1, h2, h3, .intro, .alert, p strong, table",
        "icon": "🔵",
    },
    {
        "code": "QLD",
        "name": "Queensland",
        "topic": "state_QLD",
        "url": "https://migration.qld.gov.au/",
        "selector": "h2, h3, article p, .alert, .notice",
        "icon": "🟡",
    },
    {
        "code": "WA",
        "name": "Western Australia",
        "topic": "state_WA",
        "url": "https://migration.wa.gov.au/",
        "selector": "h2, h3, .field--name-title, .alert",
        "icon": "🟡",
    },
    {
        "code": "SA",
        "name": "South Australia",
        "topic": "state_SA",
        "url": "https://www.migration.sa.gov.au/",
        "selector": "h2, h3, .views-field-title, .alert, p",
        "icon": "🔴",
    },
    {
        "code": "TAS",
        "name": "Tasmania",
        "topic": "state_TAS",
        "url": "https://www.migration.tas.gov.au/",
        "selector": "h2, h3, article p, .alert",
        "icon": "🟢",
    },
    {
        "code": "ACT",
        "name": "Australian Capital Territory",
        "topic": "state_ACT",
        "url": "https://www.act.gov.au/migration",
        "selector": "h2, h3, .content p, .alert, article p",
        "icon": "🟣",
    },
    {
        "code": "NT",
        "name": "Northern Territory",
        "topic": "state_NT",
        "url": "https://australiasnorthernterritory.com.au/move",
        "selector": "h2, h3, .article-title, .alert, p, .card-title",
        "icon": "🟠",
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

    for state in STATES:
        src_id = f"state_{state['code']}"
        try:
            resp = session.get(state["url"], timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            elements = soup.select(state["selector"])
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:30])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src_id).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if current_hash == stored_hash:
                continue

            # Try to find a meaningful snippet (look for open/closed/quota keywords)
            keywords = ["open", "closed", "quota", "invite", "nomination", "round", "eoi"]
            body = next(
                (el.get_text(" ", strip=True)[:120]
                 for el in elements
                 if any(kw in el.get_text(strip=True).lower() for kw in keywords)),
                f"{state['name']} nomination page has been updated."
            )

            notifications.append({
                "source_id": src_id,
                "topic": state["topic"],
                "category": "State Nomination",
                "title": f"{state['icon']} {state['name']} Nomination Update",
                "body": body,
                "url": state["url"],
                "state": state["code"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "state": state["code"],
            })

            print(f"  [states] ✅ {state['code']} changed — notification queued")

        except Exception as e:
            print(f"  [states] ⚠️  {state['code']}: {e}")

    return notifications
