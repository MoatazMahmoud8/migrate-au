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
    "https://www.abc.net.au/news/topic/immigration/rss.xml",
    "https://www.abc.net.au/news/topic/housing/rss.xml",
    "https://www.theguardian.com/australia-news/rss",
    "https://www.smh.com.au/rss/feed.xml",
    "https://www.skynews.com.au/feed",
]

KEYWORDS_HIGH = [
    "visa", "migration", "migrant", "immigration", "skilled visa", "partner visa",
    "citizenship", "permanent resident", "temporary visa", "student visa",
    "work visa", "asylum", "refugee", "deportat", "border",
    "rent", "rental", "cost of living", "inflation", "interest rate", "rba",
    "reserve bank", "cash rate", "mortgage",
    "minimum wage", "unemployment", "fair work",
    "housing crisis", "first home", "affordable housing",
]

KEYWORDS_MED = [
    "centrelink", "welfare", "services australia",
    "university", "tuition", "scholarship", "hecs",
    "medicare", "budget", "election", "parliament",
    "tax", "ato", "superannuation",
]

MAX_NOTIFICATIONS_PER_RUN = 3


AUSTRALIA_MARKERS = [
    "australia", "australian", "nsw", "victoria", "queensland", "melbourne",
    "sydney", "brisbane", "perth", "adelaide", "hobart", "canberra", "darwin",
    "home affairs", "centrelink", "medicare", "ato", "rba", "reserve bank",
    "fair work", "hecs", "tafe", "albanese", "dutton", "treasurer",
    "parliament house", "services australia",
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
    if any(kw in text for kw in ["visa", "migration", "immigration", "migrant", "citizenship", "refugee", "border", "deportat"]):
        return "Policy Update"
    if any(kw in text for kw in ["rent", "housing", "first home", "property", "affordable housing"]):
        return "Housing"
    if any(kw in text for kw in ["interest rate", "rba", "cash rate", "inflation", "cost of living"]):
        return "Economy"
    if any(kw in text for kw in ["wage", "unemployment", "fair work", "job"]):
        return "Employment"
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
