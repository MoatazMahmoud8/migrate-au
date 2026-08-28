"""
Admin-only intelligence scraper for competitor and industry sites.
Changes are stored in `admin_intel` collection and sent only to admin (not users).
"""

import hashlib
import re
from datetime import datetime, timezone
from typing import Optional

import cloudscraper
from bs4 import BeautifulSoup

from scrapers.baseline import store_hash_baseline


# Sites to monitor (admin-only, not shown to users)
INTEL_SOURCES = [
    {
        "id": "smartvisa_processing",
        "name": "SmartVisa Processing Estimate",
        "url": "https://www.smartvisaguide.com/australia/processing-time-estimate",
        "extract": "processing_time",
    },
    {
        "id": "smartvisa_home",
        "name": "SmartVisa Homepage",
        "url": "https://www.smartvisaguide.com/",
        "extract": "homepage",
    },
    {
        "id": "smartvisa_backlog",
        "name": "SmartVisa Backlog Tool",
        "url": "https://www.smartvisaguide.com/tools/skillselect-189-190-491-visa-backlog",
        "extract": "generic",
    },
]


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _extract_processing_content(soup: BeautifulSoup, html: str) -> str:
    """Extract processing-time-relevant content from SmartVisa page."""
    content_parts = []
    
    # Look for processing time mentions
    month_patterns = re.findall(r'\d+\s*(?:to\s*\d+\s*)?months?', html, re.IGNORECASE)
    if month_patterns:
        content_parts.extend(month_patterns[:30])
    
    # Look for headings with processing/time/estimate
    headings = soup.find_all(['h1', 'h2', 'h3', 'h4'])
    for h in headings:
        text = h.get_text(strip=True)
        if any(kw in text.lower() for kw in ['processing', 'time', 'estimate', 'wait', 'subclass']):
            content_parts.append(text)
    
    # Look for any data tables
    tables = soup.find_all('table')
    for table in tables[:3]:
        rows = table.find_all('tr')
        for row in rows[:5]:
            cells = row.find_all(['td', 'th'])
            if cells:
                row_text = " | ".join(c.get_text(strip=True) for c in cells)
                if row_text.strip():
                    content_parts.append(row_text)
    
    return "\n".join(content_parts)


def _extract_homepage_content(soup: BeautifulSoup, html: str) -> str:
    """Extract key content from homepage that indicates updates."""
    content_parts = []
    
    # Main headings
    for h in soup.find_all(['h1', 'h2', 'h3'])[:10]:
        content_parts.append(h.get_text(strip=True))
    
    # Look for "recent", "latest", "new" sections
    for section in soup.find_all(['div', 'section']):
        class_str = ' '.join(section.get('class', []))
        if any(kw in class_str.lower() for kw in ['recent', 'latest', 'new', 'update', 'news']):
            content_parts.append(section.get_text(strip=True)[:500])
    
    # Any dates mentioned
    date_patterns = re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}', html, re.IGNORECASE)
    if date_patterns:
        content_parts.extend(date_patterns[:10])
    
    return "\n".join(content_parts)


def _extract_generic_content(soup: BeautifulSoup, html: str) -> str:
    """Generic content extraction for change detection."""
    content_parts = []
    
    # All headings
    for h in soup.find_all(['h1', 'h2', 'h3'])[:15]:
        content_parts.append(h.get_text(strip=True))
    
    # Key data points (numbers, dates, percentages)
    numbers = re.findall(r'\b\d+(?:,\d{3})*(?:\.\d+)?%?\b', html)
    if numbers:
        content_parts.extend(numbers[:50])
    
    return "\n".join(content_parts)


