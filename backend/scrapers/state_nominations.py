"""
State & territory nomination scraper — all 8 states/territories.
Monitors:
  - Nomination quota announcements
  - Open/closed status changes
  - EOI invite thresholds
  - New nomination streams

Features:
  - 30-day date filter for news articles
  - Hash-based deduplication
  - NT official portal via cloudscraper
"""

import hashlib
import os
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta

from scrapers.baseline import store_hash_baseline, store_seen_urls_baseline

try:
    import cloudscraper
    _HAS_CLOUDSCRAPER = True
except ImportError:
    _HAS_CLOUDSCRAPER = False

# Maximum age for news articles (30 days)
MAX_NEWS_AGE_DAYS = 30

# Sites known to block datacenter IPs
_BLOCKED_HOSTS = {"www.act.gov.au", "australiasnorthernterritory.com.au", "theterritory.com.au"}

STATES = [
    {
        "code": "NSW",
        "name": "New South Wales",
        "topic": "state_NSW",
        "url": "https://www.nsw.gov.au/visas-and-migration",
        "link_url": "https://www.nsw.gov.au/visas-and-migration",
        "selector": ".nsw-card__title, h2, h3, .alert",
        "icon": "🔵",
    },
    {
        "code": "VIC",
        "name": "Victoria",
        "topic": "state_VIC",
        "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
        "link_url": "https://liveinmelbourne.vic.gov.au/skilled-migration",
        "selector": "h1, h2, h3, .intro, .alert, p strong, table",
        "icon": "🔵",
    },
    {
        "code": "QLD",
        "name": "Queensland",
        "topic": "state_QLD",
        "url": "https://migration.qld.gov.au/",
        "link_url": "https://migration.qld.gov.au/",
        "news_url": "https://migration.qld.gov.au/news",
        "news_link_selector": "a[href*='/news/']",
        "selector": "h2, h3, article p, .alert, .notice",
        "icon": "🟡",
    },
    {
        "code": "WA",
        "name": "Western Australia",
        "topic": "state_WA",
        "url": "https://migration.wa.gov.au/",
        "link_url": "https://migration.wa.gov.au/",
        "selector": "h2, h3, .field--name-title, .alert",
        "icon": "🟡",
    },
    {
        "code": "SA",
        "name": "South Australia",
        "topic": "state_SA",
        "url": "https://migration.sa.gov.au/",
        "link_url": "https://migration.sa.gov.au/",
        "news_url": "https://migration.sa.gov.au/news",
        "news_link_selector": "a[href*='/news/']",
        "selector": "h2, h3, .views-field-title, .alert, p",
        "icon": "🔴",
    },
    {
        "code": "TAS",
        "name": "Tasmania",
        "topic": "state_TAS",
        "url": "https://www.migration.tas.gov.au/",
        "link_url": "https://www.migration.tas.gov.au/",
        "news_url": "https://www.migration.tas.gov.au/news",
        "news_link_selector": "a[href*='/news/']",
        "selector": "h2, h3, article p, .alert",
        "icon": "🟢",
    },
    {
        "code": "ACT",
        "name": "Australian Capital Territory",
        "topic": "state_ACT",
        "url": "https://www.act.gov.au/migration",
        "link_url": "https://www.act.gov.au/migration",
        "selector": "h2, h3, .content p, .alert, article p",
        "icon": "🟣",
    },
    {
        "code": "NT",
        "name": "Northern Territory",
        "topic": "state_NT",
        "url": "https://theterritory.com.au/migrate/migrate-to-work/northern-territory-government-visa-nomination",
        "link_url": "https://theterritory.com.au/migrate/migrate-to-work/northern-territory-government-visa-nomination",
        "selector": "h1, h2, h3, .article-title, .alert, p, .card-title, .content-block",
        "icon": "🟠",
        "use_cloudscraper": True,  # NT uses Cloudflare
    },
]

# Keywords that indicate archived/irrelevant content to skip
SKIP_KEYWORDS = [
    "season's greetings", "seasons greetings", "holiday period",
    "christmas", "new year wish", "closed for the holiday",
    "merry christmas", "happy holidays",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _hash_article(title: str, url: str) -> str:
    """Generate a unique hash for deduplication based on normalized title + URL."""
    normalized = (title.strip().lower() + "|" + url.strip().lower()).encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()[:24]


def _is_within_date_range(text: str, max_days: int = MAX_NEWS_AGE_DAYS) -> bool:
    """
    Check if any date mentioned in the text is within the allowed range.
    Returns True if no date found (benefit of doubt) or if date is recent.
    """
    # Look for common date patterns
    date_patterns = [
        # "1 January 2026", "15 Feb 2025"
        r'(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})',
        # "January 1, 2026"
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})',
        # "2023-24" program year (treat as old if year < current-1)
        r'(20\d{2})[-–](2\d)\s+program',
    ]
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_days)
    text_lower = text.lower()
    
    # Check for program year patterns (e.g., "2022-23 program")
    program_match = re.search(r'(20\d{2})[-–](2\d)\s+program', text_lower)
    if program_match:
        start_year = int(program_match.group(1))
        current_year = datetime.now().year
        # If the program year is more than 1 year old, skip it
        if start_year < current_year - 1:
            return False
    
    # Check for explicit dates
    month_map = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
        'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
        'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    }
    
    # Pattern 1: "1 January 2026"
    for match in re.finditer(r'(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})', text_lower):
        day, month_str, year = match.groups()
        month = month_map.get(month_str[:3])
        if month:
            try:
                article_date = datetime(int(year), month, int(day), tzinfo=timezone.utc)
                if article_date < cutoff:
                    return False
            except ValueError:
                pass
    
    return True  # No disqualifying date found


