"""
RSS News scraper — pulls migration-relevant news from Australian media.
Sends notifications for articles that match migration/visa/citizenship keywords.
Uses Firestore to track already-sent article URLs (deduplication).

Only sends articles that are:
  1. Published within the last 48 hours (MAX_AGE_HOURS)
  2. HIGH-INTENT migration-relevant (HIGH_INTENT_KEYWORDS present)
  3. Australian-focused (AUSTRALIA_MARKERS present)
  4. Not excluded by EXCLUDE_TERMS
  5. Score >= 2 from keyword matching
  6. Hash-deduplicated by title + URL
"""

import hashlib
import re
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from scrapers.article_enricher import enrich as enrich_article

RSS_FEEDS = [
    # Migration-specific blogs — high quality, low noise
    "https://www.visaenvoy.com/feed/",
    "https://pathwaytoaus.com/feed/",
    "https://www.seekvisa.com.au/feed/",  # Active AU migration law firm blog
    "https://www.iscah.com/feed/",  # Iscah migration newsletter
    "https://smartvisaguide.com/feed/",  # Smart Visa Guide
    "https://www.australiavisa.com/feed/",  # Migration law updates
    # Mainstream media — migration sections (filtered by HIGH_INTENT_KEYWORDS)
    "https://www.theguardian.com/australia-news/australian-immigration-and-asylum/rss",
    "https://www.sbs.com.au/news/feed",
    # Broad news — covers political statements on migration policy
    "https://www.abc.net.au/news/feed/51120/rss.xml",
]

# Only articles published within this window are considered.
MAX_AGE_HOURS = 48

# ─── HIGH-INTENT KEYWORDS ────────────────────────────────────────────────────
# Articles MUST contain at least one of these to be queued.
# These are specific, actionable migration terms — not general political commentary.
HIGH_INTENT_KEYWORDS = [
    # SkillSelect & invitation rounds (primary interest)
    "skillselect", "skill select", "invitation round", "eoi round",
    "expression of interest", "points threshold", "cutoff score",
    # Specific visa subclasses
    "subclass 189", "subclass 190", "subclass 491", "subclass 485",
    "subclass 482", "subclass 186", "subclass 494", "subclass 500",
    "189 visa", "190 visa", "491 visa", "482 visa",
    # State nominations
    "state nomination", "state sponsored", "nomination allocation",
    "nomination quota", "nomination open", "nomination closed",
    # Skills assessment
    "skills assessment", "skill assessment", "anzsco",
    "occupation list", "mltssl", "stsol", "rol",
    # GSM program
    "general skilled migration", "gsm program", "gsm intake",
    "skilled migration program", "migration program planning",
    # Processing & official changes
    "processing time", "visa processing", "visa grant",
    "visa fee increase", "visa fee change",
    "home affairs announce", "department announce",
    "migration review", "migration strategy",
    # Points test changes
    "points test change", "points requirement", "points update",
    # Humanitarian & refugee (policy changes affect many migrants)
    "refugee visa", "refugee intake", "refugee program",
    "humanitarian visa", "humanitarian intake", "humanitarian program",
    "protection visa", "asylum seeker", "refugee quota",
    # Migration intake & caps
    "migration intake", "immigration intake", "visa cap",
    "migration cap", "permanent migration", "migration level",
    "net migration", "migration cut", "migration slash",
]

# Secondary keywords for scoring (but not required)
KEYWORDS_HIGH = [
    "visa", "visa application", "visa grant", "visa refusal", "visa cancel",
    "visa condition", "visa change", "visa fee", "visa charge", "visa processing",
    "skilled visa", "partner visa", "student visa", "work visa", "temporary visa",
    "bridging visa", "tourist visa", "visitor visa", "protection visa",
    "subclass 189", "subclass 190", "subclass 491", "subclass 500", "subclass 482",
    "subclass 186", "subclass 485", "subclass 820", "subclass 801",
    "migration", "migrate to australia", "immigration", "permanent resident",
    "citizenship", "points test", "skillselect", "skill select", "invitation round",
    "expression of interest", "eoi",
    "anzsco", "occupation list", "skilled occupation", "mltssl", "stsol",
    "state nomination", "state sponsorship", "state sponsor",
    "home affairs", "immi.homeaffairs", "immiaccount",
    "skills assessment", "migration agent",
    # Humanitarian & refugee
    "refugee", "refugee intake", "humanitarian", "asylum", "protection visa",
    "migration intake", "migration cap", "migration cut", "migration level",
]

KEYWORDS_MED = [
    "ielts", "pte", "english test", "naati",
    "onshore", "offshore", "migration program", "migration review",
    "migration zone", "biometric", "health examination",
    "police clearance", "character requirement",
    "genuine temporary entrant", "gte",
    "labour agreement", "dama", "regional",
]

