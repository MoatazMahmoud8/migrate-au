"""
RSS News scraper — pulls migration-relevant news from Australian media.
Sends notifications for articles that match migration/visa/cost-of-living keywords.
Uses Firestore to track already-sent article URLs (deduplication).
"""

import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

RSS_FEEDS = [
    "https://www.abc.net.au/news/feed/51120/rss.xml",
    "https://www.theguardian.com/australia-news/rss",
    "https://www.theguardian.com/australia-news/australian-immigration-and-asylum/rss",
    "https://www.smh.com.au/rss/feed.xml",
    "https://www.sbs.com.au/news/topic/immigration/feed",
    "https://www.sbs.com.au/news/topic/visa/feed",
]

KEYWORDS_HIGH = [
    # Visa types & applications
    "visa", "visa application", "visa grant", "visa refusal", "visa cancel",
    "visa condition", "visa change", "visa fee", "visa charge", "visa processing",
    "skilled visa", "partner visa", "student visa", "work visa", "temporary visa",
    "bridging visa", "tourist visa", "visitor visa", "protection visa",
    "subclass 189", "subclass 190", "subclass 491", "subclass 500", "subclass 482",
    "subclass 186", "subclass 485", "subclass 820", "subclass 801",
    "189 visa", "190 visa", "491 visa", "482 visa", "500 visa",
    # Migration & how to migrate
    "migration", "migrate to australia", "immigration", "permanent resident",
    "citizenship", "how to apply", "application process",
    "points test", "skillselect", "skill select", "invitation round",
    "expression of interest", "eoi",
    # ANZSCO & occupations
    "anzsco", "occupation list", "skilled occupation", "mltssl", "stsol",
    # State nominations
    "state nomination", "state sponsorship", "sponsor",
    "nomination", "priority processing",
    # Conditions & changes
    "condition 8105", "condition 8501", "condition 8202",
    "work rights", "work limitation", "visa condition change",
    # Home Affairs & official
    "home affairs", "immi.homeaffairs", "immiaccount",
    "planned maintenance", "system maintenance", "system outage", "downtime",
    "skills assessment", "migration agent",
]

KEYWORDS_MED = [
    "ielts", "pte", "english test", "naati",
    "onshore", "offshore", "migration program", "migration review",
    "migration zone", "biometric", "health examination",
    "police clearance", "character requirement",
    "genuine temporary entrant", "gte",
    "labour agreement", "dama", "regional",
]

MAX_NOTIFICATIONS_PER_RUN = 3


AUSTRALIA_MARKERS = [
    "australia", "australian", "nsw", "victoria", "queensland", "melbourne",
    "sydney", "brisbane", "perth", "adelaide", "hobart", "canberra", "darwin",
    "home affairs", "immi.homeaffairs", "immiaccount", "skillselect",
    "services australia", "fair work", "anzsco",
    "subclass", "189", "190", "491", "482", "500", "485",
    "albanese", "dutton", "migration program",
    "state nomination", "tafe", "naati",
]

EXCLUDE_TERMS = [
    "trump", "biden", "white house", "congress", "senate vote",
    "supreme court", "capitol", "republican", "democrat",
    "uk parliament", "westminster", "downing street", "brexit",
]


def _is_australian(title: str, desc: str) -> bool:
    """Return True only if the article is clearly about Australia."""
    text = (title + " " + desc).lower()
    # Reject if it contains US/UK political terms
    if any(term in text for term in EXCLUDE_TERMS):
        return False
    # Accept if it mentions Australian markers
    if any(marker in text for marker in AUSTRALIA_MARKERS):
        return True
    return False


def _relevance_score(title: str, desc: str) -> int:
    text = (title + " " + desc).lower()
    score = 0
    for kw in KEYWORDS_HIGH:
        if kw in text:
            score += 2
    for kw in KEYWORDS_MED:
        if kw in text:
            score += 1
    return score


def _categorize(title: str, desc: str) -> str:
    text = (title + " " + desc).lower()
    if any(kw in text for kw in ["points test", "skillselect", "skill select", "invitation round", "eoi"]):
        return "SkillSelect"
    if any(kw in text for kw in ["anzsco", "occupation list", "skilled occupation", "mltssl", "stsol"]):
        return "Occupation Lists"
    if any(kw in text for kw in ["state nomination", "state sponsorship", "nomination"]):
        return "State Nomination"
    if any(kw in text for kw in ["visa fee", "visa charge"]):
        return "Visa Fees"
    if any(kw in text for kw in ["maintenance", "outage", "downtime"]):
        return "System Update"
    if any(kw in text for kw in ["condition", "work rights", "visa change", "visa condition"]):
        return "Visa Conditions"
    if any(kw in text for kw in ["citizenship"]):
        return "Citizenship"
    if any(kw in text for kw in ["how to apply", "application process", "visa application"]):
        return "How to Apply"
    if any(kw in text for kw in ["visa", "migration", "immigration", "migrant"]):
        return "Visa & Migration"
    return "News"


def scrape(db) -> list[dict]:
    """Returns list of notification payloads for new relevant news articles."""
    notifications = []
    candidates = []

    # Fetch all RSS feeds
    for url in RSS_FEEDS:
        try:
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            root = ET.fromstring(r.content)
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                desc = re.sub(r"<[^>]+>", "", item.findtext("description") or "").strip()[:400]
                link = (item.findtext("link") or "").strip()
                score = _relevance_score(title, desc)
                if title and link and score > 0 and _is_australian(title, desc):
                    candidates.append({
                        "title": title,
                        "desc": desc,
                        "link": link,
                        "score": score,
                    })
        except Exception as e:
            print(f"  [news_rss] ⚠️  RSS error ({url}): {e}")

    if not candidates:
        return []

    # Sort by relevance, dedup by title prefix
    candidates.sort(key=lambda x: x["score"], reverse=True)
    seen_titles = set()
    unique = []
    for c in candidates:
        key = c["title"][:50].lower()
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(c)

    # Check Firestore for already-sent URLs
    sent_ref = db.collection("_scraper_meta").document("news_rss_sent")
    sent_doc = sent_ref.get()
    sent_urls = set(sent_doc.to_dict().get("urls", [])) if sent_doc.exists else set()

    new_articles = [a for a in unique if a["link"] not in sent_urls]

    # Take top N new articles
    for article in new_articles[:MAX_NOTIFICATIONS_PER_RUN]:
        category = _categorize(article["title"], article["desc"])
        body = article["desc"][:150] if article["desc"] else article["title"]

        notifications.append({
            "source_id": "news_rss",
            "topic": "au_migration",
            "category": category,
            "title": article["title"][:100],
            "body": body,
            "url": article["link"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # Update sent URLs (keep last 200 to avoid unbounded growth)
    if notifications:
        new_sent = list(sent_urls | {a["link"] for a in new_articles[:MAX_NOTIFICATIONS_PER_RUN]})
        # Keep only the most recent 200 URLs
        sent_ref.set({"urls": new_sent[-200:], "last_updated": datetime.now(timezone.utc).isoformat()})

    return notifications
