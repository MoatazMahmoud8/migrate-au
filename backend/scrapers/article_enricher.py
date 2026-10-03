"""
Article enrichment — fetch full article content and generate structured,
agent-grade summaries for the admin Action Center.

Pipeline:
  1. Fetch the actual target webpage (never trust the RSS <description>).
  2. Extract real article paragraphs, stripping nav/ads/copyright footers
     (including WordPress "The post X appeared first on Y" boilerplate).
  3. Ask the LLM for a strict JSON schema: headline, category, impactedVisas,
     effectiveDate, summary{whatChanged, whoIsAffected, actionRequired},
     is_agent_relevant.
  4. If the article can't be fetched and the LLM can't produce a structured
     summary, we NEVER fall back to the raw RSS snippet — we flag the item
     for manual review instead.
"""

import json
import os
import re
import requests
from bs4 import BeautifulSoup

from scrapers.source_classifier import classify as classify_source

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

# Common junk patterns to remove from article text.
JUNK_PATTERNS = [
    # WordPress "full text RSS" plugin boilerplate — the exact junk this
    # overhaul exists to kill, e.g.:
    #   "The post Student visa changes from 2 October 2026 appeared first on VisaEnvoy."
    r'The post .*? appeared first on .*?(?:\.|$)',
    r'Get our\s*breaking news email.*?podcast',
    r'Sign up for.*?newsletter',
    r'Subscribe to.*?email',
    r'Download our.*?app',
    r'Follow us on.*?(?:Twitter|Facebook|Instagram)',
    r'Share this article',
    r'Click here to.*?(?:subscribe|sign up)',
    r'Read more:',
    r'See also:',
    r'Related articles?:',
    r'ADVERTISEMENT',
    r'Loading\.\.\.',
    r'Comments are closed',
    r'Leave a comment',
    r'\d+\s*shares?',
    r'Print this article',
    r'Email this article',
    r'Get the latest.*?inbox',
    r'Breaking news.*?free app',
    r'daily news podcast',
    r'breaking news email',
    r'free app',
]

# Minimum length (after junk-stripping) for cleaned text to be considered
# real content rather than a leftover one-liner footer.
MIN_VIABLE_TEXT_LENGTH = 120


def _clean_junk_text(text: str) -> str:
    """Remove newsletter prompts, social media links, WordPress RSS
    boilerplate, and other junk from article text."""
    cleaned = text
    for pattern in JUNK_PATTERNS:
        cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned


def _normalize_inline_text(text: str) -> str:
    normalized = (text or "").replace("\xa0", " ")
    return re.sub(r"\s+", " ", normalized).strip()


def _fetch_article(url: str) -> str | None:
    """Fetch the real article body from the target webpage (never the RSS
    description). Strips navigation, ads, and copyright footers."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; MigrateAU/1.0)"}
        resp = requests.get(url, timeout=12, headers=headers)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.content, "lxml")

        # Strip tag-name noise (script/nav/etc) via find_all, and class-based
        # noise (".newsletter" etc) via CSS select -- soup([...]) only matches
        # tag names, not selectors, so the two must be handled separately.
        for tag in soup.find_all(["script", "style", "nav", "footer", "aside", "iframe", "form", "button"]):
            tag.decompose()
        for selector in [".newsletter", ".social-share", ".ad", ".advertisement", ".promo", ".signup"]:
            for tag in soup.select(selector):
                tag.decompose()

        def _paragraphs_of(container) -> list[str]:
            found = []
            for p in container.find_all("p"):
                paragraph_text = _normalize_inline_text(p.get_text(" ", strip=True))
                if len(paragraph_text) > 40:
                    found.append(paragraph_text)
            return found

        # Prefer semantic containers for the real article body, but don't
        # short-circuit on the first container that merely EXISTS -- a
        # WordPress theme's related-posts "article" teaser can have zero
        # paragraphs. Pick the first candidate that actually yields usable
        # paragraphs instead.
        candidates = [
            soup.select_one("article .entry-content-wrapper"),
            soup.find("main"),
            soup.select_one(".post-content"),
            soup.find("article"),
            soup,
        ]
        paragraphs = []
        for candidate in candidates:
            if candidate is None:
                continue
            found = _paragraphs_of(candidate)
            if found:
                paragraphs = found
                break

        text = "\n".join(paragraphs[:20])
        text = _clean_junk_text(text)

        return text[:8000] if text else None
    except Exception as e:
        print(f"  [enricher] Fetch failed: {e}")
        return None


STRUCTURED_SCHEMA_PROMPT = """You are an AI migration policy analyst generating a strict JSON brief for an Australian migration admin dashboard.

