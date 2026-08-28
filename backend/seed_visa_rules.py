#!/usr/bin/env python3
"""
Seed Firestore collections with visa rules data.

Collections created:
  - visa_fees/{subclass}
  - visa_processing_times/{subclass}
  - state_nomination_status/{stateCode}
  - rules_version/current

Usage:
  python seed_visa_rules.py
  
This script reads from the bundled constants and creates Firestore documents.
After seeding, the React Native app can fetch these dynamically.
"""

import os
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import firebase_admin
from firebase_admin import credentials, firestore

# ─── Initialize Firebase ──────────────────────────────────────────────────────
cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '../firebase-key.json')
if not os.path.exists(cred_path):
    # Try repo path
    cred_path = '/home/moataz/work/migration-app/repo/firebase-service-account.json'

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─── Visa Fees (from constants/visaFees.ts) ───────────────────────────────────
VISA_FEES = [
    {"subclass": "189", "fee": "AUD $6,140", "feeNote": "Family: +$3,070 per adult · +$1,535 per child"},
    {"subclass": "190", "fee": "AUD $6,140", "feeNote": "Family: +$3,070 per adult · +$1,535 per child"},
    {"subclass": "191", "fee": "AUD $4,640", "feeNote": "Family: +$2,320 per adult · +$1,160 per child"},
    {"subclass": "491", "fee": "AUD $6,140", "feeNote": "Family: +$3,070 per adult · +$1,535 per child"},
    {"subclass": "186", "fee": "AUD $6,140", "feeNote": "Family: +$3,070 per adult · +$1,535 per child"},
    {"subclass": "482", "fee": "AUD $4,015", "feeNote": "Check the pricing estimator for dependant charges"},
    {"subclass": "494", "fee": "AUD $6,140", "feeNote": "Check the pricing estimator for dependant charges"},
    {"subclass": "485", "fee": "AUD $1,730", "feeNote": "Family: +$575 per adult · +$290 per child"},
    {"subclass": "500", "fee": "AUD $2,500", "feeNote": "Concessions apply in limited circumstances"},
    {"subclass": "820", "fee": "AUD $9,095", "feeNote": "+ AUD $4,550 second instalment when 801 is granted"},
    {"subclass": "309", "fee": "AUD $9,095", "feeNote": "+ AUD $4,550 second instalment when 100 is granted"},
    {"subclass": "143", "fee": "AUD $48,985", "feeNote": "Paid in two instalments (~$29,945 + ~$19,040)"},
    {"subclass": "600", "fee": "AUD $190", "feeNote": "Tourist stream (offshore). Onshore extension: AUD $365"},
    {"subclass": "417", "fee": "AUD $635"},
    {"subclass": "462", "fee": "AUD $635"},
]

