"""
Playwright-based processing times scraper.
Uses headless browser to render JS-loaded content from Home Affairs.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from scrapers.baseline import store_hash_baseline

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


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def scrape_processing_times(db) -> list[dict]:
    """
    Uses Playwright to render the processing times page and extract data.
    Returns notifications for any visa subclass with changed processing times.
    """
    from playwright.sync_api import sync_playwright

    notifications = []
    meta_ref = db.collection("_scraper_meta")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = context.new_page()
            page.goto(PROCESSING_TIMES_URL, timeout=60000)
            
            # Wait for page to fully load
            page.wait_for_load_state("domcontentloaded", timeout=30000)
            
            # Give extra time for JS to execute
            page.wait_for_timeout(5000)
            
            # Try multiple selectors that might work
            selectors = ["#visastream", "#visastreambox select", "select[name*='visa']", ".form-control"]
            dropdown_found = False
            for sel in selectors:
                try:
                    if page.locator(sel).count() > 0:
                        page.wait_for_selector(sel, state="visible", timeout=15000)
                        dropdown_found = True
                        print(f"  [processing_times] Found dropdown with selector: {sel}")
                        break
                except Exception:
                    continue
            
            if not dropdown_found:
                # Log page content for debugging
                print(f"  [processing_times] Page title: {page.title()}")
                print(f"  [processing_times] Page HTML preview: {page.content()[:500]}")
                raise Exception("Could not find visa dropdown on page")

            for subclass, name in MONITORED_VISAS:
                try:
                    processing_data = _extract_visa_processing_time(page, subclass, name)
                    if not processing_data:
                        print(f"  [processing_times] ⚠️ SC {subclass}: no data found")
                        continue

                    src_id = f"processing_time_{subclass}"
                    current_hash = _hash(json.dumps(processing_data, sort_keys=True))

                    meta_doc = meta_ref.document(src_id).get()
                    stored = meta_doc.to_dict() if meta_doc.exists else {}
                    stored_hash = stored.get("hash")

                    # First time — store baseline
                    if not stored_hash:
                        store_hash_baseline(meta_ref, src_id, current_hash, {
                            "subclass": subclass,
                            "name": name,
                            "data": processing_data,
                        })
                        print(f"  [processing_times] 📌 SC {subclass}: baseline stored")
                        continue

                    if current_hash == stored_hash:
                        meta_ref.document(src_id).set(
                            {"last_checked": datetime.now(timezone.utc).isoformat()},
                            merge=True
                        )
                        continue

                    # Processing time changed!
                    old_data = stored.get("data", {})
                    change_summary = _summarize_changes(old_data, processing_data, subclass)

                    notifications.append({
                        "source_id": src_id,
                        "topic": "processing_times",
                        "category": "Processing Time",
                        "title": f"⏱️ SC {subclass} Processing Time Updated",
                        "body": change_summary,
                        "url": PROCESSING_TIMES_URL,
                        "subclass": subclass,
                        "old_data": old_data,
                        "new_data": processing_data,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

                    meta_ref.document(src_id).set({
                        "hash": current_hash,
                        "last_checked": datetime.now(timezone.utc).isoformat(),
                        "last_changed": datetime.now(timezone.utc).isoformat(),
                        "subclass": subclass,
                        "name": name,
                        "data": processing_data,
                    })
                    print(f"  [processing_times] 🔔 SC {subclass}: processing time changed!")

                except Exception as e:
                    print(f"  [processing_times] ⚠️ SC {subclass}: {e}")

            browser.close()

    except Exception as e:
        import traceback
        print(f"  [processing_times] ❌ Playwright error: {e}")
        print(f"  [processing_times] Stack: {traceback.format_exc()[:500]}")

    return notifications


def _extract_visa_processing_time(page, subclass: str, name: str) -> Optional[dict]:
    """
    Extracts processing time data for a specific visa subclass.
    Returns dict with 25%, 50%, 75%, 90% percentiles if available.
    """
    try:
        # Select the visa stream (e.g., "Work" for 189/190/491)
        stream_map = {
            "189": "Work",
            "190": "Work",
            "491": "Work",
            "485": "Work",
            "482": "Work",
            "186": "Work",
            "494": "Work",
            "500": "Study",
        }
        stream = stream_map.get(subclass, "Work")

        # Select stream dropdown
        page.select_option("#visastream", label=stream)
        page.wait_for_timeout(1500)  # Wait for subclass dropdown to populate

        # Try to find and select the visa subclass
        subclass_dropdown = page.query_selector("#visaSubclass")
        if subclass_dropdown:
            # Try different patterns for the option value
            option_found = False
            for pattern in [subclass, f"Subclass {subclass}", name]:
                try:
                    page.select_option("#visaSubclass", label=pattern)
                    option_found = True
                    break
                except Exception:
                    continue

            if not option_found:
                # Try selecting by partial match
                options = page.locator("#visaSubclass option").all()
                for opt in options:
                    text = opt.text_content() or ""
                    if subclass in text:
                        page.select_option("#visaSubclass", value=opt.get_attribute("value"))
                        option_found = True
                        break

            if not option_found:
                return None

            page.wait_for_timeout(1500)  # Wait for data to load

        # Extract the processing time table data
        table = page.query_selector("table.processing-times, .processing-time-table, table")
        if not table:
            # Try to find any displayed processing time content
            content = page.query_selector(".processing-content, .visa-processing")
            if content:
                text = content.text_content()
                return {"raw_text": text.strip()[:500]}
            return None

        rows = table.query_selector_all("tr")
        data = {}
        for row in rows:
            cells = row.query_selector_all("td, th")
            if len(cells) >= 2:
                label = (cells[0].text_content() or "").strip().lower()
                value = (cells[1].text_content() or "").strip()
                if "25%" in label or "25 per" in label:
                    data["p25"] = value
                elif "50%" in label or "50 per" in label or "median" in label:
                    data["p50"] = value
                elif "75%" in label or "75 per" in label:
                    data["p75"] = value
                elif "90%" in label or "90 per" in label:
                    data["p90"] = value

        if data:
            return data

        # Fallback: grab all table text
        return {"raw_text": table.text_content().strip()[:500]}

    except Exception as e:
        print(f"  [processing_times] Extract error for {subclass}: {e}")
        return None


def _summarize_changes(old: dict, new: dict, subclass: str) -> str:
    """Creates a human-readable summary of what changed."""
    changes = []

    for key in ["p25", "p50", "p75", "p90"]:
        old_val = old.get(key, "N/A")
        new_val = new.get(key, "N/A")
        if old_val != new_val:
            label = key.replace("p", "").strip() + "%"
            changes.append(f"{label}: {old_val} → {new_val}")

    if changes:
        return f"SC {subclass}: " + ", ".join(changes)

    # Raw text comparison
    old_text = old.get("raw_text", "")[:100]
    new_text = new.get("raw_text", "")[:100]
    if old_text != new_text:
        return f"SC {subclass} processing times have been updated. Check the website for details."

    return f"SC {subclass} processing time data changed."
