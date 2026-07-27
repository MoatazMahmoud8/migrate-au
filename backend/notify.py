"""Queue automated updates for administrator review before publication."""

import hashlib
from datetime import datetime, timezone


# Maps topic → human label (used as Android notification channel)
TOPIC_CHANNELS = {
    "au_migration": "AU Migration",
    "skillselect":  "SkillSelect",
    "anzsco":       "Occupation Lists",
    "processing_times": "Processing Times",
    "state_NSW":    "NSW Nomination",
    "state_VIC":    "VIC Nomination",
    "state_QLD":    "QLD Nomination",
    "state_WA":     "WA Nomination",
    "state_SA":     "SA Nomination",
    "state_TAS":    "TAS Nomination",
    "state_ACT":    "ACT Nomination",
    "state_NT":     "NT Nomination",
}


def queue_draft_notification(db, notification: dict) -> bool:
    """
    Persist an automated update to the admin draft queue without sending FCM.
    Returns True when a new draft is created and False for a duplicate/error.
    """
    topic = notification["topic"]
    title = notification["title"]
    body = notification["body"]
    url = notification.get("url", "")
    category = notification.get("category", "Update")
    source_id = notification.get("source_id", "unknown")

    try:
        fingerprint = hashlib.sha256(
            f"{source_id}|{title}|{url}".encode("utf-8")
        ).hexdigest()[:24]
        draft_id = f"automation-{fingerprint}"
        draft_ref = db.collection("notifications_draft").document(draft_id)
        if draft_ref.get().exists:
            print(f"  [notify] Draft already queued: {draft_id}")
            return False

        created_at = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": draft_id,
            "title": title,
            "body": body,
            "url": url,
            "sourceUrl": url,
            "category": category,
            "source": source_id,
            "requestedTopic": topic,
            "status": "draft",
            "createdAt": created_at,
            "timestamp": created_at,
            "createdBy": "scraper_automation",
        }
        if "state" in notification:
            doc["state"] = notification["state"]

        draft_ref.create(doc)
        print(f"  [notify] Queued for admin approval: {draft_id}")
        return True

    except Exception as e:
        print(f"  [notify] Failed to queue draft: {e}")
        return False


def queue_batch(db, notifications: list[dict]) -> dict:
    """Queue detected updates for admin review. Returns stats."""
    stats = {"queued": 0, "duplicates_or_failed": 0}
    for n in notifications:
        if queue_draft_notification(db, n):
            stats["queued"] += 1
        else:
            stats["duplicates_or_failed"] += 1
    return stats


# Backward-compatible name for local tooling. It only queues a draft.
send_topic_notification = queue_draft_notification
