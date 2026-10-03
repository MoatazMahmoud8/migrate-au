"""Queue automated updates for administrator review before publication."""

import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit


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
    "Assessment Fee Update": "assessment_fees",
    "Auto Fee Update": "assessment_fees",
    "ANZSCO Occupation List": "anzsco",
    "ANZSCO Classification": "anzsco",
    "State Nomination": "state_nominations",
}

# Categories from RSS news (should NOT go to pending_content_changes)
NEWS_CATEGORIES = {
    "News", "Visa & Migration", "SkillSelect", "Occupation Lists",
    "Visa Fees", "System Update", "Visa Conditions", "Citizenship", "How to Apply",
}

MIGRATION_NEWS_KEYWORDS = (
    "visa", "migration", "immigration", "skillselect", "invitation round",
    "subclass", "189", "190", "491", "482", "186", "485", "500",
    "state nomination", "occupation list", "anzsco", "processing time",
    "home affairs", "assessment", "vetassess", "engineers australia",
    "acs", "minister", "parliament", "policy", "regulation", "fee",
)

NON_RELEVANT_NEWS_MARKERS = (
    "success story", "visa granted", "my migration journey", "our migration journey",
    "did not get visa", "didn't get visa", "refused visa story", "client story",
    "testimonial", "how i migrated", "how we migrated", "personal story",
)


# ─── LAWS & OFFICIAL DIRECTIONS FILTER ────────────────────────────────────────
# The app only surfaces notifications that reflect laws, ministerial directions,
# fee schedules, occupation lists, invitation rounds, processing times or state
# nomination decisions from an official source. This filter rejects anything
# else so opinion pieces, personal stories or news commentary can never reach
# users.

OFFICIAL_SOURCE_DOMAINS = (
    "homeaffairs.gov.au",
    "immi.homeaffairs.gov.au",
    "immigration.homeaffairs.gov.au",
    "border.gov.au",
    "aat.gov.au",
    "dfat.gov.au",
    "servicesaustralia.gov.au",
    "treasury.gov.au",
    "legislation.gov.au",
    "abs.gov.au",
    "jobsandskills.gov.au",
    # State/territory nomination programs
    "nsw.gov.au",
    "vic.gov.au",
    "qld.gov.au",
    "wa.gov.au",
    "sa.gov.au",
    "tas.gov.au",
    "act.gov.au",
    "nt.gov.au",
    "business.gov.au",
    "migration.wa.gov.au",
    "migration.tas.gov.au",
    "migration.sa.gov.au",
    "migration.qld.gov.au",
    "migration.nsw.gov.au",
    "liveinmelbourne.vic.gov.au",
    "canberrayourfuture.com.au",
    "vetassess.com.au",
    "engineersaustralia.org.au",
    "acs.org.au",
    "cpaaustralia.com.au",
    "cahpc.com.au",
    "ahpra.gov.au",
    "tra.gov.au",
    "nati.com.au",
    "nmba.gov.au",
    "theterritory.com.au",
)

# Structured scraper source_id prefixes that always represent official
# machine-detected changes (fee changes, list updates, etc.). Any source_id
# that starts with one of these bypasses the keyword requirement because it
# is derived from an official page diff.
OFFICIAL_SCRAPER_SOURCE_PREFIXES = (
    "home_affairs",
    "homeaffairs",
    "visa_fee_",
    "processing_time_",
    "state_",
    "state_nomination",
    "anzsco_",
    "assessment_fee_",
    "policy_update",
    "skillselect_",
    "invitation_round",
    "legislative_instrument",
    "vetassess",
    "engineers_australia",
    "acs_",
    "cpa_",
    "ahpra_",
    "tra_",
    "skills_assessment",
    "authority_fee",
    "ministerial_direction",
)

# Content types that represent structured changes to official data.
OFFICIAL_CONTENT_TYPES = {
    "visa_fees",
    "assessment_fees",
    "processing_times",
    "skillselect_rounds",
    "state_nominations",
    "anzsco",
    "policy_update",
    "visa_change",
}

# Words/phrases that strongly indicate an item is a law, direction, ministerial
# instrument, official update or structured migration change. At least one must
# appear in the title/body for free-text sources to be accepted.
LAWS_AND_DIRECTIONS_KEYWORDS = (
    "legislative instrument",
    "ministerial direction",
    "migration act",
    "migration regulation",
    "migration regulations",
    "regulation change",
    "gazette",
    "explanatory statement",
    "fee schedule",
    "visa application charge",
    "visa fee",
    "fee increase",
    "fee change",
    "processing time",
    "invitation round",
    "skillselect round",
    "points threshold",
    "cutoff score",
    "cut-off score",
    "occupation list",
    "csol",
    "mltssl",
    "stsol",
    "rol",
    "anzsco",
    "nomination criteria",
    "nomination open",
    "nomination close",
    "nomination allocation",
    "nomination quota",
    "policy change",
    "visa change",
    "subclass 189",
    "subclass 190",
    "subclass 491",
    "subclass 482",
    "subclass 485",
    "subclass 186",
    "subclass 494",
    "subclass 500",
    "subclass 858",
    "home affairs announce",
    "department announce",
    "migration program planning",
    "migration program",
    "assessment fee",
    "skills assessment fee",
)

