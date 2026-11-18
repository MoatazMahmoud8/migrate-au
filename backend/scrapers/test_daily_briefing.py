"""Regression tests for the daily briefing filler-section safeguard.

These lock in the fix for notifications that padded empty sections with
generic "No new X were detected" placeholder text (see commit history for
daily_briefing.py around the 11/18 notification-quality fixes).
"""

from scrapers.daily_briefing import _briefing_fallback, _strip_filler_sections


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
