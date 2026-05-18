"""
State & territory nomination scraper — all 8 states/territories.
Monitors:
  - Nomination quota announcements
  - Open/closed status changes
  - EOI invite thresholds
  - New nomination streams
"""

import hashlib
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

try:
    import cloudscraper  # type: ignore
    _HAS_CLOUDSCRAPER = True
except ImportError:
    _HAS_CLOUDSCRAPER = False

# Sites known to block datacenter IPs (e.g. GitHub Actions).
# These fall back to cloudscraper, then to a proxy API if configured.
_BLOCKED_HOSTS = {"www.act.gov.au", "australiasnorthernterritory.com.au"}

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
        # Scrape DHA page (VIC gov blocks bots); link users to the actual VIC government page
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
        "url": "https://www.migration.sa.gov.au/",
        "link_url": "https://www.migration.sa.gov.au/",
        "selector": "h2, h3, .views-field-title, .alert, p",
        "icon": "🔴",
    },
    {
        "code": "TAS",
        "name": "Tasmania",
        "topic": "state_TAS",
        "url": "https://www.migration.tas.gov.au/",
        "link_url": "https://www.migration.tas.gov.au/",
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
        "url": "https://australiasnorthernterritory.com.au/move",
        "link_url": "https://australiasnorthernterritory.com.au/move",
        "selector": "h2, h3, .article-title, .alert, p, .card-title",
        "icon": "🟠",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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


def _fetch_with_fallbacks(session: requests.Session, url: str, timeout: int = 20) -> requests.Response | None:
    """
    Multi-stage fetch for sites that block datacenter IPs.

    Order:
      1. Plain `requests` (works for most sites + works locally for everything)
      2. cloudscraper (handles simple Cloudflare bot challenges) — only if installed
         and the host is known to block.
      3. ScrapingBee API (if `SCRAPINGBEE_API_KEY` env var is set) — uses residential
         IPs to bypass Cloudflare datacenter blocks. Free tier = 1000 reqs/mo.

    Returns the successful Response, or None if all attempts fail.
    """
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
            raise  # Genuine failure, not a bot-block

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

    # Stage 3: ScrapingBee proxy (only if API key is configured)
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
            resp = _fetch_with_fallbacks(session, state["url"], timeout=20)
            if resp is None:
                # Site is blocking datacenter IPs and no proxy is configured.
                # Skip silently to avoid log spam on every scheduled run.
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            elements = soup.select(state["selector"])
            content = " ".join(el.get_text(" ", strip=True) for el in elements[:30])
            if not content.strip():
                continue

            current_hash = _hash(content)
            meta_doc = meta_ref.document(src_id).get()
            stored_hash = meta_doc.to_dict().get("hash") if meta_doc.exists else None

            if current_hash == stored_hash:
                continue

            # Try to find a meaningful snippet (look for open/closed/quota keywords)
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
            print(f"  [states] ⚠️  {state['code']}: {e}")

    return notifications
