import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup


def get_db():
    if not firebase_admin._apps:
        cert_dict = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
        cred = credentials.Certificate(cert_dict)
        firebase_admin.initialize_app(cred)
    return firestore.client()


def scrape_state(state_code, url, selector):
    db = get_db()
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
    soup = BeautifulSoup(response.text, 'html.parser')

    # استخراج أول 3 أخبار لكل ولاية لتوفير الـ Quota
    for item in soup.select(selector)[:3]:
        title = item.get_text(strip=True)
        if not title:
            continue
        doc_id = f"{state_code}_{title[:20]}".replace(" ", "_").lower()

        db.collection('migration_news').document(doc_id).set({
            'title': title,
            'state': state_code,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'source_url': url
        }, merge=True)


if __name__ == "__main__":
    # جميع الولايات والأقاليم الأسترالية الثمانية
    targets = [
        # Victoria
        {'code': 'VIC', 'url': 'https://liveinmelbourne.vic.gov.au/news-and-events/news', 'sel': '.news-listing h3'},
        # New South Wales
        {'code': 'NSW', 'url': 'https://www.nsw.gov.au/topics/visas-and-migration', 'sel': '.nsw-card__title'},
        # Queensland
        {'code': 'QLD', 'url': 'https://migration.qld.gov.au/news', 'sel': 'article h2'},
        # Western Australia
        {'code': 'WA', 'url': 'https://migration.wa.gov.au/news-and-events', 'sel': '.field--name-title'},
        # South Australia
        {'code': 'SA', 'url': 'https://www.migration.sa.gov.au/news', 'sel': '.views-field-title'},
        # Tasmania
        {'code': 'TAS', 'url': 'https://www.migration.tas.gov.au/news', 'sel': 'article h2, .news-title'},
        # Australian Capital Territory
        {'code': 'ACT', 'url': 'https://www.act.gov.au/move-to-act/act-nomination', 'sel': 'h2, h3'},
        # Northern Territory
        {'code': 'NT', 'url': 'https://theterritory.com.au/migrate/news', 'sel': 'h2, .article-title'},
    ]

    success = 0
    for t in targets:
        try:
            scrape_state(t['code'], t['url'], t['sel'])
            print(f"✅ {t['code']} scraped successfully")
            success += 1
        except Exception as e:
            print(f"❌ Error scraping {t['code']}: {e}")

    print(f"\nDone: {success}/{len(targets)} states updated in Firestore.")
