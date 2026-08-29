"""
Article enrichment — fetch article content and generate comprehensive summaries.
Format: Clear, informative 3-4 sentence summary with all key details.
"""

import os
import re
import requests
from bs4 import BeautifulSoup

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

# Common junk patterns to remove from article text
JUNK_PATTERNS = [
    r'Get our\s*breaking news email.*?podcast',
    r'Sign up for.*?newsletter',
    r'Subscribe to.*?email',
    r'Download our.*?app',
    r'Follow us on.*?(?:Twitter|Facebook|Instagram)',
    r'Share this article',
    r'Click here to.*?(?:subscribe|sign up)',
    r'Read more:',
    r'See also:',
    r'Related articles?:',
    r'ADVERTISEMENT',
    r'Loading\.\.\.',
    r'Comments are closed',
    r'Leave a comment',
    r'\d+\s*shares?',
    r'Print this article',
    r'Email this article',
    r'Get the latest.*?inbox',
    r'Breaking news.*?free app',
    r'daily news podcast',
    r'breaking news email',
    r'free app',
]


def _clean_junk_text(text: str) -> str:
    """Remove newsletter prompts, social media links, and other junk from article text."""
    cleaned = text
    for pattern in JUNK_PATTERNS:
        cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)
    # Collapse multiple spaces
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned


def _fetch_article(url: str) -> str | None:
    """Fetch main article text from URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; MigrateAU/1.0)"}
        resp = requests.get(url, timeout=12, headers=headers)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, "lxml")
        
        # Remove unwanted elements
        for tag in soup(["script", "style", "nav", "footer", "aside", "iframe", 
                         "form", "button", ".newsletter", ".social-share", ".ad",
                         ".advertisement", ".promo", ".signup"]):
            if hasattr(tag, 'decompose'):
                tag.decompose()
        
        article = soup.find("article") or soup.find("main") or soup
        paragraphs = [p.get_text(strip=True) for p in article.find_all("p") if len(p.get_text(strip=True)) > 40]
        
        text = "\n".join(paragraphs[:20])  # First 20 paragraphs
        
        # Clean junk from the text
        text = _clean_junk_text(text)
        
        return text[:8000] if text else None
    except Exception as e:
        print(f"  [enricher] Fetch failed: {e}")
        return None


def _gemini_summary(title: str, content: str) -> str | None:
    """Generate comprehensive migration-focused summary using Gemini Pro."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return None
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-pro")
        
        prompt = f"""You are writing a news summary for an Australian migration app. The readers are visa applicants and migrants.

TASK: Write a clear, complete summary (3-4 sentences, 80-150 words) that includes ALL important details.

MUST INCLUDE (if mentioned in the article):
• What happened or changed (the main news)
• Specific visa subclasses affected (e.g., subclass 189, 482, 500)
• Key numbers (fees, points, quotas, processing times)
• Important dates or deadlines
• Who is affected (skilled workers, students, partners, etc.)
• Any action required by applicants

STYLE:
• Professional, factual tone
• No filler words or generic statements
• Include specific details, not vague summaries
• Write complete sentences
• Do NOT include phrases like "Get our newsletter", "Subscribe", "Download our app", etc.

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{content[:5000]}

SUMMARY:"""

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=300,
                temperature=0.1,
            )
        )
        summary = response.text.strip()
        
        # Clean up
        if summary.lower().startswith("summary:"):
            summary = summary[8:].strip()
        
        # Final cleanup of any junk
        summary = _clean_junk_text(summary)
        
        return summary if 80 < len(summary) < 600 else None
    except Exception as e:
        print(f"  [enricher] Gemini error: {e}")
        return None


def enrich(title: str, rss_desc: str, url: str) -> str:
    """
    Get comprehensive summary with all key migration details.
    Priority: AI summary > article excerpt > RSS description
    """
    # Clean RSS description first
    rss_desc = _clean_junk_text(rss_desc)
    
    # Try fetching full article
    article = _fetch_article(url)
    
    if article:
        # Try AI summary with Pro model
        summary = _gemini_summary(title, article)
        if summary:
            print(f"  [enricher] ✅ AI summary: {title[:50]}")
            return summary
        
        # Fallback: first 3-4 sentences from article
        sentences = re.split(r'(?<=[.!?])\s+', article)
        # Filter out short/junk sentences
        good_sentences = [s for s in sentences if len(s) > 30 and not any(j in s.lower() for j in ['subscribe', 'newsletter', 'download', 'follow us'])]
        excerpt = " ".join(good_sentences[:4])
        if len(excerpt) > 100:
            print(f"  [enricher] 📝 Excerpt: {title[:50]}")
            if len(excerpt) > 800:
                excerpt = excerpt[:800].rsplit(" ", 1)[0] + "…"
            return excerpt
    
    # Fallback: RSS description (expanded)
    print(f"  [enricher] ⚠️ RSS fallback: {title[:50]}")
    desc = rss_desc[:700] if rss_desc else title
    if len(desc) > 600:
        desc = desc[:600].rsplit(" ", 1)[0] + "…"
    return desc
