"""Monitor official assessing-authority fee pages for migration skills assessment changes.

This catches updates like the VETASSESS professional skills assessment fee increase
that were previously missed because the database only monitored Home Affairs and
visa pages, not the assessing bodies themselves.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any

import requests
from bs4 import BeautifulSoup


AUTHORITY_SOURCES = {
    "VETASSESS": {
        "name": "VETASSESS",
        "url": "https://www.vetassess.com.au/skills-assessment-for-migration/professional-occupations/skills-assessment-fees-for-professional-occupations",
        "slug": "vetassess_professional_fees",
    },
}


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def _normalize_money(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace("&nbsp;", " ")
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text if re.search(r"\$\d", text) else None


def _extract_vetassess_fees(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[list[str]] = []
    for row in soup.select("table tr"):
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
        if cells:
            rows.append(cells)

    fee_map: dict[str, str] = {}
    for cells in rows:
        row_text = " ".join(cells).lower()
        if not cells or len(cells) < 2:
            continue
        if "online application" in row_text:
            value = _normalize_money(cells[1]) or _normalize_money(cells[-1])
            if value:
                fee_map["standard"] = value
        if "priority processing fee" in row_text:
            value = _normalize_money(cells[1]) or _normalize_money(cells[-1])
            if value:
                fee_map["priority_processing"] = value
        if "appeal" in row_text and "fee" in row_text:
            value = _normalize_money(cells[1]) or _normalize_money(cells[-1])
            if value:
                fee_map["appeal"] = value

    if not fee_map:
        for label, pattern in [
            ("standard", r"Online application.*?(AUD\s*\$[\d,]+(?:\.\d+)?)"),
            ("priority_processing", r"Priority Processing Fee.*?(AUD\s*\$[\d,]+(?:\.\d+)?)"),
            ("appeal", r"Appeal.*?(AUD\s*\$[\d,]+(?:\.\d+)?)"),
        ]:
            match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
            if match:
                fee_map[label] = match.group(1).strip()

    return fee_map


def _increment_rules_version(db):
    try:
        from google.cloud.firestore import Increment

        db.collection("rules_version").document("current").set({
            "version": Increment(1),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }, merge=True)
    except Exception:
        pass


def scrape(db) -> list[dict]:
    """Check official authority fee pages for changes and return notification payloads."""
    notifications: list[dict] = []
    meta_ref = db.collection("_scraper_meta")
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; MigrateAU/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })

    for authority, cfg in AUTHORITY_SOURCES.items():
        url = cfg["url"]
        source_id = cfg["slug"]
        try:
            resp = session.get(url, timeout=20)
            resp.raise_for_status()
            html = resp.text
            fees = _extract_vetassess_fees(html)
            if not fees:
                continue

            current_text = " | ".join(f"{k}:{v}" for k, v in sorted(fees.items()))
            current_hash = _hash_text(current_text)
            stored_doc = meta_ref.document(source_id).get()
            stored = stored_doc.to_dict() if stored_doc.exists else {}
            previous_hash = stored.get("hash")
            previous_fees = stored.get("fees") or {}

            payload = {
                "authority": authority,
                "url": url,
                "fees": fees,
                "lastScraped": datetime.now(timezone.utc).isoformat(),
                "hash": current_hash,
            }
            db.collection("skill_assessment_fees").document(authority).set(payload, merge=True)
            meta_ref.document(source_id).set(payload, merge=True)

            if previous_hash and previous_hash != current_hash:
                old_standard = previous_fees.get("standard") or "unknown"
                old_priority = previous_fees.get("priority_processing") or "unknown"
                new_standard = fees.get("standard") or "unknown"
                new_priority = fees.get("priority_processing") or "unknown"

                notifications.append({
                    "source_id": source_id,
                    "topic": "au_migration",
                    "category": "Assessment Fee Update",
                    "title": f"💰 {authority} assessment fees changed",
                    "body": (
                        f"Professional skills assessment fees changed: standard fee {old_standard} → {new_standard}; "
                        f"priority processing {old_priority} → {new_priority}. Review the official fee page."
                    ),
                    "url": url,
                    "state": "FED",
                    "authority": authority,
                    "previousFees": previous_fees,
                    "newFees": fees,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                _increment_rules_version(db)

            elif not previous_hash:
                meta_ref.document(source_id).set({
                    "hash": current_hash,
                    "fees": fees,
                    "lastScraped": datetime.now(timezone.utc).isoformat(),
                }, merge=True)

        except Exception as exc:
            print(f"  [assessing_authority_fees] ⚠️ {authority}: {exc}")

    return notifications
