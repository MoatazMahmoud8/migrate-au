"""
RSS News scraper — pulls migration-relevant news from Australian media.
Sends notifications for articles that match migration/visa/citizenship keywords.
Uses Firestore to track already-sent article URLs (deduplication).

Only sends articles that are:
  1. Published within the last 72 hours (MAX_AGE_HOURS)
  2. Migration-relevant (MUST_MATCH terms present)
  3. Australian-focused (AUSTRALIA_MARKERS present)
  4. Not excluded by EXCLUDE_TERMS
  5. Score >= 2 from keyword matching
"""

import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

RSS_FEEDS = [
    # Migration-specific blogs — high quality, low noise
    "https://www.visaenvoy.com/feed/",
    "https://pathwaytoaus.com/feed/",
    # Mainstream media — migration sections (filtered by MUST_MATCH)
    "https://www.theguardian.com/australia-news/australian-immigration-and-asylum/rss",
    "https://www.sbs.com.au/news/feed",
]

# Only articles published within this window are considered.
# Prevents old articles re-surfacing from feed pagination.
# Set to 7 days — migration blogs post infrequently; deduplication
# prevents re-sending the same article twice.
MAX_AGE_HOURS = 168

# Articles MUST contain at least one of these to be considered migration-relevant.
# This prevents "visa" matching sports stories or "migration" matching political commentary.
MUST_MATCH = [
    # Visa applications & processing
    "visa application", "visa grant", "visa refusal", "visa cancel", "visa processing",
    "visa fee", "visa charge", "visa change", "visa condition", "visa holder",
    "visa expir", "visa extension", "visa renewal",
    # Specific visa types
    "skilled visa", "student visa", "partner visa", "work visa", "temporary visa",
    "bridging visa", "protection visa", "graduate visa", "employer sponsored",
    "subclass 189", "subclass 190", "subclass 491", "subclass 500", "subclass 482",
    "subclass 186", "subclass 485", "subclass 820", "subclass 801", "subclass 600",
    "subclass 417", "subclass 462", "subclass 407", "subclass 494",
    "189 visa", "190 visa", "491 visa", "482 visa", "500 visa",
    # SkillSelect & points
    "points test", "skillselect", "skill select", "invitation round",
    "expression of interest",
    # Occupations & skills
    "anzsco", "occupation list", "skilled occupation", "mltssl", "stsol",
    "skills assessment", "skill assessment", "core skills",
    # State nominations
    "state nomination", "state sponsorship",
    # Official systems
    "home affairs", "immi.homeaffairs", "immiaccount",
    "migration program", "migration strategy", "migration review",
    "immigration change", "immigration policy", "immigration reform",
    "migration level", "migration cap", "intake",
    # Specific migration concepts
    "permanent residency", "permanent resident", "pr pathway", "pr visa",
    "migration agent", "registered migration", "mara",
    "labour agreement", "dama",
    "english requirement", "ielts requirement", "pte requirement",
    # Citizenship & settlement (for people settling in Australia)
    "australian citizenship", "citizenship test", "citizenship ceremony",
    "citizenship application", "citizenship by conferral", "pledge of commitment",
    "citizenship waiting", "citizenship processing",
    "settled in australia", "settling in australia", "new migrant",
    "medicare enrol", "centrelink", "tax file number",
    # Cost-of-living for migrants
    "visa price", "visa cost increase", "migration cost",
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
    "state nomination", "state sponsorship", "state sponsor",
    "visa nomination", "priority processing",
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


def _is_australian(title: str, desc: str) -> bool:
    """Return True only if the article is clearly about Australia."""
    text = (title + " " + desc).lower()
    # Reject if it contains exclusion terms (word-boundary match to avoid
    # "killed" matching inside "skilled", etc.)
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
        # Ensure timezone-aware comparison
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - pub_date
        return age <= timedelta(hours=MAX_AGE_HOURS)
    except Exception:
        # If we can't parse the date, reject the article
        return False


# ─── Guide/evergreen content detection ────────────────────────────────────────

# These patterns in the TITLE indicate a how-to/guide/advice article,
# NOT a news update. Reject them — users want actual news, not blog content.
GUIDE_TITLE_PATTERNS = [
    # "How to" / instructional
    r"^how to ", r"how to .* in australia", r"step.by.step",
    r"complete guide", r"ultimate guide", r"beginner.?s guide",
    r"your guide to", r"a guide to", r"tips for",
    # "What to do if" / contingency advice
    r"what to do", r"what happens if", r"what you need to know",
    r"next (?:pr )?steps", r"your options", r"explore your",
    # "Missed X? Do Y" pattern — clickbait advice
    r"missed (?:an?|your|the) .* \?", r"didn.t get .* \?",
    r"not invited\?", r"missed .* invite",
    # Generic evergreen / listicle
    r"top \d+ ", r"\d+ ways to", r"\d+ things you",
    r"everything you need to know",
    r"checklist", r"cheat sheet",
    # Study / career guidance (not news)
    r"best (?:courses?|universities|tafe)",
    r"study options", r"pr pathway.? (?:in|for|to)",
    r"how .* can (?:get|apply|migrate)",
    # Success stories (not news)
    r"success story", r"case study", r"client story",
    r"visa granted", r"visa success",
]

# NEWS indicators — at least one must appear to confirm it's actual news.
# Articles from migration-specific blogs (VisaEnvoy, PathwayToAus) MUST
# contain a news indicator to pass; otherwise they're just guides.
NEWS_INDICATORS = [
    # Official actions / changes
    "announced", "announcement", "effective from", "effective date",
    "from 1 july", "from 1 january", "introduced", "abolished",
    "new policy", "policy change", "policy update",
    "updated", "update:", "changes to", "changed",
    "increase", "decreased", "reduced", "raised",
    "new requirement", "removed requirement",
    # Dates / rounds / concrete events
    "invitation round", "round result", "round issued",
    "processing time", "processing update",
    "quota", "allocation", "cap reached",
    "fee increase", "new fee", "fee change",
    "threshold", "income requirement",
    # Government / departmental
    "minister", "department", "legislation",
    "regulation", "gazette", "budget",
    "migration program", "planning level",
    # System events
    "system outage", "maintenance", "downtime",
    "immiaccount", "online system",
]

# Feeds known to publish mostly blog/guide content (need NEWS_INDICATORS)
BLOG_FEEDS = [
    "pathwaytoaus.com",
    "visaenvoy.com",
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


def _is_migration_relevant(title: str, desc: str) -> bool:
    """Return True only if article is specifically about migration/visa topics."""
    text = (title + " " + desc).lower()
    return any(term in text for term in MUST_MATCH)


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

    # Fetch all RSS feeds
    for url in RSS_FEEDS:
        try:
            r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            root = ET.fromstring(r.content)
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                desc = re.sub(r"<[^>]+>", "", item.findtext("description") or "").strip()[:400]
                link = (item.findtext("link") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()

                # Skip articles older than MAX_AGE_HOURS
                if not _is_recent(pub_date):
                    continue

                score = _relevance_score(title, desc)
                if title and link and score >= 2 and _is_migration_relevant(title, desc) and _is_australian(title, desc):
                    # Reject guide/evergreen blog content
                    if _is_guide_content(title):
                        print(f"  [news_rss] ❌ GUIDE rejected: {title[:80]}")
                        continue
                    # Blog feeds must contain a news indicator
                    is_blog_feed = any(bf in url for bf in BLOG_FEEDS)
                    if is_blog_feed and not _has_news_indicator(title, desc):
                        print(f"  [news_rss] ❌ NO NEWS indicator (blog feed): {title[:80]}")
                        continue
                    candidates.append({
                        "title": title,
                        "desc": desc,
                        "link": link,
                        "score": score,
                        "pub_date": pub_date,
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
        # Avoid cutting mid-word
        if article["desc"] and len(article["desc"]) > 150:
            last_space = body.rfind(" ")
            if last_space > 100:
                body = body[:last_space] + "…"

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