def _should_skip_article(title: str, url: str) -> bool:
    """Check if article should be skipped based on title/url keywords."""
    text = (title + " " + url).lower()
    
    # Skip holiday greetings and similar
    for kw in SKIP_KEYWORDS:
        if kw in text:
            return True
    
    # Skip old program year references in URL
    current_year = datetime.now().year
    for year in range(2018, current_year - 1):
        if f"{year}-{str(year+1)[-2:]}" in url:
            return True
        if f"{year}–{str(year+1)[-2:]}" in url:  # en-dash
            return True
    
    return False


def _fetch_with_fallbacks(session: requests.Session, url: str, timeout: int = 20, use_cloudscraper: bool = False) -> requests.Response | None:
    """
    Multi-stage fetch for sites that block datacenter IPs.
    """
    # If explicitly requested to use cloudscraper
    if use_cloudscraper and _HAS_CLOUDSCRAPER:
        try:
            scraper = cloudscraper.create_scraper(
                browser={"browser": "chrome", "platform": "windows", "mobile": False},
                delay=3
            )
            scraper.headers.update(HEADERS)
            resp = scraper.get(url, timeout=timeout)
            if resp.ok and "Access Denied" not in resp.text[:500]:
                return resp
        except Exception:
            pass
    
    # Stage 1: plain requests
    try:
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp
    except requests.RequestException as e:
        host = url.split("/")[2] if "://" in url else ""
        is_blocked_host = host in _BLOCKED_HOSTS
        is_403 = isinstance(e, requests.HTTPError) and e.response is not None and e.response.status_code == 403
        if not (is_blocked_host or is_403):
            raise

    # Stage 2: cloudscraper
    if _HAS_CLOUDSCRAPER:
        try:
            scraper = cloudscraper.create_scraper(browser={"browser": "chrome", "platform": "windows", "mobile": False})
            scraper.headers.update(HEADERS)
            resp = scraper.get(url, timeout=timeout)
            if resp.ok:
                return resp
        except Exception:
            pass

    # Stage 3: ScrapingBee proxy
    api_key = os.environ.get("SCRAPINGBEE_API_KEY")
    if api_key:
        try:
            proxy_resp = requests.get(
                "https://app.scrapingbee.com/api/v1/",
                params={"api_key": api_key, "url": url, "render_js": "false"},
                timeout=max(timeout, 40),
            )
            if proxy_resp.ok:
                return proxy_resp
        except requests.RequestException:
            pass

    return None


