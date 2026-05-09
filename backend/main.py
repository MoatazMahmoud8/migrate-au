"""
Main orchestrator — runs all scrapers, sends FCM notifications.
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

from scrapers import home_affairs, anzsco, state_nominations
from notify import send_batch


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
    print("\n[3/3] Scraping state nominations...")
    state_notifications = state_nominations.scrape(db)
    all_notifications.extend(state_notifications)
    print(f"      → {len(state_notifications)} change(s) detected")

    # ── Send FCM notifications for all detected changes
    print(f"\n{'─'*55}")
    total = len(all_notifications)
    if total == 0:
        print("  ✅ No changes detected — no notifications sent.")
    else:
        print(f"  📤 Sending {total} notification(s) via FCM...")
        stats = send_batch(db, all_notifications)
        print(f"  ✅ Sent: {stats['sent']}  ❌ Failed: {stats['failed']}")

    # ── Log run to Firestore
    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    db.collection("_scraper_runs").add({
        "timestamp": started_at.isoformat(),
        "duration_seconds": round(elapsed, 1),
        "notifications_sent": len(all_notifications),
        "breakdown": {
            "home_affairs": len(ha_notifications),
            "anzsco": len(anzsco_notifications),
            "states": len(state_notifications),
        },
    })

    print(f"\n  Completed in {elapsed:.1f}s")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    run()
