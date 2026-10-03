"""Daily migration intelligence briefing generation.

This module turns the daily stream of official migration updates into a single
structured briefing that matches the app's required notification format:

Subject: ...
Body:
### 1. Federal Policy & SkillSelect Rounds
- ...
...

The short push notification uses a compact preview; the full formatted briefing is
stored alongside it in `fullBody` so the in-app detail screen can render the rich
version without truncating the content.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any, Iterable

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None


DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
OFFICIAL_SOURCE_HOSTS = {
    "immi.homeaffairs.gov.au",
    "www.homeaffairs.gov.au",
    "skillselect.gov.au",
    "www.vetassess.com.au",
    "www.tra.gov.au",
    "www.jobsandskills.gov.au",
    "www.education.gov.au",
    "www.nsw.gov.au",
    "www.vic.gov.au",
    "www.qld.gov.au",
    "www.wa.gov.au",
    "www.sa.gov.au",
    "www.tas.gov.au",
    "www.act.gov.au",
    "www.nt.gov.au",
}


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_source_url(item: dict[str, Any]) -> str:
    for key in ("sourceUrl", "url", "officialUrl"):
        value = item.get(key)
        if value:
            return str(value)
    return "https://immi.homeaffairs.gov.au/"


def _is_official(item: dict[str, Any]) -> bool:
    url = _extract_source_url(item).lower()
    return any(host in url for host in OFFICIAL_SOURCE_HOSTS) or "homeaffairs.gov.au" in url


def _dedupe(items: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        title = _normalize_text(item.get("title") or item.get("body") or "")
        url = _extract_source_url(item)
        key = (title.lower(), url.lower())
        if not title or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _briefing_fallback(items: list[dict[str, Any]]) -> dict[str, str]:
    """Deterministic fallback if Gemini is unavailable or disabled."""
    filtered = [item for item in items if (item.get("sourceUrl") or item.get("url") or item.get("source"))]
    if not filtered:
        return {
            "subject": "Migration update",
            "body": "### 1. Federal Policy & SkillSelect Rounds\n- No new government migration updates were detected today.\n\n### 2. State & Territory Nomination Status & Quotas\n- No active state updates.\n\n### 3. Fee, Occupation & Employer Sponsorship Changes\n- No fee or occupation changes were detected.\n\n### 4. Smart Applicant Action Steps\n1. Review your current visa and occupation profile.\n2. Confirm your documents and English test readiness.\n",
            "push_body": "Official migration updates are now available. Review the latest federal and state changes.",
        }

    primary = filtered[0]
    primary_title = _normalize_text(primary.get("title") or primary.get("source") or "Migration update")
    subject = primary_title[:90] if len(primary_title) <= 90 else f"{primary_title[:87].rstrip()}..."

    lines = [
        "### 1. Federal Policy & SkillSelect Rounds",
        f"- {primary_title}.",
        "",
        "### 2. State & Territory Nomination Status & Quotas",
        "- No active state nomination changes were detected at the time of this briefing.",
        "",
        "### 3. Fee, Occupation & Employer Sponsorship Changes",
        "- Check the latest visa fee, skills assessment, and CSOL updates released by official government sources.",
        "",
        "### 4. Smart Applicant Action Steps",
        "1. Confirm your visa subclass and required documents before lodging or updating an Expression of Interest.",
        "2. Review your points, occupation eligibility, and English test readiness against the latest official rules.",
    ]
    return {
        "subject": subject,
        "body": "\n".join(lines),
        "push_body": "Official migration updates are now available. Review the latest federal and state changes.",
    }


def _generate_with_gemini(items: list[dict[str, Any]]) -> dict[str, str] | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or genai is None:
        return None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL))
    except Exception:
        return None

    context_lines = []
    for item in items[:8]:
        title = _normalize_text(item.get("title") or item.get("body") or "Migration update")
        body = _normalize_text(item.get("body") or item.get("summary") or "")
        url = _extract_source_url(item)
        if len(body) > 500:
            body = body[:500].rstrip() + "…"
        context_lines.append(f"- {title} | {body} | Source: {url}")

    prompt = f"""You are an expert Australian Immigration Intelligence Analyst and Editor for a dedicated migration mobile app.