def scrape_intel(db) -> list[dict]:
    """
    Scrape competitor/industry sites for admin intelligence.
    Returns intel items to be stored (not user notifications).
    """
    intel_items = []
    meta_ref = db.collection("_scraper_meta")
    intel_ref = db.collection("admin_intel")
    
    scraper = cloudscraper.create_scraper(
        browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True},
        delay=3
    )
    
    for source in INTEL_SOURCES:
        src_id = f"intel_{source['id']}"
        
        try:
            response = scraper.get(source['url'], timeout=30)
            
            if response.status_code != 200:
                print(f"  [intel] ⚠️ {source['name']}: HTTP {response.status_code}")
                continue
            
            html = response.text
            
            # Check for blocks
            if "Access Denied" in html or len(html) < 1000:
                print(f"  [intel] ⚠️ {source['name']}: Blocked or empty response")
                continue
            
            soup = BeautifulSoup(html, "html.parser")
            
            # Extract content based on source type
            if source['extract'] == 'processing_time':
                content = _extract_processing_content(soup, html)
            elif source['extract'] == 'homepage':
                content = _extract_homepage_content(soup, html)
            else:
                content = _extract_generic_content(soup, html)
            
            if not content or len(content) < 50:
                print(f"  [intel] ⚠️ {source['name']}: No meaningful content extracted")
                continue
            
            current_hash = _hash(content)
            
            # Check against stored baseline
            meta_doc = meta_ref.document(src_id).get()
            stored = meta_doc.to_dict() if meta_doc.exists else {}
            stored_hash = stored.get("hash")
            
            now = datetime.now(timezone.utc).isoformat()
            
            if not stored_hash:
                # First time - store baseline
                store_hash_baseline(meta_ref, src_id, current_hash, {
                    "content_preview": content[:1000],
                    "source_name": source['name'],
                })
                print(f"  [intel] 📌 {source['name']}: Baseline stored")
                continue
            
            # Update last_checked
            meta_ref.document(src_id).set({"last_checked": now}, merge=True)
            
            if current_hash == stored_hash:
                print(f"  [intel] ✓ {source['name']}: No changes")
                continue
            
            # Content changed! Store intel item
            intel_doc_id = f"{src_id}_{now[:10].replace('-', '')}"
            
            intel_item = {
                "id": intel_doc_id,
                "sourceId": source['id'],
                "sourceName": source['name'],
                "sourceUrl": source['url'],
                "detectedAt": now,
                "previousHash": stored_hash,
                "currentHash": current_hash,
                "contentPreview": content[:2000],
                "status": "new",  # new, reviewed, dismissed
            }
            
            intel_ref.document(intel_doc_id).set(intel_item)
            intel_items.append(intel_item)
            
            # Update baseline
            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": now,
                "last_changed": now,
                "content_preview": content[:1000],
            })
            
            print(f"  [intel] 🔔 {source['name']}: CHANGE DETECTED!")
            
        except Exception as e:
            print(f"  [intel] ❌ {source['name']}: {str(e)[:100]}")
    
    return intel_items


def get_processing_times_status(db) -> dict:
    """
    Get the current processing times monitoring status for the admin dashboard.
    Returns the latest check info and any recent changes.
    """
    meta_ref = db.collection("_scraper_meta")
    
    # Check Home Affairs processing times
    ha_doc = meta_ref.document("processing_times_global").get()
    ha_data = ha_doc.to_dict() if ha_doc.exists else {}
    
    # Check SmartVisa processing times
    sv_doc = meta_ref.document("intel_smartvisa_processing").get()
    sv_data = sv_doc.to_dict() if sv_doc.exists else {}
    
    return {
        "homeAffairs": {
            "lastChecked": ha_data.get("last_checked"),
            "lastChanged": ha_data.get("last_changed"),
            "contentPreview": ha_data.get("content_preview", "")[:500],
            "hash": ha_data.get("hash"),
        },
        "smartVisa": {
            "lastChecked": sv_data.get("last_checked"),
            "lastChanged": sv_data.get("last_changed"),
            "contentPreview": sv_data.get("content_preview", "")[:500],
            "hash": sv_data.get("hash"),
        },
    }
