"""
Source tier classification for news ingestion.

Tier 1 = Official government / legislation sources — treated as authoritative,
          no further verification required.
Tier 2 = Everything else (law firm blogs, migration agents, mainstream media)
          — MUST be flagged for human verification before being treated as
          policy fact. If the article references a real official instrument
          (a legislative instrument number, a Migration Regulations amendment,
          or a direct Home Affairs announcement) we flag that too so admins
          can prioritise review.
"""

import re
from urllib.parse import urlsplit

# Department of Home Affairs, Federal Register of Legislation, and the 8
# state/territory nomination portals.
TIER1_DOMAINS = (
    "immi.homeaffairs.gov.au",
    "homeaffairs.gov.au",
    "border.gov.au",
    "legislation.gov.au",
    # State & territory nomination portals
    "nsw.gov.au",
    "migration.nsw.gov.au",
    "vic.gov.au",
    "liveinmelbourne.vic.gov.au",
    "migration.wa.gov.au",
    "wa.gov.au",
    "migration.qld.gov.au",
    "qld.gov.au",
    "migration.sa.gov.au",
    "sa.gov.au",
    "migration.tas.gov.au",
    "tas.gov.au",
    "act.gov.au",
    "canberrayourfuture.com.au",
    "nt.gov.au",
)

# Regex markers that suggest a Tier 2 (third-party) article is actually
# reporting on a real official instrument and therefore deserves priority
# admin review rather than being dismissed as "just a blog post".
OFFICIAL_INSTRUMENT_MARKERS = (
    r"\blin\s?\d{2}/\d+\b",                 # Legislative Instrument Number e.g. LIN 24/056
    r"legislative instrument",
    r"migration regulations?\s+(?:1994|amendment)",
    r"migration amendment",
    r"statutory rules?",
    r"gazett(?:e|al)",
    r"legislation\.gov\.au",
    r"immi\.homeaffairs\.gov\.au",
    r"home affairs (?:announce|confirm|release)",
    r"minister for immigration",
    r"department of home affairs",
)


def _domain(url: str) -> str:
    if not isinstance(url, str) or not url.strip():
        return ""
    try:
        host = urlsplit(url.strip()).netloc.lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""


def is_tier1_official(url: str) -> bool:
    """Return True if the URL belongs to a Tier 1 official source."""
    host = _domain(url)
    if not host:
        return False
    return any(host == d or host.endswith("." + d) for d in TIER1_DOMAINS)


def references_official_instrument(text: str) -> bool:
    """Return True if the text cites a real legislative/official instrument."""
    if not text:
        return False
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in OFFICIAL_INSTRUMENT_MARKERS)


def classify(url: str, text: str = "") -> dict:
    """Return verification metadata for a scraped article.

    Returns:
        {
          "is_official": bool,                      # Tier 1 government/legislation domain
          "requires_verification": bool,             # True for any Tier 2 source
          "references_official_instrument": bool,    # Tier 2 article citing a real instrument
          "source_tier": "tier1" | "tier2",
        }
    """
    official = is_tier1_official(url)
    refs_instrument = False if official else references_official_instrument(text)
    return {
        "is_official": official,
        "requires_verification": not official,
        "references_official_instrument": refs_instrument,
        "source_tier": "tier1" if official else "tier2",
    }