# ─── Processing Times (from constants/processingTimes.ts) ─────────────────────
PROCESSING_TIMES = [
    {
        "subclass": "189",
        "name": "Skilled Independent",
        "category": "Skilled",
        "streams": [
            {"name": "Points-tested stream", "p50": "9 months", "p90": "17 months"},
            {"name": "New Zealand stream", "p50": "4 months", "p90": "8 months"},
        ],
        "conditions": [
            "No employer sponsorship required",
            "Occupation on MLTSSL",
            "Points score ≥ 65 (SkillSelect invitation)",
            "Age under 45 at time of invitation",
            "Positive skills assessment required",
        ],
        "icon": "globe-outline",
        "color": "#00C2FF",
    },
    {
        "subclass": "190",
        "name": "Skilled Nominated",
        "category": "Skilled",
        "streams": [
            {"name": "State/Territory Nominated", "p50": "5 months", "p90": "11 months"},
        ],
        "conditions": [
            "Nomination by an Australian state or territory",
            "Occupation on MLTSSL or STSOL (state-specific)",
            "Points score ≥ 65 (+ 5 nomination bonus)",
            "Age under 45",
            "Positive skills assessment required",
        ],
        "icon": "location-outline",
        "color": "#00C2FF",
    },
    {
        "subclass": "491",
        "name": "Skilled Work Regional (Provisional)",
        "category": "Skilled",
        "streams": [
            {"name": "State/Territory Nominated", "p50": "7 months", "p90": "15 months"},
            {"name": "Family Sponsored", "p50": "9 months", "p90": "18 months"},
        ],
        "conditions": [
            "Nomination by state/territory or sponsorship by eligible family member",
            "Must live and work in a designated regional area",
            "Points score ≥ 65 (+ 15 regional bonus)",
            "Age under 45",
            "Pathway to 191 permanent visa after 3 years",
        ],
        "icon": "map-outline",
        "color": "#00C2FF",
    },
    {
        "subclass": "482",
        "name": "Skills in Demand",
        "category": "Employer",
        "streams": [
            {"name": "Specialist Skills stream", "p50": "8 days", "p90": "36 days"},
            {"name": "Core Skills stream", "p50": "34 days", "p90": "4 months"},
            {"name": "Labour Agreement stream", "p50": "3 months", "p90": "6 months"},
        ],
        "conditions": [
            "Approved sponsor (standard business sponsor)",
            "Occupation must be on the relevant occupation list",
            "Genuine position that exists with the nominating business",
            "Market salary rate must be met",
        ],
        "icon": "briefcase-outline",
        "color": "#FFCD00",
    },
    {
        "subclass": "485",
        "name": "Temporary Graduate",
        "category": "Graduate",
        "streams": [
            {"name": "Post-Higher Education Work stream", "p50": "4 months", "p90": "8 months"},
            {"name": "Post-Vocational Education Work stream", "p50": "3 months", "p90": "6 months"},
        ],
        "conditions": [
            "Completed a degree from an Australian institution",
            "Must apply within 6 months of completing studies",
            "English: IELTS 6.0 (all bands) or equivalent",
        ],
        "icon": "ribbon-outline",
        "color": "#A78BFA",
    },
]

# ─── State Nomination Status ──────────────────────────────────────────────────
STATE_STATUS = [
    {"state": "NSW", "status": "open", "statusNote": "Accepting applications"},
    {"state": "VIC", "status": "open", "statusNote": "Accepting applications"},
    {"state": "QLD", "status": "open", "statusNote": "Accepting applications"},
    {"state": "WA", "status": "open", "statusNote": "Accepting applications"},
    {"state": "SA", "status": "open", "statusNote": "Accepting applications"},
    {"state": "TAS", "status": "open", "statusNote": "Accepting applications"},
    {"state": "ACT", "status": "limited", "statusNote": "Limited occupations only"},
    {"state": "NT", "status": "open", "statusNote": "Accepting applications"},
]


def seed_collection(collection_name: str, items: list, id_field: str):
    """Seed a Firestore collection with items."""
    print(f"\n📦 Seeding {collection_name}...")
    ref = db.collection(collection_name)
    
    for item in items:
        doc_id = item[id_field]
        data = {**item, "updatedAt": datetime.now(timezone.utc).isoformat()}
        ref.document(doc_id).set(data)
        print(f"  ✅ {doc_id}")
    
    print(f"  Total: {len(items)} documents")


def seed_rules_version():
    """Create or update the rules_version document."""
    print("\n📦 Setting rules_version...")
    ref = db.collection("rules_version").document("current")
    
    # Check current version
    doc = ref.get()
    current_version = doc.to_dict().get("version", 0) if doc.exists else 0
    new_version = current_version + 1
    
    ref.set({
        "version": new_version,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })
    print(f"  ✅ Version: {new_version}")


def main():
    print("=" * 60)
    print("🚀 SEEDING FIRESTORE VISA RULES")
    print("=" * 60)
    
    seed_collection("visa_fees", VISA_FEES, "subclass")
    seed_collection("visa_processing_times", PROCESSING_TIMES, "subclass")
    seed_collection("state_nomination_status", STATE_STATUS, "state")
    seed_rules_version()
    
    print("\n" + "=" * 60)
    print("✅ SEEDING COMPLETE")
    print("=" * 60)
    print("\nFirestore collections ready:")
    print("  - visa_fees")
    print("  - visa_processing_times")
    print("  - state_nomination_status")
    print("  - rules_version")


if __name__ == "__main__":
    main()
