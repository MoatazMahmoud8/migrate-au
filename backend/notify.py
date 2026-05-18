"""
FCM notifier — sends push notifications via Firebase Admin SDK.
Uses FCM topics so no need to manage individual device tokens.
"""

import firebase_admin
from firebase_admin import messaging
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


def send_topic_notification(db, notification: dict) -> bool:
    """
    Send an FCM topic push and persist the notification to Firestore.
    Returns True on success.
    """
    topic = notification["topic"]
    title = notification["title"]
    body = notification["body"]
    url = notification.get("url", "")
    category = notification.get("category", "Update")
    source_id = notification.get("source_id", "unknown")

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id="migration_updates",
                icon="notification_icon",
                color="#002D62",
                click_action="FLUTTER_NOTIFICATION_CLICK",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    badge=1,
                    sound="default",
                    content_available=True,
                )
            )
        ),
        data={
            "url": url,
            "category": category,
            "source_id": source_id,
            "timestamp": notification["timestamp"],
        },
        topic=topic,
    )

    try:
        response = messaging.send(message)
        print(f"  [notify] ✅ Sent to topic '{topic}': {response}")

        # Persist notification to Firestore for the in-app feed
        doc = {
            "title": title,
            "body": body,
            "url": url,
            "category": category,
            "topic": topic,
            "source_id": source_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "read": False,
            # Broadcast docs are visible to every user; per-user (watchlist)
            # docs set userId to the recipient's RC id. The client merges both
            # streams in subscribeToFeed.
            "userId": None,
        }
        if "state" in notification:
            doc["state"] = notification["state"]

        db.collection("notifications").add(doc)
        return True

    except Exception as e:
        print(f"  [notify] ❌ Failed to send to topic '{topic}': {e}")
        return False


def send_batch(db, notifications: list[dict]) -> dict:
    """Send all queued notifications. Returns stats."""
    stats = {"sent": 0, "failed": 0}
    for n in notifications:
        if send_topic_notification(db, n):
            stats["sent"] += 1
        else:
            stats["failed"] += 1
    return stats