TASK: Read the article below and output ONLY a JSON object (no markdown fences, no commentary) matching EXACTLY this schema:

{{
  "headline": "Concise, agent-level title (max 120 chars)",
  "category": "Visa Conditions | Fees | State Nomination | Legislation | Policy",
  "impactedVisas": ["<subclass numbers mentioned, e.g. 500, 482>"],
  "effectiveDate": "YYYY-MM-DD or 'Immediate' if no date is given",
  "summary": {{
    "whatChanged": "Precise regulatory/policy amendment or news event",
    "whoIsAffected": "Specific subclasses, applicants, or sponsors affected",
    "actionRequired": "Operational advice or deadline for affected people"
  }},
  "is_agent_relevant": true
}}

RULES:
- "category" MUST be exactly one of the 5 listed values.
- "impactedVisas" MUST be an array of strings (subclass numbers only, no "subclass" word). Use [] if none mentioned.
- Set "is_agent_relevant" to false if the article is not actually about Australian migration policy/visas (e.g. unrelated news that slipped through).
- Never include newsletter prompts, "subscribe", "appeared first on", or other boilerplate in any field.
- Output valid JSON only.

SOURCE TIER: {tier_note}

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{content}

JSON:"""


def _extract_json_block(raw: str) -> str:
    """Pull the JSON object out of a model response that may include
    markdown code fences or leading/trailing commentary."""
    raw = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence_match:
        return fence_match.group(1)
    brace_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace_match:
        return brace_match.group(0)
    return raw


def _generate_structured_summary(title: str, content: str, is_official: bool) -> dict | None:
    """Call the LLM for the strict structured JSON schema. Returns None on
    any failure so the caller can fall back safely."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return None

    tier_note = (
        "Tier 1 official government source — treat as authoritative."
        if is_official
        else "Tier 2 third-party source — this has NOT been verified against an official instrument yet."
    )

    try:
        genai.configure(api_key=api_key)
        # gemini-1.5-pro was retired by Google; gemini-2.5-flash is the
        # current fast/cheap model suited to this short structured-JSON task.
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = STRUCTURED_SCHEMA_PROMPT.format(
            tier_note=tier_note,
            title=title,
            content=content[:5000],
        )

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=2048,
                temperature=0.1,
            ),
        )
        raw = response.text.strip()
        json_str = _extract_json_block(raw)
        data = json.loads(json_str)

        # Validate required shape.
        required_top = {"headline", "category", "impactedVisas", "effectiveDate", "summary", "is_agent_relevant"}
        if not required_top.issubset(data.keys()):
            print(f"  [enricher] ⚠️ Structured summary missing keys: {data.keys()}")
            return None
        summary = data.get("summary") or {}
        if not isinstance(summary, dict) or not {"whatChanged", "whoIsAffected", "actionRequired"}.issubset(summary.keys()):
            print("  [enricher] ⚠️ Structured summary.summary missing sub-keys")
            return None

        # Clean any junk that slipped through into text fields.
        data["headline"] = _clean_junk_text(str(data.get("headline", "")))[:120]
        summary["whatChanged"] = _clean_junk_text(str(summary.get("whatChanged", "")))
        summary["whoIsAffected"] = _clean_junk_text(str(summary.get("whoIsAffected", "")))
        summary["actionRequired"] = _clean_junk_text(str(summary.get("actionRequired", "")))
        data["summary"] = summary

        if not isinstance(data.get("impactedVisas"), list):
            data["impactedVisas"] = []

        return data
    except Exception as e:
        print(f"  [enricher] Gemini structured summary error: {e}")
        return None


