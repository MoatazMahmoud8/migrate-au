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


_SNAPSHOT_SUBCLASSES = ["189", "190", "491", "482", "500", "485", "186"]

# Phrases the model (or a deterministic template) might use to pad out a
# section that has nothing real to report. Matched case-insensitively
# against a section's content lines; if every content line in a section
# matches one of these, the whole section (header included) is dropped
# rather than shipped as empty filler.
_FILLER_LINE_RE = re.compile(
    r"^[\s\-*]*(no|none|there\s+(?:were|was)\s+no)\s+[\w\s/&,-]{0,80}?"
    r"(detected|found|reported|identified|available)|"
    r"^[\s\-*]*(no|none)\s+[\w\s/&,-]{0,60}?(changes?|updates?)\s+"
    r"(were|was|have been|has been)?\s*(detected|found|reported|identified|available)",
    re.IGNORECASE,
)


def _strip_filler_sections(body: str) -> str:
    """Remove any '### N. Title' section whose only content is a generic
    'no changes/updates detected' placeholder line, regardless of whether
    that placeholder came from a template or from Gemini ignoring the
    prompt's instruction not to pad empty sections. This is the backstop
    that makes the no-filler guarantee hold even when the model doesn't
    comply, since prompting alone proved unreliable in testing.
    """
    if "###" not in body:
        return body

    # Split into (header, content) blocks on each "### " heading line.
    blocks = re.split(r"(?m)^(### .+)$", body)
    # blocks[0] is any preamble before the first heading; after that it
    # alternates [header, content, header, content, ...].
    kept = [blocks[0]] if blocks and blocks[0].strip() else []
    for i in range(1, len(blocks), 2):
        header = blocks[i]
        content = blocks[i + 1] if i + 1 < len(blocks) else ""
        content_lines = [line for line in content.splitlines() if line.strip()]
        is_all_filler = bool(content_lines) and all(
            _FILLER_LINE_RE.search(line) for line in content_lines
        )
        if is_all_filler:
            continue
        kept.append(header)
        kept.append(content)
    return "\n".join(part for part in kept).strip()


def _visa_snapshot_tip(db, now: datetime) -> dict[str, str] | None:
    """Build a genuinely informative notification from real, current fee and
    processing-time data (visa_fees/visa_processing_times collections) when
    there is no new news to report that day.

    A flat "No new migration updates were detected today" message was being
    shipped on every slow-news day (and most days ARE slow-news days once
    guide/evergreen blog content and unrelated general-news articles are
    correctly filtered out) -- technically honest, but useless to a user
    checking the app, and complained about directly. Instead of silence,
    rotate daily through a real visa subclass's actual current fee and
    processing time (both scraped from Home Affairs, never fabricated), so
    every single day's notification carries real, concrete information even
    when there's no breaking policy change to report.
    """
    if db is None:
        return None
    subclass = _SNAPSHOT_SUBCLASSES[now.timetuple().tm_yday % len(_SNAPSHOT_SUBCLASSES)]
    try:
        fee_doc = db.collection("visa_fees").document(subclass).get().to_dict()
        pt_doc = db.collection("visa_processing_times").document(subclass).get().to_dict()
    except Exception:
        return None
    if not fee_doc and not pt_doc:
        return None

    visa_name = (pt_doc or {}).get("name") or (fee_doc or {}).get("name") or f"Subclass {subclass}"
    fee = (fee_doc or {}).get("fee")
    fee_note = (fee_doc or {}).get("feeNote") or ""
    streams = (pt_doc or {}).get("streams") or []
    processing_line = ""
    if streams:
        parts = [f"{s.get('name')}: median {s.get('p50')}, 90% within {s.get('p90')}" for s in streams if s.get("name")]
        processing_line = "; ".join(parts)

    subject = f"Today's Visa Snapshot: Subclass {subclass} {visa_name}"
    # Build one real, grammatically complete sentence instead of joining
    # sentence fragments with ". " (which previously produced lowercase
    # fragments glued together like "Subclass 189 (Skilled Independent).
    # fee is AUD $6,140. current processing time — ...", reading as raw
    # concatenated data rather than a sentence a person would write).
    push_body = f"Subclass {subclass} ({visa_name}) currently has"
    if fee:
        push_body += f" a visa fee of {fee}"
    if processing_line:
        push_body += f"{',' if fee else ''} with current processing times of {processing_line}"
    push_body += "."
    if len(push_body) > 296:
        push_body = push_body[:293].rstrip() + "…"

    conditions = (pt_doc or {}).get("conditions") or []
    conditions_md = "\n".join(f"- {c}" for c in conditions) or "- No special conditions on file."

    # This fallback only ever runs because there's no real federal/state
    # policy news to report that day -- so leading with "No new federal
    # migration policy changes" / "No active state nomination changes"
    # sections was pure filler, padding out the real content (the fee +
    # processing-time snapshot) with two headers that never say anything.
    # Lead directly with the one thing that's actually useful.
    body = (
        f"### Today's Visa Snapshot: Subclass {subclass} ({visa_name})\n"
        f"- Current fee: {fee or 'not available'}{f' ({fee_note})' if fee_note else ''}.\n"
        f"- Processing time: {processing_line or 'not available'}.\n\n"
        "### Eligibility Conditions\n"
        f"{conditions_md}\n\n"
        "### Smart Applicant Action Steps\n"
        "1. Confirm your own visa subclass matches current eligibility conditions above.\n"
        "2. Check your occupation and points profile against the latest official criteria.\n"
    )
    return {"subject": subject, "body": body, "push_body": push_body}


