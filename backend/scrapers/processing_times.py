"""
Processing times scraper.

Previously this scraped the global visa-processing-times page's rendered
HTML and only hashed a handful of loose "X months" text mentions to detect
*that* something on the page changed -- it never extracted real per-subclass
values, so the actual `visa_processing_times` Firestore collection was never
auto-updated and stayed frozen at its one-time seed data (discovered stale
by ~3 months in production).

That page's real numbers are rendered client-side via an AJAX call to a
public DHA SharePoint API, which we can call directly for structured,
official, per-subclass/per-stream data:

    POST /_layouts/15/api/GPT.aspx/GetVisaGlobalProcessingTime
    {"gptRequest": [{"VisaSubclassCode": "189", "StreamCode": ""}]}

This module now calls that API per monitored subclass, auto-syncs genuine
changes to Firestore (via visa_rules_sync.sync_processing_time_to_firestore,
which also bumps rules_version so the app refreshes), and queues an admin
notification for each subclass that changed.
"""

import json
from datetime import datetime, timezone
from typing import Optional

# Visa subclasses we monitor for processing time changes
MONITORED_VISAS = [
    ("189", "Skilled Independent"),
    ("190", "Skilled Nominated"),
    ("491", "Skilled Work Regional"),
    ("485", "Temporary Graduate"),
    ("482", "Temporary Skill Shortage"),
    ("186", "Employer Nomination Scheme"),
    ("494", "Skilled Employer Sponsored Regional"),
    ("500", "Student"),
]

PROCESSING_TIMES_URL = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times"
GPT_API_URL = "https://immi.homeaffairs.gov.au/_layouts/15/api/GPT.aspx/GetVisaGlobalProcessingTime"


def _fetch_gpt_records(scraper, subclass: str) -> list[dict]:
    """Call the official GPT.aspx API for one subclass (all streams)."""
    payload = {"gptRequest": [{"VisaSubclassCode": subclass, "StreamCode": ""}]}
    headers = {"Content-Type": "application/json; charset=UTF-8", "Accept": "application/json"}
    resp = scraper.post(GPT_API_URL, data=json.dumps(payload), headers=headers, timeout=20)
    resp.raise_for_status()
    body = resp.json().get("d", {})
    if not body.get("success"):
        return []
    return body.get("data") or []


def _normalize_duration(text: Optional[str]) -> Optional[str]:
    """Pass through a real duration string; return None for the API's
    'Processing times are not available' placeholder (older/retired
    streams DHA hasn't retired from the response yet) so those are
    skipped rather than stored as bogus values."""
    if not text or "not available" in text.lower():
        return None
    return text.strip()


def _streams_from_gpt(records: list[dict]) -> list[dict]:
    streams = []
    for record in records:
        p50 = _normalize_duration(record.get("Percent50"))
        p90 = _normalize_duration(record.get("Percent90"))
        if not p50 or not p90:
            continue
        streams.append({
            "name": record.get("StreamText") or "Standard",
            "p50": p50,
            "p90": p90,
        })
    return streams


def scrape_processing_times(db) -> list[dict]:
    """
    Fetches current per-subclass/per-stream processing times from the
    official GPT API and auto-syncs any real change to Firestore.
    Returns admin notifications for subclasses whose data changed.
    """
    import cloudscraper
    from scrapers.visa_rules_sync import sync_processing_time_to_firestore, create_auto_update_notification

    notifications = []
    scraper = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "desktop": True},
        delay=3,
    )

    for subclass, label in MONITORED_VISAS:
        try:
            records = _fetch_gpt_records(scraper, subclass)
            streams = _streams_from_gpt(records)
            if not streams:
                print(f"  [processing_times] SC {subclass} ({label}): no numeric data available from GPT API")
                continue

            existing_doc = db.collection("visa_processing_times").document(subclass).get()
            existing = existing_doc.to_dict() if existing_doc.exists else {}
            existing_streams = existing.get("streams") or []

            if existing_streams == streams:
                print(f"  [processing_times] SC {subclass} ({label}): no change")
                continue

            now_iso = datetime.now(timezone.utc).isoformat()
            time_data = {
                "streams": streams,
                "updated_at": now_iso,
                "updatedAt": now_iso,
                "lastUpdated": now_iso,
                "lastScraped": now_iso,
            }

            if sync_processing_time_to_firestore(db, subclass, time_data):
                old_preview = (
                    f"{existing_streams[0]['p50']} / {existing_streams[0]['p90']}"
                    if existing_streams else "no prior data"
                )
                new_preview = f"{streams[0]['p50']} / {streams[0]['p90']}"
                notifications.append(create_auto_update_notification(
                    subclass, "processing_time", old_preview, new_preview, PROCESSING_TIMES_URL,
                ))
        except Exception as e:
            import traceback
            print(f"  [processing_times] ❌ SC {subclass} ({label}) error: {e}")
            print(f"  [processing_times] Stack: {traceback.format_exc()[:300]}")

    return notifications
