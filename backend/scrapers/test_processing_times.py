"""Regression tests for the processing-times GPT API sync.

Locks in the fix for the `visa_processing_times` Firestore collection being
stuck at its one-time seed data (the old scraper only hashed loose text on
the processing-times page and never wrote real per-subclass values).
"""

from scrapers.processing_times import _streams_from_gpt, _normalize_duration


def test_normalize_duration_passes_through_real_values():
    assert _normalize_duration("9 Months") == "9 Months"
    assert _normalize_duration("90 Days") == "90 Days"


def test_normalize_duration_rejects_not_available_placeholder():
    assert _normalize_duration("Processing times are not available") is None
    assert _normalize_duration(None) is None
    assert _normalize_duration("") is None


def test_streams_from_gpt_skips_unavailable_streams_and_keeps_real_ones():
    records = [
        {
            "VisaSubclassCode": "482",
            "StreamCode": "64",
            "StreamText": "Short-term",
            "Percent50": "Processing times are not available",
            "Percent90": "Processing times are not available",
        },
        {
            "VisaSubclassCode": "482",
            "StreamCode": "81",
            "StreamText": "Core Skills",
            "Percent50": "6 Months",
            "Percent90": "9 Months",
        },
    ]
    streams = _streams_from_gpt(records)
    assert streams == [{"name": "Core Skills", "p50": "6 Months", "p90": "9 Months"}]


def test_streams_from_gpt_defaults_unnamed_stream_to_standard():
    records = [{"VisaSubclassCode": "190", "StreamCode": "", "StreamText": "", "Percent50": "8 Months", "Percent90": "16 Months"}]
    streams = _streams_from_gpt(records)
    assert streams == [{"name": "Standard", "p50": "8 Months", "p90": "16 Months"}]