def _briefing_fallback(items: list[dict[str, Any]], db=None, now: datetime | None = None) -> dict[str, str]:
    """Deterministic fallback if Gemini is unavailable or disabled.

    IMPORTANT: push_body must always be derived from the actual items passed
    in, never a hardcoded generic sentence. A static "Official migration
    updates are now available..." body was shipping on nearly every
    notification (since most RSS news sources aren't on the strict
    OFFICIAL_SOURCE_HOSTS allowlist and almost always land here), making
    notifications look identical and carry no real information.
    """
    filtered = [item for item in items if (item.get("sourceUrl") or item.get("url") or item.get("source"))]
    if not filtered:
        snapshot = _visa_snapshot_tip(db, now or datetime.now(timezone.utc))
        if snapshot:
            return snapshot
        # Only reached if even the visa-fee/processing-time snapshot above
        # is unavailable (e.g. a Firestore outage) -- genuinely nothing to
        # report, so this stays a single plain notice instead of padding it
        # out with three empty "No new X" section headers.
        return {
            "subject": "Migration update",
            "body": "No new government migration updates were detected today. Check back tomorrow for the latest federal and state visa news.",
            "push_body": "No new migration updates were detected today — check back tomorrow.",
        }

    primary = filtered[0]
    primary_title = _normalize_text(primary.get("title") or primary.get("source") or "Migration update")
    subject = primary_title[:90] if len(primary_title) <= 90 else f"{primary_title[:87].rstrip()}..."

    primary_summary = _normalize_text(primary.get("body") or primary.get("summary") or "")

    # Build a push body from the actual top story (+ a second headline when
    # available) instead of a static sentence, so every notification reflects
    # what's genuinely new that day.
    if primary_summary:
        push_body = f"{primary_title}: {primary_summary}"
    else:
        push_body = primary_title
    if len(filtered) > 1:
        second_title = _normalize_text(filtered[1].get("title") or filtered[1].get("source") or "")
        if second_title and second_title.lower() != primary_title.lower():
            push_body = f"{push_body} Also: {second_title}."
    if len(push_body) > 300:
        push_body = push_body[:297].rstrip() + "…"

    # Only section 1 (the actual story) and section 4 (always-applicable
    # generic advice) have real content here -- sections 2 and 3 are
    # omitted entirely rather than padded with "No new X were detected"
    # placeholders (see _strip_filler_sections for why that matters for
    # the Gemini path too).
    lines = [
        "### 1. Federal Policy & SkillSelect Rounds",
        f"- {primary_title}.",
        "",
        "### 4. Smart Applicant Action Steps",
        "1. Confirm your visa subclass and required documents before lodging or updating an Expression of Interest.",
        "2. Review your points, occupation eligibility, and English test readiness against the latest official rules.",
    ]
    return {
        "subject": subject,
        "body": "\n".join(lines),
        "push_body": push_body,
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
5. NO FILLER SECTIONS: never write a placeholder line like "No new federal
   migration policy changes were detected today" or "No active state
   nomination changes were detected today". If a section (1, 2, or 3) has
   no real update to report, OMIT that entire section -- header and all --
   rather than including it with a negative/empty statement. Only sections
   with genuine content should appear in the output.

OUTPUT FORMAT:
Generate ONLY the following structure (omitting any of sections 1-3 that
have no real content per rule 5 above):

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

If sections 1-3 have no real update to report, omit them per rule 5 -- do not pad them with a 'no material change' placeholder. Section 4 (Smart Applicant Action Steps) must always be present.
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                # 900 tokens was too tight for the full 4-section structure
                # (especially with markdown links), so Gemini's response was
                # silently truncated mid-sentence and that incomplete text
                # (e.g. "- No new federal") was shipped as the notification
                # body. Raised to give the full structure room to complete.
                "max_output_tokens": 2048,
                "top_p": 0.8,
            },
        )

        # If generation was cut off before finishing (hit the token limit,
        # tripped a safety filter, etc), response.text can still return
        # whatever partial text was produced instead of raising. Treat any
        # non-"STOP" finish reason as a failed generation so we fall back to
        # the deterministic briefing instead of shipping a truncated/garbled
        # notification to users.
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            finish_reason = getattr(candidates[0], "finish_reason", None)
            # FinishReason.STOP has both .name == "STOP" and int value 1;
            # accept either representation depending on SDK/protobuf version.
            finish_reason_name = getattr(finish_reason, "name", None)
            try:
                finish_reason_value = int(finish_reason) if finish_reason is not None else None
            except (TypeError, ValueError):
                finish_reason_value = None
            is_stop = finish_reason_name == "STOP" or finish_reason_value == 1
            if finish_reason is not None and not is_stop:
                return None

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

        # Backstop against Gemini padding an empty section with "No new X
        # were detected" filler despite the prompt instruction not to --
        # prompting alone proved unreliable in testing, so strip any such
        # section deterministically regardless of model compliance.
        body = _strip_filler_sections(body)

        # Section 4 (Action Steps) must always be present -- a response
        # missing it is incomplete/truncated (this is what let a cut-off
        # "- No new federal" body through before). Sections 1-3 are each
        # optional now (rule 5 tells Gemini to omit any with nothing real
        # to report), so they're no longer required here. Match on the
        # section's title text rather than its number, since Gemini may
        # renumber remaining sections when earlier ones are omitted.
        if "smart applicant action steps" not in body.lower():
            return None

        lines = [line.strip() for line in body.splitlines() if line.strip()]
        push_preview = next(
            (line for line in lines if line and not line.startswith("###") and not line.startswith("1.")),
            subject,
        )
        return {"subject": subject, "body": body, "push_body": push_preview}
    except Exception:
        return None


