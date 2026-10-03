#!/usr/bin/env python3
"""
Lightweight local test driver for the news RSS ingestion pipeline.

Lets you iterate on scrapers/news_rss.py + scrapers/article_enricher.py
without triggering the full scraping suite (home_affairs, anzsco, etc.) or
waiting on a GitHub Actions workflow_dispatch run.

Usage:
    cd expo-app/backend
    python3 test_news_scraper.py --dry-run              # print structured JSON, no Firestore writes
    python3 test_news_scraper.py --dry-run --limit 1     # just one item
    python3 test_news_scraper.py --live                  # writes ONE clean test doc to news_items
    python3 test_news_scraper.py --live --url <article>  # enrich a specific article URL directly

Dry-run mode needs NO Firebase credentials at all - it only talks to the
public RSS feeds + (optionally) the Gemini API for structured summaries.
Live mode needs Firestore credentials (see _load_firestore_client below).
"""

import argparse
import json
import os
import sys

# Ensure `scrapers.*` imports resolve regardless of the current working
# directory the script is invoked from.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

from scrapers import news_rss
from scrapers.article_enricher import enrich_structured


def _load_env_file(path: str = ".env") -> None:
    """Minimal .env loader (no python-dotenv dependency). Only sets variables
    that aren't already present in the environment."""
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def _load_firestore_client():
    """Load a Firestore client for --live mode.

    Tries, in order:
      1. FIREBASE_SERVICE_ACCOUNT env var (JSON string) - same as CI/main.py.
      2. GOOGLE_APPLICATION_CREDENTIALS env var (path to a service account file).
      3. A local service_account.json / firebase-key.json next to this script.
    """
    import firebase_admin
    from firebase_admin import credentials, firestore

    if firebase_admin._apps:
        return firestore.client()

    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if raw:
        cred = credentials.Certificate(json.loads(raw))
        firebase_admin.initialize_app(cred)
        return firestore.client()

    explicit_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    candidates = [explicit_path] if explicit_path else []
    candidates += [
        os.path.join(BACKEND_DIR, "service_account.json"),
        os.path.join(BACKEND_DIR, "firebase-key.json"),
        os.path.join(BACKEND_DIR, "..", "firebase-key.json"),
    ]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate):
            cred = credentials.Certificate(candidate)
            firebase_admin.initialize_app(cred)
            return firestore.client()

    print(
        "No Firebase credentials found for --live mode.\n"
        "  Set one of:\n"
        "    FIREBASE_SERVICE_ACCOUNT        (JSON string, same as CI)\n"
        "    GOOGLE_APPLICATION_CREDENTIALS  (path to a service account .json file)\n"
        "  ...or place service_account.json / firebase-key.json in backend/.\n"
        "  (--dry-run does not need any of this.)",
        file=sys.stderr,
    )
    sys.exit(1)