Your mission is to produce a daily, non-repetitive migration intelligence briefing for skilled migrants, international graduates, and employer-sponsored visa applicants.

CRITICAL CONTENT RULES:
1. STRICTLY EXCLUDE: celebrity gossip, personal social stories, political commentary, and unverified rumors. Generic 'how-to' filler unless directly tied to a newly updated policy or legislative instrument. Stale news or previously reported facts if no new announcement occurred in the past 24-48 hours.
2. STRICTLY INCLUDE: visa fee changes and VAC indexing; skilled occupation list additions/removals or CSOL changes; state and territory nomination openings, quota allocations, and status changes; federal and state invitation rounds, cutoffs and invited occupations; direct, actionable tips or compliance warnings.
3. GROUNDING & LINKS: every single update must be grounded in official government announcements. Include direct clickable markdown links [Source Name](URL) to the official government or agency source.
4. DEDUPLICATION: merge multiple articles on the same topic into a single concise update.

OUTPUT FORMAT:
Generate ONLY the following structure:

Subject: [Engaging, high-impact headline with an emoji, summarizing the #1 national migration update of the day for mobile push notifications]

Body:

### 1. Federal Policy & SkillSelect Rounds
- [Key development, affected subclasses, cutoff scores/dates, and clickable official link]

### 2. State & Territory Nomination Status & Quotas
- [Only mention states that have active updates or quota announcements; omit inactive states]

### 3. Fee, Occupation & Employer Sponsorship Changes
- [Updates to VAC, assessing bodies (e.g., VETASSESS, TRA), CSOL, or 482/186 rules]

### 4. Smart Applicant Action Steps
1. [Tactical, practical compliance check or lodgement strategy based on current policies]
2. [Point/document readiness tip]

Use these recent updates as the source material.

RECENT UPDATES:
{chr(10).join(context_lines)}

If there is no strong official update, produce a concise but factual 'no material change' briefing that still follows the required structure.
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 900,
                "top_p": 0.8,
            },
        )
        text = getattr(response, "text", "").strip()
        if not text:
            return None

        subject_match = re.search(r"Subject:\s*(.+)", text, flags=re.IGNORECASE | re.DOTALL)
        body_match = re.search(r"Body:\s*(.*)", text, flags=re.IGNORECASE | re.DOTALL)
        if not subject_match or not body_match:
            return None

        subject = subject_match.group(1).strip().splitlines()[0].strip()
        body = body_match.group(1).strip()
        if not subject or not body:
            return None

        lines = [line.strip() for line in body.splitlines() if line.strip()]
        push_preview = next(
            (line for line in lines if line and not line.startswith("###") and not line.startswith("1.")),
            subject,
        )
        return {"subject": subject, "body": body, "push_body": push_preview}
    except Exception:
        return None


def generate_daily_briefing(items: list[dict[str, Any]]) -> dict[str, str] | None:
    """Build the daily migration intelligence briefing for app notifications."""
    filtered = [item for item in _dedupe(items) if _is_official(item)]
    if not filtered:
        return _briefing_fallback(items)

    briefing = _generate_with_gemini(filtered)
    if briefing is None:
        return _briefing_fallback(filtered)
    return briefing


def queue_daily_briefing(db, items: list[dict[str, Any]]) -> bool:
    """Create a daily briefing notification in the main app feed."""
    if not db:
        return False

    briefing = generate_daily_briefing(items)
    if briefing is None:
        return False

    now = datetime.now(timezone.utc)
    doc_id = f"daily-briefing-{now.strftime('%Y%m%d')}"
    ref = db.collection("notifications").document(doc_id)

    payload = {
        "id": doc_id,
        "title": briefing["subject"],
        "body": briefing.get("push_body") or briefing["subject"],
        "fullBody": briefing["body"],
        "subject": briefing["subject"],
        "category": "Policy Update",
        "topic": "au_migration",
        "source": "AMG Intelligence",
        "sourceUrl": "https://immi.homeaffairs.gov.au/",
        "timestamp": now.isoformat(),
        "read": False,
        "userId": None,
        "isDailyBriefing": True,
    }

    try:
        ref.set(payload, merge=True)
        return True
    except Exception:
        return False