# Phrases that indicate the item is a personal story, opinion piece, guide or
# other non-official content. Any hit rejects the notification even if it
# comes from an approved domain.
PERSONAL_OR_STORY_MARKERS = (
    "share your story",
    "success story",
    "my story",
    "our story",
    "personal story",
    "case study",
    "testimonial",
    "op-ed",
    "opinion:",
    " opinion piece",
    "comment:",
    "column:",
    "editorial:",
    "how i ",
    "how we ",
    "my journey",
    "my experience",
    "our journey",
    "our experience",
    "tips for",
    "guide to",
    "guide for",
    "step-by-step guide",
    "what it's like",
    "what its like",
    "advice column",
    "profile:",
    "interview:",
    "q&a with",
    "q & a with",
    "explained:",
    "explainer:",
)


def _domain_from_url(url: str) -> str:
    if not isinstance(url, str) or not url.strip():
        return ""
    lowered = url.strip().lower()
    for prefix in ("https://", "http://"):
        if lowered.startswith(prefix):
            lowered = lowered[len(prefix):]
            break
    lowered = lowered.split("/", 1)[0]
    lowered = lowered.split("?", 1)[0]
    return lowered


def _has_official_domain(url: str) -> bool:
    host = _domain_from_url(url)
    if not host:
        return False
    for domain in OFFICIAL_SOURCE_DOMAINS:
        if host == domain or host.endswith("." + domain):
            return True
    return False


def _has_official_source_id(source_id) -> bool:
    if not isinstance(source_id, str):
        return False
    lowered = source_id.strip().lower()
    return any(lowered.startswith(prefix) for prefix in OFFICIAL_SCRAPER_SOURCE_PREFIXES)


def _text_blob(notification: dict) -> str:
    parts = [
        str(notification.get("title", "")),
        str(notification.get("body", "")),
        str(notification.get("summary", "")),
    ]
    return " ".join(parts).lower()


def _canonicalize_url(url: str) -> str:
    if not isinstance(url, str) or not url.strip():
        return ""
    parsed = urlsplit(url.strip())
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    return urlunsplit((scheme, netloc, path, "", ""))


def _normalize_title(text: str) -> str:
    if not isinstance(text, str):
        return ""
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


def _is_migration_relevant_news(notification: dict) -> bool:
    text = _text_blob(notification)
    if not text:
        return False
    for marker in NON_RELEVANT_NEWS_MARKERS:
        if marker in text:
            return False
    return any(keyword in text for keyword in MIGRATION_NEWS_KEYWORDS)


def is_official_law_or_direction(notification: dict) -> bool:
    """Return True when the notification represents a law, ministerial
    direction, structured official data change or an announcement from an
    approved government domain. Returns False for opinion, personal stories,
    guides, generic news or anything from an unknown source.
    """
    if not isinstance(notification, dict):
        return False

    text = _text_blob(notification)

    for marker in PERSONAL_OR_STORY_MARKERS:
        if marker in text:
            return False

    # Hard reject anything that comes from a known RSS/news scraper even if the
    # upstream categoriser slapped a trusted contentType on it.
    sid = str(notification.get("source_id", "")).lower().strip()
    if sid in {"news_rss", "scraper", "news"} or sid.startswith("rss_") or sid.startswith("news_rss") or "news_scraper" in sid:
        return False

    source_trusted = (
        _has_official_domain(notification.get("url", "")) or
        _has_official_source_id(notification.get("source_id", ""))
    )
    if not source_trusted:
        return False

    category = str(notification.get("category", "")).strip()
    content_type = CATEGORY_TO_CONTENT_TYPE.get(category, "")

    if content_type in OFFICIAL_CONTENT_TYPES:
        return True

    explicit_type = str(notification.get("contentType", "")).strip()
    if explicit_type in OFFICIAL_CONTENT_TYPES:
        return True

    if _has_official_source_id(notification.get("source_id", "")):
        return True

    if any(keyword in text for keyword in LAWS_AND_DIRECTIONS_KEYWORDS):
        return True
    if category and category not in NEWS_CATEGORIES:
        return True
    return False