def scrape(db) -> list[dict]:
    notifications = []
    meta_ref = db.collection("_scraper_meta")
    session = requests.Session()
    session.headers.update(HEADERS)

    for state in STATES:
        src_id = f"state_{state['code']}"
        try:
            use_cs = state.get("use_cloudscraper", False)
            resp = _fetch_with_fallbacks(session, state["url"], timeout=20, use_cloudscraper=use_cs)
            if resp is None:
                print(f"  [states] ⚠️ {state['code']}: Could not fetch (blocked)")
                continue
            
            soup = BeautifulSoup(resp.text, "html.parser")
            elements = soup.select(state["selector"])
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:30])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src_id).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if not stored_hash:
                store_hash_baseline(meta_ref, src_id, current_hash, {"state": state["code"]})
                print(f"  [states] 📌 {state['code']}: baseline stored")
                continue

            if current_hash == stored_hash:
                continue

            # Try to find a meaningful snippet
            keywords = ["open", "closed", "quota", "invite", "nomination", "round", "eoi"]
            body = next(
                (el.get_text(" ", strip=True)[:120]
                 for el in elements
                 if any(kw in el.get_text(strip=True).lower() for kw in keywords)),
                f"{state['name']} nomination page has been updated."
            )

            notifications.append({
                "source_id": src_id,
                "topic": state["topic"],
                "category": "State Nomination",
                "title": f"{state['icon']} {state['name']} Nomination Update",
                "body": body,
                "url": state.get("link_url", state["url"]),
                "state": state["code"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            meta_ref.document(src_id).set({
                "hash": current_hash,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "state": state["code"],
            })

            print(f"  [states] ✅ {state['code']} changed — notification queued")

        except Exception as e:
            print(f"  [states] ⚠️ {state['code']}: {e}")

    # ── News article tracker: detects individual new articles on state news pages
    for state in STATES:
        if not state.get("news_url"):
            continue
        src_id = f"state_{state['code']}_news"
        try:
            resp = _fetch_with_fallbacks(session, state["news_url"], timeout=20)
            if resp is None:
                continue

            base = state["news_url"].split("/news")[0]
            soup = BeautifulSoup(resp.text, "html.parser")
            selector = state.get("news_link_selector", "a[href*='/news/']")
            links = soup.select(selector)

            # Normalise to absolute URLs, deduplicate
            seen_urls: set[str] = set()
            article_urls: list[str] = []
            for a in links:
                href = a.get("href", "")
                if not href:
                    continue
                if href.startswith("/"):
                    href = base + href
                # Skip the news listing page itself
                if href.rstrip("/") in (state["news_url"].rstrip("/"), base.rstrip("/")):
                    continue
                if href not in seen_urls:
                    seen_urls.add(href)
                    article_urls.append(href)

            if not article_urls:
                continue

            # Load already-seen URLs and hashes from Firestore
            meta_doc = meta_ref.document(src_id).get()
            meta_data = meta_doc.to_dict() if meta_doc.exists else {}
            has_baseline = meta_doc.exists and ("seen_urls" in meta_data or "seen_hashes" in meta_data)
            known_urls: set[str] = set(meta_data.get("seen_urls", []))
            known_hashes: set[str] = set(meta_data.get("seen_hashes", []))

            if not has_baseline:
                # Store initial baseline with hashes
                initial_hashes = [_hash_article("", u) for u in article_urls]
                meta_ref.document(src_id).set({
                    "seen_urls": article_urls,
                    "seen_hashes": initial_hashes,
                    "last_checked": datetime.now(timezone.utc).isoformat(),
                    "state": state["code"],
                })
                print(f"  [states] 📌 {state['code']} news: baseline stored")
                continue

            new_articles = [u for u in article_urls if u not in known_urls and _hash_article("", u) not in known_hashes]
            if not new_articles:
                meta_ref.document(src_id).set({
                    "seen_urls": list(seen_urls),
                    "seen_hashes": [_hash_article("", u) for u in seen_urls],
                    "last_checked": datetime.now(timezone.utc).isoformat(),
                    "state": state["code"],
                }, merge=True)
                continue

            for article_url in new_articles:
                # Skip articles that are clearly old based on URL
                if _should_skip_article("", article_url):
                    print(f"  [states] ❌ {state['code']} news: SKIPPED (old/irrelevant): {article_url}")
                    continue

                # Fetch the article page to get title + snippet
                article_title = None
                article_body = None
                article_date_text = ""
                try:
                    art_resp = _fetch_with_fallbacks(session, article_url, timeout=20)
                    if art_resp:
                        art_soup = BeautifulSoup(art_resp.text, "html.parser")
                        h1 = art_soup.find("h1")
                        article_title = h1.get_text(strip=True) if h1 else None
                        
                        # Look for date in the article
                        for time_el in art_soup.select("time, .date, .published, .post-date"):
                            article_date_text += " " + time_el.get_text(strip=True)
                        
                        # First non-empty paragraph
                        for p in art_soup.select("article p, .content p, main p"):
                            text = p.get_text(" ", strip=True)
                            if len(text) > 30:
                                article_body = text[:200]
                                article_date_text += " " + text  # Check for dates in body too
                                break
                except Exception:
                    pass

                # Apply 30-day date filter
                full_text = (article_title or "") + " " + (article_body or "") + " " + article_date_text
                if not _is_within_date_range(full_text, MAX_NEWS_AGE_DAYS):
                    print(f"  [states] ❌ {state['code']} news: SKIPPED (>30 days old): {article_title or article_url}")
                    continue

                # Skip holiday greetings based on title
                if article_title and _should_skip_article(article_title, article_url):
                    print(f"  [states] ❌ {state['code']} news: SKIPPED (irrelevant): {article_title}")
                    continue

                title = f"{state['icon']} {state['name']}: {article_title}" if article_title else f"{state['icon']} {state['name']} — New Update"
                body = article_body or f"New update published on the {state['name']} Migration website."

                # Generate hash for deduplication
                article_hash = _hash_article(article_title or "", article_url)

                notifications.append({
                    "source_id": f"{src_id}_{article_hash}",
                    "topic": state["topic"],
                    "category": "State Nomination",
                    "title": title[:100],
                    "body": body[:500],
                    "url": article_url,
                    "state": state["code"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                print(f"  [states] ✅ {state['code']} new article: {article_title or article_url}")

            # Save updated seen URLs and hashes
            all_hashes = [_hash_article("", u) for u in seen_urls]
            meta_ref.document(src_id).set({
                "seen_urls": list(seen_urls),
                "seen_hashes": all_hashes,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_changed": datetime.now(timezone.utc).isoformat(),
                "state": state["code"],
            })

        except Exception as e:
            print(f"  [states] ⚠️ {state['code']} news: {e}")

    return notifications