MAX_NOTIFICATIONS_PER_RUN = 10


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
    # US politics
    "trump", "biden", "white house", "congress", "senate vote",
    "supreme court", "capitol", "republican", "democrat",
    "desantis", "ron desantis", "kamala", "oval office",
    # UK politics
    "uk parliament", "westminster", "downing street", "brexit",
    # European / international (non-AU)
    "european union", "eu migration", "schengen",
    # Australian domestic politics (not migration)
    "icac", "corruption", "branch-stacking", "branch stacking",
    "election result", "polling", "ballot", "preselection",
    "senator", "councillor", "council election",
    "liberal party", "labor party", "greens party", "one nation",
    "property developer", "political donation", "fundrais",
    "royal commission", "inquest",
    # Crime & tragedy
    "murder", "assault", "killed", "convicted", "prison",
    "detention centre", "dies in", "death in", "stabbed", "shot",
    "domestic violence", "manslaughter", "abduct",
    "blunt-force", "blunt force", "autopsy", "inquest",
    # Sports
    "cricket", "football", "rugby", "nrl", "afl", "nbl",
    "basketball", "mvp", "boomers", "player", "coach", "game",
    "olympic", "medal", "tournament", "grand final",
    "matildas", "socceroos", "wallabies",
    # Entertainment & lifestyle
    "eminem", "rapper", "trademark battle", "celebrity",
    "reality tv", "masterchef", "big brother",
    "movie", "box office", "netflix", "streaming",
    # Transport & weather
    "train disruption", "v/line", "bus route", "flight delay",
    "bushfire", "flood warning", "weather", "cyclone",
    "traffic accident", "road closure",
    # General non-migration
    "water catchment", "climate change", "real estate",
    "stock market", "asx", "interest rate",
    "housing market", "auction clearance",
    # Animal / wildlife
    "animal", "wildlife", "koala", "kangaroo", "shark attack",
    "whale", "bird flu",
]


def _hash_article(title: str, url: str) -> str:
    """Generate a unique hash for deduplication based on normalized title + URL."""
    normalized = (title.strip().lower() + "|" + url.strip().lower()).encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()[:24]


def _is_australian(title: str, desc: str) -> bool:
    """Return True only if the article is clearly about Australia."""
    text = (title + " " + desc).lower()
    # Reject if it contains exclusion terms
    for term in EXCLUDE_TERMS:
        pattern = r'(?<!\w)' + re.escape(term) + r'(?!\w)'
        if re.search(pattern, text):
            return False
    # Accept if it mentions Australian markers
    if any(marker in text for marker in AUSTRALIA_MARKERS):
        return True
    return False


def _is_recent(pub_date_str: str) -> bool:
    """Return True if the article was published within MAX_AGE_HOURS."""
    if not pub_date_str:
        return False
    try:
        pub_date = parsedate_to_datetime(pub_date_str)
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - pub_date
        return age <= timedelta(hours=MAX_AGE_HOURS)
    except Exception:
        return False


# ─── Guide/evergreen content detection ────────────────────────────────────────

GUIDE_TITLE_PATTERNS = [
    r"^how to ", r"how to .* in australia", r"step.by.step",
    r"\bvs\b.*visa", r"vs\s+\d{3}\s+visa",
    r"complete guide", r"ultimate guide", r"beginner.?s guide",
    r"your guide to", r"a guide to", r"tips for",
    r"what to do", r"what happens if", r"what you need to know",
    r"next (?:pr )?steps", r"your options", r"explore your",
    r"missed (?:an?|your|the) .* \?", r"didn.t get .* \?",
    r"not invited\?", r"missed .* invite",
    r"top \d+ ", r"\d+ ways to", r"\d+ things you",
    r"everything you need to know",
    r"checklist", r"cheat sheet",
    r"best (?:courses?|universities|tafe)",
    r"study options", r"pr pathway.? (?:in|for|to)",
    r"how .* can (?:get|apply|migrate)",
    r"success story", r"case study", r"client story",
    r"visa granted", r"visa success",
]

NEWS_INDICATORS = [
    "announced", "announcement", "effective from", "effective date",
    "from 1 july", "from 1 january", "introduced", "abolished",
    "new policy", "policy change", "policy update",
    "updated", "update:", "changes to", "changed",
    "increase", "decreased", "reduced", "raised",
    "new requirement", "removed requirement",
    "invitation round", "round result", "round issued",
    "processing time", "processing update",
    "quota", "allocation", "cap reached",
    "fee increase", "new fee", "fee change",
    "threshold", "income requirement",
    "minister", "department", "legislation",
    "regulation", "gazette", "budget",
    "migration program", "planning level",
    "system outage", "maintenance", "downtime",
    "immiaccount", "online system",
]

BLOG_FEEDS = [
    "pathwaytoaus.com",
    "visaenvoy.com",
    "smartvisaguide.com",
    "australiavisa.com",
    "seekvisa.com.au",
    "iscah.com",
]


