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

from scrapers.baseline import store_hash_baseline

SOURCES = [
    {
        "id": "home_affairs_news",
        "topic": "au_migration",
        "category": "Policy Update",
        "url": "https://immi.homeaffairs.gov.au/news-media",
        "link_url": "https://immi.homeaffairs.gov.au/news-media",
        "selector": "article, .news-item, h2, h3, .field--name-title, p strong",
        "title_attr": None,  # use text
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "home_affairs_visas",
        "topic": "au_migration",
        "category": "Visa Change",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
        "link_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
        "selector": ".last-updated, .alert, .field--name-body p",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "skillselect_rounds",
        "topic": "skillselect",
        "category": "SkillSelect Round",
        "url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds",
        "link_url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds",
        "selector": "table tr, .invitation-round, h3",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "points_test",
        "topic": "au_migration",
        "category": "Points Test",
        # Scrape SkillSelect main page for changes; link users to the actual points calculator tool
        "url": "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect",
        "link_url": "https://immi.homeaffairs.gov.au/help-support/tools/points-calculator",
        "selector": "table, .field--name-body, h2, h3, .alert",
        "title_attr": None,
        "base_url": "https://immi.homeaffairs.gov.au",
    },
    {
        "id": "processing_times",
        "topic": "processing_times",
        "category": "Processing Time",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times",
        "link_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times",
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
    """Returns list of new notification payloads."""
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
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:20])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src["id"]).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if not stored_hash:
                store_hash_baseline(meta_ref, src["id"], current_hash)
                print(f"  [home_affairs] 📌 {src['id']}: baseline stored")
                continue

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
                "url": src.get("link_url", src["url"]),
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


# ── Visa fee monitoring ────────────────────────────────────────────────────────
# Each entry maps a visa subclass to its DHA listing page.
# We hash the fee-bearing section of the page (the visaCost JSON field embedded
# in the page source). When the hash changes we queue an admin-review notification
# so the admin can verify and update visa-fees.json.

FEE_VISAS = [
    ("189",  "skilled-independent-189"),
    ("190",  "skilled-nominated-190"),
    ("491",  "skilled-work-regional-provisional-491"),
    ("191",  "skilled-regional-191"),
    ("485",  "temporary-graduate-485"),
    ("482",  "temporary-skill-shortage-482"),
    ("186",  "employer-nomination-scheme-186"),
    ("494",  "skilled-employer-sponsored-regional-494"),
    ("417",  "working-holiday-417"),
    ("462",  "work-and-holiday-462"),
    ("500",  "student-500"),
    ("590",  "student-guardian-590"),
    ("600",  "visitor-600"),
    ("820",  "partner-820-801"),
    ("300",  "prospective-marriage-300"),
    ("103",  "parent-103"),
    ("804",  "aged-parent-804"),
    ("143",  "contributory-parent-143"),
    ("864",  "contributory-aged-parent-864-884"),
    ("887",  "skilled-regional-887"),
    ("858",  "distinguished-talent-858"),
    ("132",  "business-talent-132"),
    ("188",  "business-innovation-and-investment-188"),
]

FEE_BASE = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing"


def scrape_fees(db) -> list[dict]:
    """
    Monitors individual visa listing pages for fee section changes.
    Returns admin-review notifications for any visa whose fee section changed.
    Fee changes need human verification — we can't reliably extract the exact
    new amount from server-rendered HTML (DHA loads prices via JavaScript).
    """
    import re
    notifications = []
    meta_ref = db.collection("_scraper_meta")
    session = requests.Session()
    session.headers.update(HEADERS)

    for subclass, slug in FEE_VISAS:
        src_id = f"visa_fee_{subclass}"
        url = f"{FEE_BASE}/{slug}"
        try:
            resp = session.get(url, timeout=20)
            resp.raise_for_status()
            content = resp.text

            # The DHA page embeds fee data in a JSON blob inside the page HTML.
            # Extract everything between "visaCost" and the next top-level key —
            # this contains the fee amount even before JS renders it.
            fee_section = ""
            match = re.search(r'"visaCost"\s*:\s*"(.*?)"(?:,\s*"[a-z])', content, re.DOTALL)
            if match:
                fee_section = match.group(1)
            else:
                # Fallback: hash the whole page cost-related section
                soup = BeautifulSoup(content, "html.parser")
                fee_section = " ".join(
                    el.get_text(" ", strip=True)
                    for el in soup.select(
                        "[data-svpattribute], .visa-cost, #visa-cost, "
                        ".field--name-field-visa-cost, .cost-section"
                    )
                ) or content[content.find("visaCost"):content.find("visaCost") + 500]

            if not fee_section.strip():
                continue

            current_hash = _hash(fee_section)
            meta_doc = meta_ref.document(src_id).get()
            stored = meta_doc.to_dict() if meta_doc.exists else {}
            stored_hash = stored.get("hash")

            # First time seeing this page — store hash, no notification
            if not stored_hash:
                store_hash_baseline(meta_ref, src_id, current_hash, {
                    "subclass": subclass,
                    "url": url,
                })
                print(f"  [fees] 📌 SC {subclass}: baseline stored")
                continue

            if current_hash == stored_hash:
                meta_ref.document(src_id).set(
                    {"last_checked": datetime.now(timezone.utc).isoformat()}, merge=True
                )
                continue

            # Fee section changed — queue for admin review
            normalized_fee_section = " ".join(fee_section.split())[:1000]
            notifications.append({
                "source_id": src_id,
                "topic": "visa_fees",
                "category": "Visa Fee Update",
                "title": f"💰 SC {subclass} fee page changed — verify fee",
                "body": (
                    f"The SC {subclass} visa listing page fee section has changed on immi.homeaffairs.gov.au. "
                    f"Please check the current fee and update visa-fees.json if needed."
                ),
                "url": url,
                "state": "FED",
                "subclass": subclass,
                "detected_value": normalized_fee_section,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "subclass": subclass,
                "url": url,
            })
            print(f"  [fees] 🔔 SC {subclass} fee section changed — admin notification queued")

        except Exception as e:
            print(f"  [fees] ⚠️  SC {subclass}: {e}")

    return notifications
