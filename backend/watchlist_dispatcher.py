"""
backend/watchlist_dispatcher.py

Legacy per-occupation alert matching.

Direct watchlist delivery is disabled. Automated updates must be reviewed in
the admin draft queue before any user can receive them.

Matching rules (v1 — coarse but safe):
  - Topic "skillselect" → matches every watchlist item whose visa subclass
    is mentioned in the notification body OR is one of the SkillSelect-
    eligible visas (189/190/491). No per-occupation cutoff parsing yet —
    that requires structured round data we don't extract today.
  - Topic "anzsco" → matches items whose ANZSCO appears in the body.
  - Topic "state_XXX" → matches items whose `states` list (if any) contains
    the matching state.

userId in Firestore = RevenueCat anonymous app user ID (see utils/iap.ts).
"""

from __future__ import annotations

from typing import Any, Iterable


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


def dispatch(db, notifications: Iterable[dict]) -> dict[str, Any]:
    """
    Refuse automated watchlist delivery until a moderated targeted-notification
    approval path is implemented.
    """
    del db, notifications
    print("  [watchlist] direct delivery disabled; admin approval is required")
    return {"matches": 0, "sent": 0, "failed": 0, "users": 0}
