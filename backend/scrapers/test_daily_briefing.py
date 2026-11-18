"""Regression tests for the daily briefing filler-section safeguard.

These lock in the fix for notifications that padded empty sections with
generic "No new X were detected" placeholder text (see commit history for
daily_briefing.py around the 11/18 notification-quality fixes).
"""

from scrapers.daily_briefing import _briefing_fallback, _FILLER_LINE_RE, _strip_filler_sections


def test_strip_filler_sections_removes_placeholder_only_sections():
    body = (
        "### 1. Federal Policy\n"
        "- Something real happened here.\n\n"
        "### 2. State Updates\n"
        "- No active state nomination changes were detected at the time of this briefing.\n\n"
        "### 3. Fees\n"
        "- No fee, occupation, or employer sponsorship changes were detected.\n\n"
        "### 4. Smart Applicant Action Steps\n"
        "1. Do a thing.\n"
    )
    stripped = _strip_filler_sections(body)
    assert "### 2." not in stripped
    assert "### 3." not in stripped
    assert "### 1." in stripped
    assert "### 4." in stripped
    assert "Something real happened here." in stripped


def test_filler_regex_catches_rephrased_negatives():
    """Guards against the common rephrasings Gemini used when padding
    sections, beyond the original 'No X changes were detected' wording."""
    filler_lines = [
        "- No significant updates were reported for this category.",
        "- No material changes have been identified since the last briefing.",
        "- No updates available at this time.",
        "- There were no changes detected in state nomination programs.",
        "- No new SkillSelect invitation rounds were detected this week.",
        "- None reported for this period.",
    ]
    for line in filler_lines:
        assert _FILLER_LINE_RE.search(line), f"expected filler match: {line}"


def test_filler_regex_does_not_flag_real_content():
    real_lines = [
        "- NSW announced a new quota of 500 places.",
        "- The 189 visa fee increased to AUD 6,140 this quarter.",
        "- No cap applies this year, with 5,000 invitations issued in October.",
    ]
    for line in real_lines:
        assert not _FILLER_LINE_RE.search(line), f"unexpected filler match: {line}"


def test_strip_filler_sections_keeps_sections_with_real_content():
    body = (
        "### 2. State Updates\n"
        "- NSW announced a new quota of 500 places.\n"
        "- No other active state nomination changes were detected.\n"
    )
    stripped = _strip_filler_sections(body)
    assert "### 2." in stripped
    assert "NSW announced a new quota of 500 places." in stripped


def test_briefing_fallback_does_not_pad_empty_sections():
    result = _briefing_fallback(
        [
            {
                "title": "NSW announces new skilled migration quota",
                "body": "NSW will accept 2000 more nominations this year.",
                "url": "https://example.com",
            }
        ]
    )
    assert "No active state nomination changes" not in result["body"]
    assert "No fee, occupation, or employer sponsorship changes" not in result["body"]
    assert "### 1." in result["body"]
    assert "### 4." in result["body"]