def generate_daily_briefing(items: list[dict[str, Any]], db=None, now: datetime | None = None) -> dict[str, str] | None:
    """Build the daily migration intelligence briefing for app notifications.

    Previously this only ever called Gemini when at least one item matched
    the strict OFFICIAL_SOURCE_HOSTS allowlist (gov.au domains etc). Since
    the daily briefing's only input is RSS media articles (ABC/SBS/migration
    agent blogs), that allowlist almost never matched anything, so Gemini was
    effectively never invoked and every single day fell through to the
    deterministic fallback -- which used to hardcode the same generic
    push_body regardless of content. Now Gemini is tried against all deduped
    items (official sources are still prioritized/ordered first when
    present), and only the deterministic (now content-aware) fallback is used
    if Gemini is unavailable or fails.

    `db`/`now` are threaded through to the fallback so that on days with no
    genuine news it can surface a real visa fee/processing-time snapshot
    instead of a contentless "no updates" placeholder.
    """
    deduped = _dedupe(items)
    if not deduped:
        return _briefing_fallback(items, db=db, now=now)

    official = [item for item in deduped if _is_official(item)]
    ordered = official + [item for item in deduped if item not in official]

    briefing = _generate_with_gemini(ordered)
    if briefing is None:
        return _briefing_fallback(ordered, db=db, now=now)
    return briefing


def queue_daily_briefing(db, items: list[dict[str, Any]]) -> bool:
    """Create a daily briefing notification in the main app feed.

    Must run once per calendar day regardless of whether this particular
    scraper run found any NEW articles passing the strict relevance filter
    -- on slow-news days that list is legitimately empty most/all runs, and
    previously this function was only ever called by main.py when it was
    non-empty, so on those days no briefing document was created at all
    (not even the deterministic "no major updates today" fallback, which
    already handles an empty `items` list fine). Callers should now invoke
    this on every run with whatever items they have (possibly []); the
    idempotency check below ensures we don't regenerate/overwrite an
    already-queued briefing for today on subsequent runs the same day.
    """
    if not db:
        return False

    now = datetime.now(timezone.utc)
    doc_id = f"daily-briefing-{now.strftime('%Y%m%d')}"
    ref = db.collection("notifications").document(doc_id)

    # Already queued earlier today (e.g. by an earlier run that found real
    # news) -- don't clobber it with a blander later-run result.
    try:
        if ref.get().exists:
            return True
    except Exception:
        pass

    briefing = generate_daily_briefing(items, db=db, now=now)
    if briefing is None:
        return False

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
