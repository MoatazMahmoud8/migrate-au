"""
Processing times scraper — attempts multiple methods to scrape Home Affairs.
Falls back to cloudscraper if Playwright is blocked.
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
    Attempts to scrape processing times using cloudscraper.
    Returns notifications for any visa subclass with changed processing times.
    """
    import cloudscraper
    from bs4 import BeautifulSoup
    
    notifications = []
    meta_ref = db.collection("_scraper_meta")

    try:
        # Use cloudscraper to bypass Cloudflare
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            },
            delay=5
        )
        
        response = scraper.get(PROCESSING_TIMES_URL, timeout=30)
        
        if response.status_code != 200:
            print(f"  [processing_times] ⚠️ HTTP {response.status_code}")
            return notifications
            
        html = response.text
        
        # Log response info for debugging
        print(f"  [processing_times] Response length: {len(html)} chars")
        # Show first non-empty chars
        clean_html = html.strip()[:300]
        print(f"  [processing_times] Preview: {clean_html}")
        
        # Check if we got blocked
        if "Access Denied" in html or "blocked" in html.lower() or "challenge" in html.lower():
            print(f"  [processing_times] ⚠️ Access blocked by WAF/Cloudflare")
            return notifications
        
        # Check if it's the real page
        if "immi.homeaffairs.gov.au" not in html and "processing" not in html.lower():
            print(f"  [processing_times] ⚠️ Page doesn't look like Home Affairs")
            return notifications
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract any visible processing time information
        # The page structure may have changed, so we look for common patterns
        processing_content = []
        
        # Look for embedded JSON data (common in SharePoint pages)
        import re
        
        # Look for JSON containing processing time data
        json_patterns = [
            r'"processingTime[^"]*"\s*:\s*"([^"]+)"',
            r'"VisaProcessingTime[^"]*"\s*:\s*"([^"]+)"',
            r'months?\s*to\s*\d+\s*months?',
            r'\d+\s*months?\s*to\s*\d+\s*months?',
        ]
        
        for pattern in json_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                print(f"  [processing_times] Found matches for {pattern[:30]}: {matches[:3]}")
                processing_content.extend(matches[:10])
        
        # Also check for script tags with data
        scripts = soup.find_all("script", type="application/json")
        print(f"  [processing_times] Found {len(scripts)} JSON script tags")
        
        # Look for any text mentioning months
        month_mentions = re.findall(r'\d+\s*(?:to\s*\d+\s*)?months?', html, re.IGNORECASE)
        if month_mentions:
            print(f"  [processing_times] Month mentions: {month_mentions[:5]}")
            processing_content.extend(month_mentions[:20])
        
        # Look for tables with processing data
        tables = soup.find_all("table")
        print(f"  [processing_times] Found {len(tables)} tables")
        for i, table in enumerate(tables[:5]):  # Check first 5 tables
            rows = table.find_all("tr")
            for row in rows[:3]:  # First 3 rows for preview
                cells = row.find_all(["td", "th"])
                if cells:
                    row_text = " | ".join(c.get_text(strip=True) for c in cells)
                    if any(kw in row_text.lower() for kw in ["month", "day", "week", "%", "processing"]):
                        processing_content.append(row_text)
        
        # Also look for specific visa sections
        visa_sections = soup.select(".visa-processing, .processing-time, [class*='processing']")
        for section in visa_sections:
            processing_content.append(section.get_text(strip=True)[:500])
        
        # If we found content, hash it to detect changes
        if processing_content:
            combined_content = "\n".join(processing_content)
            current_hash = _hash(combined_content)
            
            src_id = "processing_times_global"
            meta_doc = meta_ref.document(src_id).get()
            stored = meta_doc.to_dict() if meta_doc.exists else {}
            stored_hash = stored.get("hash")
            
            if not stored_hash:
                store_hash_baseline(meta_ref, src_id, current_hash, {
                    "content_preview": combined_content[:1000],
                })
                print(f"  [processing_times] 📌 Global page baseline stored")
                return notifications
            
            if current_hash == stored_hash:
                meta_ref.document(src_id).set(
                    {"last_checked": datetime.now(timezone.utc).isoformat()},
                    merge=True
                )
                print(f"  [processing_times] No changes detected")
                return notifications
            
            # Content changed!
            notifications.append({
                "source_id": src_id,
                "topic": "processing_times",
                "category": "Processing Time",
                "title": "⏱️ Processing Times Page Updated",
                "body": "The global visa processing times page has been updated. Check for changes to specific visa subclasses.",
                "url": PROCESSING_TIMES_URL,
                "content_preview": combined_content[:500],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "content_preview": combined_content[:1000],
            })
            print(f"  [processing_times] 🔔 Processing times page changed!")
        else:
            print(f"  [processing_times] ⚠️ No processing time content found on page")
            # Log page title for debugging
            title = soup.find("title")
            if title:
                print(f"  [processing_times] Page title: {title.get_text()}")

    except Exception as e:
        import traceback
        print(f"  [processing_times] ❌ Scraper error: {e}")
        print(f"  [processing_times] Stack: {traceback.format_exc()[:300]}")

    return notifications
