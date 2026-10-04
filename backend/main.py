"""
Main orchestrator — runs all scrapers and queues updates for admin approval.
Designed to run as a GitHub Actions cron job during AU working hours (3 times on weekdays).

Environment variables required:
  FIREBASE_SERVICE_ACCOUNT  — JSON string of Firebase service account key
"""

import os
import json
import sys
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

from scrapers import home_affairs, anzsco, state_nominations, news_rss, processing_times, admin_intel
from scrapers.assessing_authority_fees import scrape as scrape_assessing_fees
from scrapers.daily_briefing import queue_daily_briefing
from notify import queue_batch, queue_news_batch


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


def _write_heartbeat(db, *, status, items_found, items_published, duplicates_skipped,
                      sources_checked, error_message, summary):
    """Record scraper heartbeat so the admin dashboard can tell whether the
    scraper actually ran, even on runs that find zero new items."""
    try:
        db.collection("system_health").document("scraper_status").set({
            "last_run_at": firestore.SERVER_TIMESTAMP,
            "status": status,
            "items_found": items_found,
            "items_published": items_published,
            "duplicates_skipped": duplicates_skipped,
            "sources_checked": sources_checked,
            "error_message": error_message,
            "summary": summary,
        })
    except Exception as exc:  # pragma: no cover - heartbeat must never crash the run
        print(f"  ⚠ Failed to write scraper heartbeat: {exc}")


def run():
    started_at = datetime.now(timezone.utc)
    print(f"\n{'='*55}")
    print(f"  MigrateAU Scraper — {started_at.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*55}")

    db = get_db()
    all_notifications = []
    sources_checked = [
        "home_affairs", "anzsco", "state_nominations", "visa_fees",
        "assessing_authority_fees", "news_rss", "processing_times", "admin_intel",
    ]

    # ── 1. Home Affairs (visa changes, points test, SkillSelect, processing times)
    print("\n[1/7] Scraping Home Affairs...")
    ha_notifications = home_affairs.scrape(db)
    all_notifications.extend(ha_notifications)
    print(f"      → {len(ha_notifications)} change(s) detected")

    # ── 2. ANZSCO occupation lists
    print("\n[2/7] Scraping ANZSCO occupation lists...")
    anzsco_notifications = anzsco.scrape(db)
    all_notifications.extend(anzsco_notifications)
    print(f"      → {len(anzsco_notifications)} change(s) detected")

    # ── 3. State & territory nominations (all 8)
    print("\n[3/7] Scraping state nominations...")
    state_notifications = state_nominations.scrape(db)
    all_notifications.extend(state_notifications)
    print(f"      → {len(state_notifications)} change(s) detected")

    # ── 4. Visa fee page monitoring (detects fee changes, queues admin review)
    print("\n[4/7] Monitoring visa fee pages...")
    fee_notifications = home_affairs.scrape_fees(db)
    all_notifications.extend(fee_notifications)
    print(f"      → {len(fee_notifications)} fee change(s) detected")

    # ── 4b. Assessing authority fee pages (VETASSESS etc.)
    print("\n[4b/7] Monitoring assessing authority fee pages...")
    assessment_fee_notifications = scrape_assessing_fees(db)
    all_notifications.extend(assessment_fee_notifications)
    print(f"      → {len(assessment_fee_notifications)} assessment fee change(s) detected")

    # ── 5. RSS news (migration-relevant media articles)
    print("\n[5/7] Checking RSS news feeds...")
    news_notifications = news_rss.scrape(db)
    print(f"      → {len(news_notifications)} new article(s)")

    # News goes into news_items (admin curates in /admin/news) — NOT into the
    # laws-and-directions approval queue. Keeps compliance clean while still
    # giving users a migration news feed.
    news_stats = {"queued": 0, "duplicates_or_failed": 0}
    if news_notifications:
        news_stats = queue_news_batch(db, news_notifications)
        print(f"      → queued {news_stats['queued']} news item(s) for admin review")
        queue_daily_briefing(db, news_notifications)

    # ── 6. Processing times (cloudscraper-based)
    print("\n[6/7] Scraping processing times...")
    pt_notifications = processing_times.scrape_processing_times(db)
    all_notifications.extend(pt_notifications)
    print(f"      → {len(pt_notifications)} processing time change(s)")

    # ── 7. Admin intel (competitor sites - admin-only, no user notifications)
    print("\n[7/7] Scraping admin intel sources...")
    intel_items = admin_intel.scrape_intel(db)
    print(f"      → {len(intel_items)} intel change(s) detected (admin-only)")

    # ── Queue all detected changes for administrator review
    print(f"\n{'─'*55}")
    total = len(all_notifications)
    stats = {"queued": 0, "duplicates_or_failed": 0}
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
            "assessment_fees": len(assessment_fee_notifications),
            "news_rss": len(news_notifications),
            "processing_times": len(pt_notifications),
            "admin_intel": len(intel_items),
        },
    })

    print(f"\n  Completed in {elapsed:.1f}s")
    print(f"{'='*55}\n")

    # ── Heartbeat: let the admin dashboard know the scraper actually ran,
    # even on a run that finds zero new items.
    items_found = total + len(news_notifications) + len(intel_items)
    items_published = stats["queued"] + news_stats["queued"]
    duplicates_skipped = stats["duplicates_or_failed"] + news_stats["duplicates_or_failed"]
    if items_published == 0:
        summary = f"Ran successfully. 0 new articles found (up to date). Checked {len(sources_checked)} sources."
    else:
        summary = (
            f"Ran successfully. {items_published} new item(s) published "
            f"({items_found} found, {duplicates_skipped} duplicate/skipped)."
        )
    _write_heartbeat(
        db,
        status="ok",
        items_found=items_found,
        items_published=items_published,
        duplicates_skipped=duplicates_skipped,
        sources_checked=sources_checked,
        error_message=None,
        summary=summary,
    )


def main():
    try:
        run()
    except Exception as exc:
        # Still record that the scraper executed (and failed) so the admin
        # dashboard can surface an error state instead of looking merely idle.
        print(f"\n❌ Scraper run failed: {exc}")
        try:
            db = get_db()
            _write_heartbeat(
                db,
                status="error",
                items_found=0,
                items_published=0,
                duplicates_skipped=0,
                sources_checked=[],
                error_message=str(exc),
                summary=f"Run failed: {exc}",
            )
        except Exception as heartbeat_exc:  # pragma: no cover
            print(f"  ⚠ Also failed to write error heartbeat: {heartbeat_exc}")
        raise


if __name__ == "__main__":
    main()