def _is_guide_content(title: str) -> bool:
    """Return True if the title matches a guide/advice pattern (not news)."""
    t = title.lower()
    for pattern in GUIDE_TITLE_PATTERNS:
        if re.search(pattern, t):
            return True
    return False


def _has_news_indicator(title: str, desc: str) -> bool:
    """Return True if the article contains markers of actual news/updates."""
    text = (title + " " + desc).lower()
    return any(ind in text for ind in NEWS_INDICATORS)


def _has_high_intent_keyword(title: str, desc: str) -> bool:
    """Return True only if article contains HIGH-INTENT migration keywords."""
    text = (title + " " + desc).lower()
    return any(kw in text for kw in HIGH_INTENT_KEYWORDS)


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
    if any(kw in text for kw in ["state nomination", "state sponsorship", "visa nomination"]):
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

    for url in RSS_FEEDS:
        try:
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            root = ET.fromstring(r.content)
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                raw_desc = item.findtext("description") or ""
                desc = BeautifulSoup(raw_desc, "html.parser").get_text(" ", strip=True)[:900]
                link = (item.findtext("link") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()

                # Skip articles older than MAX_AGE_HOURS
                if not _is_recent(pub_date):
                    continue

                # STRICT FILTER: Must have HIGH-INTENT keyword
                if not _has_high_intent_keyword(title, desc):
                    print(f"  [news_rss] ❌ LOW-INTENT rejected: {title[:60]}...")
                    continue

                score = _relevance_score(title, desc)
                if title and link and score >= 2 and _is_australian(title, desc):
                    # Reject guide/evergreen blog content
                    if _is_guide_content(title):
                        print(f"  [news_rss] ❌ GUIDE rejected: {title[:60]}...")
                        continue
                    # Blog feeds must contain a news indicator
                    is_blog_feed = any(bf in url for bf in BLOG_FEEDS)
                    if is_blog_feed and not _has_news_indicator(title, desc):
                        t_lower = title.lower()
                        has_strong_signal = (
                            bool(re.search(r'sc\s*\d{3}|subclass\s*\d{3}|202[5-9]|203\d', t_lower))
                            and ' vs ' not in t_lower
                            and 'courses' not in t_lower
                            and 'how to' not in t_lower
                        )
                        if not has_strong_signal:
                            print(f"  [news_rss] ❌ NO NEWS indicator (blog): {title[:60]}...")
                            continue
                    
                    article_hash = _hash_article(title, link)
                    candidates.append({
                        "title": title,
                        "desc": desc,
                        "link": link,
                        "score": score,
                        "pub_date": pub_date,
                        "hash": article_hash,
                    })
                    print(f"  [news_rss] ✅ ACCEPTED: {title[:60]}...")
        except Exception as e:
            print(f"  [news_rss] ⚠️ RSS error ({url}): {e}")

    if not candidates:
        return []

    # Sort by relevance, dedup by hash
    candidates.sort(key=lambda x: x["score"], reverse=True)
    seen_hashes = set()
    unique = []
    for c in candidates:
        if c["hash"] not in seen_hashes:
            seen_hashes.add(c["hash"])
            unique.append(c)

    # Check Firestore for already-sent hashes
    sent_ref = db.collection("_scraper_meta").document("news_rss_sent")
    sent_doc = sent_ref.get()
    sent_data = sent_doc.to_dict() if sent_doc.exists else {}
    has_baseline = sent_doc.exists and ("urls" in sent_data or "hashes" in sent_data)
    sent_hashes = set(sent_data.get("hashes", []))
    sent_urls = set(sent_data.get("urls", []))  # Backward compat

    if not has_baseline:
        # First run: snapshot all current articles
        sent_ref.set({
            "hashes": [a["hash"] for a in unique[:200]],
            "urls": [a["link"] for a in unique[:200]],
            "last_updated": datetime.now(timezone.utc).isoformat(),
        })
        print("  [news_rss] 📌 baseline stored — skipping current feed")
        return []

    # Filter out already-sent articles (by hash or URL for backward compat)
    new_articles = [a for a in unique if a["hash"] not in sent_hashes and a["link"] not in sent_urls]

    for article in new_articles[:MAX_NOTIFICATIONS_PER_RUN]:
        category = _categorize(article["title"], article["desc"])
        body = enrich_article(article["title"], article["desc"], article["link"])

        notifications.append({
            "source_id": "news_rss",
            "topic": "au_migration",
            "category": category,
            "title": article["title"][:150],
            "body": body,
            "url": article["link"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # Update sent hashes
    if notifications:
        new_hashes = list(sent_hashes | {a["hash"] for a in new_articles[:MAX_NOTIFICATIONS_PER_RUN]})
        new_urls = list(sent_urls | {a["link"] for a in new_articles[:MAX_NOTIFICATIONS_PER_RUN]})
        sent_ref.set({
            "hashes": new_hashes[-200:],
            "urls": new_urls[-200:],
            "last_updated": datetime.now(timezone.utc).isoformat(),
        })

    return notifications