def filter_official_notifications(notifications):
    """Drop any notification that is not a law or official direction."""
    accepted = []
    for notif in notifications:
        if is_official_law_or_direction(notif):
            accepted.append(notif)
        else:
            title = notif.get("title", "")
            source_id = notif.get("source_id", "unknown")
            print(f"  [notify] Skipped non-official item source={source_id!r} title={title!r}")
    return accepted



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
            # Only queue content change for non-news categories
            if category not in NEWS_CATEGORIES:
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
        # Only queue content change for non-news categories
        if category not in NEWS_CATEGORIES:
            change_id = queue_content_change(db, notification)
            if change_id:
                draft_ref.set({"contentChangeId": change_id}, merge=True)
        print(f"  [notify] Queued for admin approval: {draft_id}")
        return True

    except Exception as e:
        print(f"  [notify] Failed to queue draft: {e}")
        return False


def queue_batch(db, notifications: list[dict]) -> dict:
    """Queue detected updates for admin review. Returns stats.

    Every notification is first filtered through
    :func:`is_official_law_or_direction` so only laws, ministerial directions
    and structured official-data changes reach the approval queue. Rejected
    items are counted separately so ops can spot regressions.
    """
    stats = {"queued": 0, "duplicates_or_failed": 0, "rejected_non_official": 0}
    accepted = []
    for n in notifications:
        if is_official_law_or_direction(n):
            accepted.append(n)
        else:
            stats["rejected_non_official"] += 1
            title = n.get("title", "")
            source_id = n.get("source_id", "unknown")
            print(f"  [notify] Skipped non-official item source={source_id!r} title={title!r}")
    for n in accepted:
        if queue_draft_notification(db, n):
            stats["queued"] += 1
        else:
            stats["duplicates_or_failed"] += 1
    return stats


def queue_news_item(db, notification: dict) -> bool:
    """Queue a news/media item into news_items for admin approval.

    This is SEPARATE from queue_batch (laws & directions). News items are
    media articles about migration — they are useful for retention but must
    never be presented as official law/direction. Personal stories and
    opinion pieces are still rejected here using the same markers.
    """
    text = _text_blob(notification)
    for marker in PERSONAL_OR_STORY_MARKERS:
        if marker in text:
            print(f"  [news] Skipping personal-story item: {notification.get('title', '')[:60]}")
            return False

    if not _is_migration_relevant_news(notification):
        print(f"  [news] Skipping non-migration or personal-story item: {notification.get('title', '')[:80]}")
        return False

    source_id = str(notification.get("source_id", "news_rss")).strip().lower()
    title_key = _normalize_title(notification.get("title", ""))
    canonical_url = _canonicalize_url(notification.get("url", ""))
    dedup_raw = f"{source_id}|{title_key}|{canonical_url}"
    news_id = hashlib.sha256(dedup_raw.encode("utf-8")).hexdigest()[:24]
    ref = db.collection("news_items").document(news_id)
    try:
        if ref.get().exists:
            return False
        created_at = notification.get("timestamp") or datetime.now(timezone.utc).isoformat()

        # Structured summary (whatChanged/whoIsAffected/actionRequired). Falls
        # back to a plain object built from the legacy flat body so older
        # notifications queued before this schema still render sensibly.
        structured_summary = notification.get("summary")
        if not isinstance(structured_summary, dict):
            structured_summary = {
                "whatChanged": notification.get("body", "") or str(structured_summary or ""),
                "whoIsAffected": "",
                "actionRequired": "",
            }

        body_text = notification.get("body") or structured_summary.get("whatChanged") or ""

        ref.create({
            "id": news_id,
            # Legacy flat fields — kept for backward compatibility with older UI.
            "title": notification.get("title", notification.get("headline", ""))[:200],
            "body": body_text,
            "sourceUrl": notification.get("url", ""),
            "url": notification.get("url", ""),
            "source": notification.get("source_id", "news_rss"),
            "dedupKey": dedup_raw,
            "status": "pending",
            "createdAt": created_at,
            "timestamp": created_at,
            # Agent-grade structured fields used by the Action Center.
            "headline": notification.get("headline") or notification.get("title", "")[:200],
            "category": notification.get("category", "News"),
            "impactedVisas": notification.get("impactedVisas", []),
            "effectiveDate": notification.get("effectiveDate", "Immediate"),
            "summary": structured_summary,
            "is_agent_relevant": notification.get("is_agent_relevant", True),
            # Source hierarchy / official verification gate.
            "is_official": notification.get("is_official", False),
            "requires_verification": notification.get("requires_verification", True),
            "references_official_instrument": notification.get("references_official_instrument", False),
            "source_tier": notification.get("source_tier", "tier2"),
            "needs_manual_review": notification.get("needs_manual_review", False),
        })
        print(f"  [news] Queued news item: {news_id}")
        return True
    except Exception as e:
        print(f"  [news] Failed to queue news item: {e}")
        return False


def queue_news_batch(db, notifications) -> dict:
    stats = {"queued": 0, "duplicates_or_failed": 0}
    for n in notifications:
        if queue_news_item(db, n):
            stats["queued"] += 1
        else:
            stats["duplicates_or_failed"] += 1
    return stats


# Backward-compatible name for local tooling. It only queues a draft.
send_topic_notification = queue_draft_notification
