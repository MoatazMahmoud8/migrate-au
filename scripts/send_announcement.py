#!/usr/bin/env python3
"""
Admin announcement script — sends a notification to all subscribers of a topic
AND persists it to the in-app Updates feed (Firestore `notifications` collection).

This is the same code path used by the automated scrapers (see backend/notify.py),
so the announcement behaves identically to a real change notification.

USAGE:
    python scripts/send_announcement.py \
        --topic au_migration \
        --title "🇦🇺 Big news" \
        --body "Important update for migrants" \
        --url "https://immi.homeaffairs.gov.au/" \
        --category "Policy Update"

Optional:
    --state NSW        (only required for state-specific topics; auto-detected if topic starts with state_)
    --source-id ADMIN  (free-form ID; defaults to admin_<timestamp>)
    --service-account /path/to/key.json
                       (defaults to $FIREBASE_SERVICE_ACCOUNT_JSON env var
                        or ~/.firebase-service-account.json)
    --dry-run          (print what would be sent without contacting Firebase)

VALID TOPICS:
    Globals : au_migration, skillselect, anzsco, processing_times
    States  : state_NSW, state_VIC, state_QLD, state_WA, state_SA,
              state_TAS, state_ACT, state_NT
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow `from backend.notify import ...` when run from project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import firebase_admin
from firebase_admin import credentials, firestore

from backend.notify import send_topic_notification, TOPIC_CHANNELS


def load_service_account(explicit_path: str | None) -> credentials.Certificate:
    """Resolve service-account credentials from arg / env / default location."""
    # 1. Explicit --service-account flag
    if explicit_path:
        return credentials.Certificate(explicit_path)

    # 2. Inline JSON in env var (mirrors GitHub Actions setup)
    env_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT"
    )
    if env_json and env_json.strip().startswith("{"):
        return credentials.Certificate(json.loads(env_json))

    # 3. Path in env var
    if env_json and os.path.isfile(env_json):
        return credentials.Certificate(env_json)

    # 4. Default location
    default = os.path.expanduser("~/.firebase-service-account.json")
    if os.path.isfile(default):
        return credentials.Certificate(default)

    sys.exit(
        "❌ Could not find service-account credentials. "
        "Pass --service-account, set FIREBASE_SERVICE_ACCOUNT_JSON, "
        "or place a key at ~/.firebase-service-account.json"
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send a manual announcement (FCM push + Updates-feed entry).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--topic", required=True, help="FCM topic (e.g. au_migration, state_NSW)")
    parser.add_argument("--title", required=True, help="Notification title")
    parser.add_argument("--body", required=True, help="Notification body")
    parser.add_argument("--url", default="", help="Tap-through URL (optional)")
    parser.add_argument(
        "--category",
        default="Policy Update",
        help="Category label shown in the app feed (default: Policy Update)",
    )
    parser.add_argument("--state", default=None, help="State code (auto-detected from topic if state_*)")
    parser.add_argument("--source-id", default=None, help="Unique source id (default: admin_<timestamp>)")
    parser.add_argument("--service-account", default=None, help="Path to Firebase service-account JSON")
    parser.add_argument("--dry-run", action="store_true", help="Show payload without sending")
    args = parser.parse_args()

    # Validate topic
    if args.topic not in TOPIC_CHANNELS:
        valid = ", ".join(sorted(TOPIC_CHANNELS.keys()))
        sys.exit(f"❌ Unknown topic '{args.topic}'. Valid topics:\n   {valid}")

    # Auto-detect state from topic if not provided
    state = args.state
    if state is None and args.topic.startswith("state_"):
        state = args.topic.split("_", 1)[1]

    # Build source_id (used by scrapers to dedupe; here just a timestamped id)
    source_id = args.source_id or f"admin_{int(datetime.now(timezone.utc).timestamp())}"

    notification = {
        "source_id": source_id,
        "topic": args.topic,
        "category": args.category,
        "title": args.title,
        "body": args.body,
        "url": args.url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if state:
        notification["state"] = state

    print("─" * 60)
    print("📣  Announcement payload")
    print("─" * 60)
    for k, v in notification.items():
        print(f"  {k:>12}: {v}")
    print("─" * 60)

    if args.dry_run:
        print("🔸 Dry-run mode — not sending.")
        return 0

    # Init Firebase
    cred = load_service_account(args.service_account)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Send (uses the same code path as the scraper)
    ok = send_topic_notification(db, notification)
    if not ok:
        print("❌ Send failed. See error above.")
        return 1

    print("✅ Announcement delivered (FCM push sent + feed entry written).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
