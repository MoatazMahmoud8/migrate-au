"""
backend/watchlist_dispatcher.py

Per-occupation Pro alerts. After the broad topic broadcast, this module:

  1. Iterates every notification produced this run.
  2. For each notification that is occupation-relevant (SkillSelect, ANZSCO,
     or state nomination), inspects every saved watchlist item to see if the
     change matters to that user.
  3. Sends a personalised FCM push to that user's device token AND writes a
     per-user notification doc (`notifications` collection with `userId`)
     so the in-app feed can show it tagged "From your watchlist".

Matching rules (v1 — coarse but safe):
  - Topic "skillselect" → matches every watchlist item whose visa subclass
    is mentioned in the notification body OR is one of the SkillSelect-
    eligible visas (189/190/491). No per-occupation cutoff parsing yet —
    that requires structured round data we don't extract today.
  - Topic "anzsco" → matches items whose ANZSCO appears in the body.
  - Topic "state_XXX" → matches items whose `states` list (if any) contains
    the matching state.

The dispatcher is intentionally conservative: it is far better to send a
relevant ping for a real upstream event than to silently filter it out.

userId in Firestore = RevenueCat anonymous app user ID (see utils/iap.ts).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from firebase_admin import messaging


# Topics that warrant per-user dispatch.
_SKILLSELECT_TOPIC = "skillselect"
_ANZSCO_TOPIC = "anzsco"
_STATE_TOPIC_PREFIX = "state_"

# Visa subclasses that SkillSelect rounds invite.
_SKILLSELECT_VISAS = {"189", "190", "491"}


def _matches(item: dict, notification: dict) -> bool:
    """Return True if a single SkillSelect/ANZSCO/state notification matters
    to the given watchlist item."""
    topic = notification.get("topic", "")
    body = (notification.get("body") or "").lower()
    title = (notification.get("title") or "").lower()
    haystack = f"{title} {body}"

    visa = str(item.get("visaSubclass", "")).strip()
    anzsco = str(item.get("anzsco", "")).strip()
    states = item.get("states") or []

    if topic == _SKILLSELECT_TOPIC:
        # Only ping for subclasses that SkillSelect actually invites.
        if visa not in _SKILLSELECT_VISAS:
            return False
        # If the round body mentions the visa explicitly, definitely match.
        if visa and visa in haystack:
            return True
        # Otherwise still match — a SkillSelect change is rare and likely relevant.
        return True

    if topic == _ANZSCO_TOPIC:
        # Match if the ANZSCO code is mentioned in the body OR if no granular
        # detail is provided (rare full-list change).
        if anzsco and anzsco in haystack:
            return True
        return False  # Avoid spamming for unrelated ANZSCO list changes.

    if topic.startswith(_STATE_TOPIC_PREFIX):
        if not states:
            return False
        state_code = topic[len(_STATE_TOPIC_PREFIX):]
        if state_code in states:
            # Also require visa to be state-relevant.
            return visa in {"190", "491"}
        return False

    return False


def _load_watchlists(db) -> list[dict]:
    """Return a flat list of {userId, fcmToken, item} for every watchlist
    item across all users."""
    rows: list[dict] = []
    for user_doc in db.collection("watchlists").stream():
        data = user_doc.to_dict() or {}
        token = data.get("fcmToken")
        if not token:
            continue
        user_id = user_doc.id
        items_ref = db.collection("watchlists").document(user_id).collection("items")
        for item_doc in items_ref.stream():
            item = item_doc.to_dict() or {}
            rows.append({"userId": user_id, "fcmToken": token, "item": item})
    return rows


def _send_personal_push(token: str, notification: dict, item: dict) -> bool:
    """Send a single targeted push to one device token."""
    title = f"📌 Watchlist: {item.get('anzscoTitle', 'Occupation update')}"
    body = notification.get("body") or notification.get("title") or "New update available"

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id="migration_updates",
                icon="notification_icon",
                color="#FFCD00",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(badge=1, sound="default", content_available=True),
            ),
        ),
        data={
            "url": notification.get("url", ""),
            "category": "Watchlist",
            "source_id": notification.get("source_id", "watchlist"),
            "anzsco": str(item.get("anzsco", "")),
            "visaSubclass": str(item.get("visaSubclass", "")),
            "timestamp": notification.get("timestamp", datetime.now(timezone.utc).isoformat()),
        },
        token=token,
    )

    try:
        messaging.send(message)
        return True
    except messaging.UnregisteredError:
        # Token is dead — caller should clean up.
        return False
    except Exception as e:
        print(f"  [watchlist] ❌ push to token failed: {e}")
        return False


def dispatch(db, notifications: Iterable[dict]) -> dict[str, Any]:
    """
    Iterate all detected upstream notifications and fan out personalised pushes
    to every matching watchlist item. Also persists a per-user notification doc
    so the in-app feed shows the watchlist hit.

    Returns stats dict.
    """
    notifications = list(notifications)
    if not notifications:
        return {"matches": 0, "sent": 0, "failed": 0, "users": 0}

    rows = _load_watchlists(db)
    if not rows:
        print("  [watchlist] no users with watchlists yet")
        return {"matches": 0, "sent": 0, "failed": 0, "users": 0}

    print(f"  [watchlist] checking {len(rows)} watched item(s) across users…")
    matches = sent = failed = 0
    dead_tokens: set[str] = set()
    user_ids: set[str] = set()

    for n in notifications:
        for row in rows:
            item = row["item"]
            if not _matches(item, n):
                continue

            matches += 1
            user_ids.add(row["userId"])

            ok = _send_personal_push(row["fcmToken"], n, item)
            if ok:
                sent += 1
                # Persist personal feed entry.
                try:
                    db.collection("notifications").add({
                        "userId": row["userId"],
                        "title": f"📌 {item.get('anzscoTitle', 'Watchlist alert')}",
                        "body": n.get("body", ""),
                        "url": n.get("url", ""),
                        "category": "Watchlist",
                        "topic": n.get("topic", ""),
                        "source_id": n.get("source_id", ""),
                        "anzsco": item.get("anzsco"),
                        "visaSubclass": item.get("visaSubclass"),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "read": False,
                    })
                except Exception as e:
                    print(f"  [watchlist] firestore write failed: {e}")
            else:
                failed += 1
                dead_tokens.add(row["fcmToken"])

    # Best-effort cleanup of dead tokens.
    for tok in dead_tokens:
        for row in rows:
            if row["fcmToken"] == tok:
                try:
                    db.collection("watchlists").document(row["userId"]).set(
                        {"fcmToken": None}, merge=True
                    )
                except Exception:
                    pass

    print(
        f"  [watchlist] ✅ {sent} sent / {failed} failed across "
        f"{len(user_ids)} user(s) ({matches} match(es))"
    )
    return {"matches": matches, "sent": sent, "failed": failed, "users": len(user_ids)}
