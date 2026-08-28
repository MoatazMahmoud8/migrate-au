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
    ("417",  "work-holiday-417"),
    ("462",  "work-holiday-462"),
    ("500",  "student-500"),
    ("590",  "student-590"),
    ("600",  "visitor-600"),
    ("820",  "partner-onshore"),
    ("300",  "prospective-marriage-300"),
    ("103",  "parent-103"),
    ("804",  "aged-parent-804"),
    ("143",  "contributory-parent-143"),
    ("864",  "contributory-aged-parent-864"),
    ("887",  "skilled-regional-887"),
    ("858",  "distinguished-talent-858"),
    ("132",  "business-talent-permanent-132"),
    ("188",  "business-innovation-and-investment-188"),
]

FEE_BASE = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing"


def scrape_fees(db) -> list[dict]:
    """
    Monitors individual visa listing pages for fee section changes.
    When a change is detected:
    1. Tries to extract the new fee amount
    2. Auto-updates Firestore visa_fees collection
    3. Returns admin notification about the auto-update
    """
    import re
    from scrapers.visa_rules_sync import extract_fee_amount, sync_fee_to_firestore, create_auto_update_notification
    
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

            fee_section = ""
            match = re.search(r'"visaCost"\s*:\s*"(.*?)"(?:,\s*"[a-z])', content, re.DOTALL)
            if match:
                fee_section = match.group(1)
            else:
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
            stored_fee = stored.get("last_fee")

            if not stored_hash:
                fee_data = extract_fee_amount(content, subclass)
                store_hash_baseline(meta_ref, src_id, current_hash, {
                    "subclass": subclass,
                    "url": url,
                    "last_fee": fee_data.get("fee") if fee_data else None,
                })
                print(f"  [fees] 📌 SC {subclass}: baseline stored")
                continue

            if current_hash == stored_hash:
                meta_ref.document(src_id).set(
                    {"last_checked": datetime.now(timezone.utc).isoformat()}, merge=True
                )
                continue

            # Fee section changed — try to extract new fee and auto-sync
            fee_data = extract_fee_amount(content, subclass)
            
            if fee_data:
                new_fee = fee_data.get("fee")
                sync_fee_to_firestore(db, subclass, fee_data)
                notifications.append(create_auto_update_notification(
                    subclass=subclass,
                    update_type="fee",
                    old_value=stored_fee,
                    new_value=new_fee,
                    url=url,
                ))
                print(f"  [fees] 🔔 SC {subclass} fee auto-updated: {stored_fee} → {new_fee}")
            else:
                normalized_fee_section = " ".join(fee_section.split())[:1000]
                notifications.append({
                    "source_id": src_id,
                    "topic": "visa_fees",
                    "category": "Visa Fee Update",
                    "title": f"💰 SC {subclass} fee page changed — manual review needed",
                    "body": (
                        f"The SC {subclass} visa listing page changed but the fee couldn't be auto-extracted. "
                        f"Please check manually and update Firestore."
                    ),
                    "url": url,
                    "state": "FED",
                    "subclass": subclass,
                    "detected_value": normalized_fee_section,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                print(f"  [fees] ⚠️ SC {subclass} changed but couldn't extract fee — manual review queued")

            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "last_fee": fee_data.get("fee") if fee_data else stored_fee,
                "subclass": subclass,
                "url": url,
            })

        except Exception as e:
            print(f"  [fees] ⚠️  SC {subclass}: {e}")

    return notifications