def _finalize_sentences(text: str, max_chars: int = 480) -> str:
    """Trim to a sentence boundary within max_chars without silently
    truncating mid-word."""
    text = (text or "").strip()
    if not text:
        return text
    if len(text) <= max_chars:
        return text
    pieces = re.split(r'(?<=[.!?])\s+', text)
    out = ""
    for p in pieces:
        candidate = (out + (" " if out else "") + p).strip()
        if len(candidate) > max_chars:
            break
        out = candidate
    if not out:
        out = text[:max_chars].rsplit(" ", 1)[0] + "…"
    return out


def enrich_structured(title: str, rss_desc: str, url: str) -> dict:
    """Build a complete, structured, agent-grade news record.

    Returns a dict always containing:
      - is_official, requires_verification, references_official_instrument, source_tier
      - headline, category, impactedVisas, effectiveDate
      - summary: {whatChanged, whoIsAffected, actionRequired}
      - is_agent_relevant
      - body: flat plain-text fallback (for legacy UI), NEVER the raw RSS snippet
      - needs_manual_review: True if we couldn't get real article content

    Never stores the raw RSS <description> as the body. If full-text
    extraction AND structured summarisation both fail, the item is flagged
    needs_manual_review instead of being populated with junk.
    """
    cleaned_rss_desc = _normalize_inline_text(_clean_junk_text(rss_desc))

    article_text = _fetch_article(url)
    tier_info = classify_source(url, article_text or cleaned_rss_desc)

    structured = None
    if article_text and len(article_text) >= MIN_VIABLE_TEXT_LENGTH:
        structured = _generate_structured_summary(title, article_text, tier_info["is_official"])

    if structured:
        body_source = (
            f"{structured['summary']['whatChanged']} "
            f"{structured['summary']['whoIsAffected']} "
            f"{structured['summary']['actionRequired']}"
        ).strip()
        return {
            **tier_info,
            "headline": structured["headline"] or title,
            "category": structured["category"],
            "impactedVisas": structured["impactedVisas"],
            "effectiveDate": structured["effectiveDate"],
            "summary": structured["summary"],
            "is_agent_relevant": bool(structured["is_agent_relevant"]),
            "body": _finalize_sentences(body_source),
            "needs_manual_review": False,
        }

    # Structured summary unavailable. Try a plain-text excerpt from the real
    # article (still never the RSS snippet).
    if article_text and len(article_text) >= MIN_VIABLE_TEXT_LENGTH:
        sentences = re.split(r"(?<=[.!?])\s+", article_text)
        good_sentences = [
            s for s in sentences
            if len(s) > 30 and not any(j in s.lower() for j in ["subscribe", "newsletter", "download", "follow us"])
        ]
        excerpt = _normalize_inline_text(_clean_junk_text(" ".join(good_sentences[:4])))
        if len(excerpt) > 100:
            print(f"  [enricher] 📝 Excerpt fallback (no structured summary): {title[:50]}")
            return {
                **tier_info,
                "headline": title,
                "category": "Policy",
                "impactedVisas": [],
                "effectiveDate": "Immediate",
                "summary": {
                    "whatChanged": excerpt,
                    "whoIsAffected": "See article for details.",
                    "actionRequired": "Review full source article before publishing.",
                },
                "is_agent_relevant": True,
                "body": _finalize_sentences(excerpt),
                "needs_manual_review": True,
            }

    # Full article text could not be obtained and no structured summary was
    # produced. We explicitly refuse to store the raw RSS snippet (that's the
    # WordPress copyright-footer junk this overhaul exists to kill) — flag
    # for manual admin review instead.
    print(f"  [enricher] ⚠️ Manual review required (no usable content): {title[:50]}")
    return {
        **tier_info,
        "headline": title,
        "category": "Policy",
        "impactedVisas": [],
        "effectiveDate": "Immediate",
        "summary": {
            "whatChanged": "Full article text could not be automatically extracted.",
            "whoIsAffected": "Unknown — review source directly.",
            "actionRequired": "Admin must open the original source link to verify before publishing.",
        },
        "is_agent_relevant": True,
        "body": "Full article unavailable — review the original source directly before approving.",
        "needs_manual_review": True,
    }


def enrich(title: str, rss_desc: str, url: str) -> str:
    """Backward-compatible flat-string entry point. Prefer enrich_structured()
    for new callers that can store the full structured schema."""
    return enrich_structured(title, rss_desc, url)["body"]