def _fetch_feed_candidates(limit: int) -> list:
    """Pull real candidates straight from the RSS feeds using the exact same
    filtering pipeline as scrapers/news_rss.py - but without any Firestore
    dedup/baseline logic, so it always returns something to inspect."""
    candidates = []
    for url in news_rss.RSS_FEEDS:
        try:
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            root = ET.fromstring(r.content)
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                raw_desc = item.findtext("description") or ""
                desc = BeautifulSoup(raw_desc, "html.parser").get_text(" ", strip=True)[:900]
                link = (item.findtext("link") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()

                if not news_rss._is_recent(pub_date):
                    continue
                if not news_rss._has_high_intent_keyword(title, desc):
                    continue
                score = news_rss._relevance_score(title, desc)
                if not (title and link and score >= 2 and news_rss._is_australian(title, desc)):
                    continue
                if news_rss._is_guide_content(title):
                    continue

                candidates.append({"title": title, "desc": desc, "link": link, "score": score})
        except Exception as e:
            print(f"  WARN: RSS error ({url}): {e}")

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates[:limit]


def _print_structured(title: str, enriched: dict) -> None:
    printable = {
        "headline": enriched["headline"],
        "category": enriched["category"],
        "impactedVisas": enriched["impactedVisas"],
        "effectiveDate": enriched["effectiveDate"],
        "summary": enriched["summary"],
        "is_agent_relevant": enriched["is_agent_relevant"],
        "is_official": enriched["is_official"],
        "requires_verification": enriched["requires_verification"],
        "references_official_instrument": enriched["references_official_instrument"],
        "source_tier": enriched["source_tier"],
        "needs_manual_review": enriched["needs_manual_review"],
    }
    print(f"\n{'-' * 60}\n{title}\n{'-' * 60}")
    print(json.dumps(printable, indent=2, ensure_ascii=False))


def run_dry(limit: int, single_url):
    if single_url:
        print(f"Enriching single URL: {single_url}")
        enriched = enrich_structured(single_url, "", single_url)
        _print_structured(single_url, enriched)
        return

    print(f"Fetching up to {limit} real candidate(s) from RSS feeds...")
    candidates = _fetch_feed_candidates(limit)
    if not candidates:
        print("No candidates matched the filters right now (try again later, or pass --url).")
        return

    for c in candidates:
        print(f"\n-> Enriching: {c['title'][:70]}")
        enriched = enrich_structured(c["title"], c["desc"], c["link"])
        _print_structured(c["title"], enriched)

    print(f"\nDry-run complete - {len(candidates)} item(s) processed, nothing written to Firestore.")


def run_live(limit: int, single_url, count: int = 1):
    import hashlib
    from notify import queue_news_item, _normalize_title, _canonicalize_url

    db = _load_firestore_client()

    if single_url:
        candidates = [{"title": single_url, "desc": "", "link": single_url}]
    else:
        # Fetch more candidates than requested so skipped duplicates/filtered
        # items don't shrink the final written count below what was asked for.
        candidates = _fetch_feed_candidates(max(limit, count * 3)) or []

    if not candidates:
        print("No candidates matched the filters right now (try again later, or pass --url).")
        return

    written: list[dict] = []
    for c in candidates:
        if len(written) >= count:
            break
        print(f"\n-> Enriching + queueing: {c['title'][:70]}")
        enriched = enrich_structured(c["title"], c["desc"], c["link"])
        _print_structured(c["title"], enriched)

        notification = {
            "source_id": "news_rss_test",
            "headline": enriched["headline"],
            "category": enriched["category"],
            "impactedVisas": enriched["impactedVisas"],
            "effectiveDate": enriched["effectiveDate"],
            "summary": enriched["summary"],
            "is_agent_relevant": enriched["is_agent_relevant"],
            "is_official": enriched["is_official"],
            "requires_verification": enriched["requires_verification"],
            "references_official_instrument": enriched["references_official_instrument"],
            "source_tier": enriched["source_tier"],
            "needs_manual_review": enriched["needs_manual_review"],
            "title": c["title"][:150],
            "body": enriched["body"],
            "url": c["link"],
        }

        # queue_news_item() computes this same deterministic ID internally;
        # replicate it here (read-only) so we can report back which doc was
        # written without changing that function's public bool-only signature.
        source_id = str(notification.get("source_id", "news_rss")).strip().lower()
        title_key = _normalize_title(notification.get("title", ""))
        canonical_url = _canonicalize_url(notification.get("url", ""))
        doc_id = hashlib.sha256(f"{source_id}|{title_key}|{canonical_url}".encode("utf-8")).hexdigest()[:24]

        queued = queue_news_item(db, notification)
        if queued:
            written.append({"id": doc_id, "title": enriched["headline"] or c["title"]})
        else:
            print(f"   (skipped - duplicate or filtered by notify.py)")

    print(f"\n{'=' * 60}")
    if written:
        print(f"Wrote {len(written)} document(s) to news_items:")
        for w in written:
            print(f"  - {w['id']}  |  {w['title'][:70]}")
        print("\nCheck https://migrateau-admin-205705.web.app/admin/actions now.")
    else:
        print("Nothing written - all candidates were duplicates or filtered.")


def main() -> None:
    _load_env_file()

    parser = argparse.ArgumentParser(description="Local test driver for the news RSS scraper.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Print structured JSON only, no Firestore writes.")
    mode.add_argument("--live", action="store_true", help="Write one clean test document to news_items.")
    parser.add_argument("--limit", type=int, default=2, help="Max candidates to process (dry-run only; default 2).")
    parser.add_argument("--url", type=str, default=None, help="Enrich this specific article URL instead of pulling from RSS feeds.")
    parser.add_argument("--count", type=int, default=1, help="Number of clean documents to write in --live mode (default 1).")
    args = parser.parse_args()

    if args.dry_run:
        run_dry(args.limit, args.url)
    else:
        run_live(args.limit, args.url, args.count)


if __name__ == "__main__":
    main()
