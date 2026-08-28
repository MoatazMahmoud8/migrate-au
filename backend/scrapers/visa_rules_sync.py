"""
Auto-sync scraped visa data to Firestore visa_rules collections.

When the scraper detects a fee or processing time change on the government website,
this module:
1. Extracts the actual values (fee amount, processing times)
2. Updates the Firestore `visa_fees` and `visa_processing_times` collections
3. Increments `rules_version` so mobile apps refresh
4. Queues an admin notification about the auto-update

This enables zero-touch updates: gov website changes → Firestore → mobile app.
"""

import re
from datetime import datetime, timezone
from typing import Optional


def extract_fee_amount(page_html: str, subclass: str) -> Optional[dict]:
    """
    Extract visa fee from DHA page HTML.
    Returns dict with fee and feeNote, or None if extraction fails.
    
    DHA embeds fee data in JSON inside the page:
    "visaCost": "$6,140"
    """
    # Try JSON embedded format first
    patterns = [
        r'"visaCost"\s*:\s*"([^"]+)"',
        r'"visa_cost"\s*:\s*"([^"]+)"',
        r'visaCost["\s:]+\$?([\d,]+)',
        r'Base application charge[:\s]+\$?([\d,]+)',
        r'Application charge[:\s]+\$?([\d,]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, page_html, re.IGNORECASE)
        if match:
            raw_fee = match.group(1).strip()
            # Normalize to "AUD $X,XXX" format
            amount = re.sub(r'[^\d,]', '', raw_fee)
            if amount:
                fee = f"AUD ${amount}"
                return {
                    "fee": fee,
                    "feeNote": f"Auto-updated from immi.homeaffairs.gov.au on {datetime.now().strftime('%d %b %Y')}",
                    "lastScraped": datetime.now(timezone.utc).isoformat(),
                }
    
    return None


def extract_processing_times(page_html: str, subclass: str) -> Optional[dict]:
    """
    Extract processing time ranges from DHA page HTML.
    Returns dict with streams array, or None if extraction fails.
    
    Common formats:
    - "75% of applications: 8 months"
    - "90% of applications: 12 months"
    - "X to Y months"
    """
    streams = []
    
    # Look for percentage-based processing times
    p75_match = re.search(r'(?:50|75)%[^:]*:\s*(\d+)\s*months?', page_html, re.IGNORECASE)
    p90_match = re.search(r'(?:90|95)%[^:]*:\s*(\d+)\s*months?', page_html, re.IGNORECASE)
    
    if p75_match and p90_match:
        p50 = f"{p75_match.group(1)} months"
        p90 = f"{p90_match.group(1)} months"
        streams.append({
            "name": None,
            "p50": p50,
            "p90": p90,
        })
        return {
            "streams": streams,
            "conditions": [],
            "lastScraped": datetime.now(timezone.utc).isoformat(),
        }
    
    # Look for range format: "X to Y months"
    range_match = re.search(r'(\d+)\s*(?:to|-)\s*(\d+)\s*months?', page_html, re.IGNORECASE)
    if range_match:
        p50 = f"{range_match.group(1)} months"
        p90 = f"{range_match.group(2)} months"
        streams.append({
            "name": None,
            "p50": p50,
            "p90": p90,
        })
        return {
            "streams": streams,
            "conditions": [],
            "lastScraped": datetime.now(timezone.utc).isoformat(),
        }
    
    return None


def sync_fee_to_firestore(db, subclass: str, fee_data: dict) -> bool:
    """
    Update visa_fees/{subclass} in Firestore and increment rules_version.
    """
    try:
        db.collection("visa_fees").document(subclass).set(fee_data, merge=True)
        _increment_rules_version(db)
        print(f"  [visa_rules_sync] ✅ SC {subclass} fee updated in Firestore: {fee_data.get('fee')}")
        return True
    except Exception as e:
        print(f"  [visa_rules_sync] ❌ Failed to sync SC {subclass} fee: {e}")
        return False


def sync_processing_time_to_firestore(db, subclass: str, time_data: dict) -> bool:
    """
    Update visa_processing_times/{subclass} in Firestore and increment rules_version.
    """
    try:
        db.collection("visa_processing_times").document(subclass).set(time_data, merge=True)
        _increment_rules_version(db)
        
        streams_preview = time_data.get("streams", [])
        if streams_preview:
            s = streams_preview[0]
            print(f"  [visa_rules_sync] ✅ SC {subclass} times updated: {s.get('p50')} / {s.get('p90')}")
        return True
    except Exception as e:
        print(f"  [visa_rules_sync] ❌ Failed to sync SC {subclass} times: {e}")
        return False


def _increment_rules_version(db):
    """Increment the rules_version counter so mobile apps know to refresh."""
    from google.cloud.firestore import Increment
    
    db.collection("rules_version").document("current").set({
        "version": Increment(1),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }, merge=True)


def create_auto_update_notification(
    subclass: str,
    update_type: str,
    old_value: str,
    new_value: str,
    url: str,
) -> dict:
    """
    Create an admin notification about an auto-update.
    """
    if update_type == "fee":
        return {
            "source_id": f"auto_fee_{subclass}",
            "topic": "visa_fees",
            "category": "Auto Fee Update",
            "title": f"💰 SC {subclass} fee auto-updated",
            "body": f"Fee changed from {old_value or 'unknown'} to {new_value}. Firestore updated automatically.",
            "url": url,
            "state": "FED",
            "subclass": subclass,
            "old_value": old_value,
            "new_value": new_value,
            "auto_synced": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    else:
        return {
            "source_id": f"auto_times_{subclass}",
            "topic": "processing_times",
            "category": "Auto Processing Time Update",
            "title": f"⏱️ SC {subclass} processing times auto-updated",
            "body": f"Processing times changed. Firestore updated automatically.",
            "url": url,
            "state": "FED",
            "subclass": subclass,
            "new_value": new_value,
            "auto_synced": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
