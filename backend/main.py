"""
Main orchestrator — runs all scrapers and queues updates for admin approval.
Designed to run as a GitHub Actions cron job every 30 minutes.

Environment variables required:
  FIREBASE_SERVICE_ACCOUNT  — JSON string of Firebase service account key
"""

import os
import json
import sys
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

from scrapers import home_affairs, anzsco, state_nominations, news_rss
from notify import queue_batch


def get_db():
    if not firebase_admin._apps:
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        if not raw:
            print("❌ FIREBASE_SERVICE_ACCOUNT env var not set.")
            sys.exit(1)
        cert_dict = json.loads(raw)
        cred = credentials.Certificate(cert_dict)
        firebase_admin.initialize_app(cred)
    return firestore.client()


def run():
    started_at = datetime.now(timezone.utc)
    print(f"\n{'='*55}")
    print(f"  MigrateAU Scraper — {started_at.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*55}")

    db = get_db()
    all_notifications = []

    # ── 1. Home Affairs (visa changes, points test, SkillSelect, processing times)
    print("\n[1/3] Scraping Home Affairs...")
    ha_notifications = home_affairs.scrape(db)
    all_notifications.extend(ha_notifications)
    print(f"      → {len(ha_notifications)} change(s) detected")

    # ── 2. ANZSCO occupation lists
    print("\n[2/3] Scraping ANZSCO occupation lists...")
    anzsco_notifications = anzsco.scrape(db)
    all_notifications.extend(anzsco_notifications)
    print(f"      → {len(anzsco_notifications)} change(s) detected")

    # ── 3. State & territory nominations (all 8)
    print("\n[3/5] Scraping state nominations...")
    state_notifications = state_nominations.scrape(db)
    all_notifications.extend(state_notifications)
    print(f"      → {len(state_notifications)} change(s) detected")

    # ── 4. Visa fee page monitoring (detects fee changes, queues admin review)
    print("\n[4/5] Monitoring visa fee pages...")
    fee_notifications = home_affairs.scrape_fees(db)
    all_notifications.extend(fee_notifications)
    print(f"      → {len(fee_notifications)} fee change(s) detected")

    # ── 5. RSS news (migration-relevant media articles)
    print("\n[5/5] Checking RSS news feeds...")
    news_notifications = news_rss.scrape(db)
    all_notifications.extend(news_notifications)
    print(f"      → {len(news_notifications)} new article(s)")

    # ── Queue all detected changes for administrator review
    print(f"\n{'─'*55}")
    total = len(all_notifications)
    if total == 0:
        print("  No changes detected — no drafts queued.")
    else:
        print(f"  Queuing {total} update(s) for admin approval...")
        stats = queue_batch(db, all_notifications)
        print(
            f"  Queued: {stats['queued']}  "
            f"Duplicates/failed: {stats['duplicates_or_failed']}"
        )

    # ── Log run to Firestore
    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    db.collection("_scraper_runs").add({
        "timestamp": started_at.isoformat(),
        "duration_seconds": round(elapsed, 1),
        "notifications_sent": 0,
        "drafts_queued": stats["queued"] if total else 0,
        "breakdown": {
            "home_affairs": len(ha_notifications),
            "anzsco": len(anzsco_notifications),
            "states": len(state_notifications),
            "visa_fees": len(fee_notifications),
            "news_rss": len(news_notifications),
        },
    })

    print(f"\n  Completed in {elapsed:.1f}s")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    run()
