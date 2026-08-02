"""Queue automated updates for administrator review before publication."""

import hashlib
import re
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


CATEGORY_TO_CONTENT_TYPE = {
    "Processing Time": "processing_times",
    "SkillSelect Round": "skillselect_rounds",
    "Points Test": "policy_update",
    "Policy Update": "policy_update",
    "Visa Change": "visa_change",
    "Visa Fee Update": "visa_fees",
    "ANZSCO Occupation List": "anzsco",
    "ANZSCO Classification": "anzsco",
    "State Nomination": "state_nominations",
    "News": "news",
}


def _notification_fingerprint(notification: dict) -> str:
    source_id = notification.get("source_id", "unknown")
    title = notification.get("title", "")
    url = notification.get("url", "")
    return hashlib.sha256(
        f"{source_id}|{title}|{url}".encode("utf-8")
    ).hexdigest()[:24]


def _draft_id(notification: dict) -> str:
    return f"automation-{_notification_fingerprint(notification)}"


def _content_change_id(notification: dict) -> str:
    return f"content-change-{_notification_fingerprint(notification)}"


def _extract_fee_subclass(notification: dict) -> str | None:
    subclass = notification.get("subclass")
    if isinstance(subclass, str) and subclass.strip():
        return subclass.strip()

    source_id = str(notification.get("source_id", ""))
    match = re.search(r"visa_fee_(\d+)", source_id)
    if match:
        return match.group(1)

    title = str(notification.get("title", ""))
    match = re.search(r"\bSC\s+(\d+)\b", title, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def _get_current_fee_value(db, subclass: str | None) -> str | None:
    if not subclass:
        return None

    try:
        fee_ref = db.collection("visa_fees").document(subclass)
        fee_snap = fee_ref.get()
        if not fee_snap.exists:
            return None
        fee_data = fee_snap.to_dict() or {}
        fee = fee_data.get("fee")
        if isinstance(fee, str) and fee.strip():
            return fee.strip()
    except Exception as e:
        print(f"  [content] Failed to fetch current visa fee for SC {subclass}: {e}")

    return None


def queue_content_change(db, notification: dict) -> str | None:
    """
    Persist a detected scraper change for admin approval.
    Returns the content change id when created/already present, else None.
    """
    title = notification["title"]
    body = notification["body"]
    url = notification.get("url", "")
    category = notification.get("category", "Update")
    source_id = notification.get("source_id", "unknown")
    content_type = CATEGORY_TO_CONTENT_TYPE.get(category, "policy_update")
    change_id = _content_change_id(notification)
    change_ref = db.collection("pending_content_changes").document(change_id)

    try:
        if change_ref.get().exists:
            print(f"  [content] Change already queued: {change_id}")
            return change_id

        created_at = notification.get("timestamp") or datetime.now(timezone.utc).isoformat()
        subclass = _extract_fee_subclass(notification)
        current_value = notification.get("current_value")
        if current_value is None and content_type == "visa_fees":
            current_value = _get_current_fee_value(db, subclass)

        detected_value = notification.get("detected_value")
        if detected_value is None and content_type == "visa_fees":
            detected_value = body

        doc = {
            "id": change_id,
            "contentType": content_type,
            "title": title,
            "summary": notification.get("summary", body),
            "sourceUrl": url,
            "category": category,
            "status": "pending",
            "createdAt": created_at,
            "notificationDraftId": _draft_id(notification),
            "sourceId": source_id,
            "requestedTopic": notification.get("topic", "au_migration"),
            "body": body,
        }
        if current_value is not None:
            doc["currentValue"] = str(current_value).strip()
        if detected_value is not None:
            doc["detectedValue"] = str(detected_value).strip()
        if "state" in notification:
            doc["state"] = notification["state"]
        if subclass:
            doc["subclass"] = subclass

        change_ref.create(doc)
        print(f"  [content] Queued content change for admin approval: {change_id}")
        return change_id

    except Exception as e:
        print(f"  [content] Failed to queue content change: {e}")
        return None


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
    draft_id = _draft_id(notification)
    draft_ref = db.collection("notifications_draft").document(draft_id)

    try:
        if draft_ref.get().exists:
            print(f"  [notify] Draft already queued: {draft_id}")
            change_id = queue_content_change(db, notification)
            if change_id:
                draft_ref.set({"contentChangeId": change_id}, merge=True)
            return False

        created_at = notification.get("timestamp") or datetime.now(timezone.utc).isoformat()
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
        change_id = queue_content_change(db, notification)
        if change_id:
            draft_ref.set({"contentChangeId": change_id}, merge=True)
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
