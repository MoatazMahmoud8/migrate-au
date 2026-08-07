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


def _fetch_article(url: str) -> str | None:
    """Fetch main article text from URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; MigrateAU/1.0)"}
        resp = requests.get(url, timeout=12, headers=headers)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "aside", "iframe"]):
            tag.decompose()
        
        article = soup.find("article") or soup.find("main") or soup
        paragraphs = [p.get_text(strip=True) for p in article.find_all("p") if len(p.get_text(strip=True)) > 40]
        
        text = "\n".join(paragraphs[:20])  # First 20 paragraphs
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
        # Use Pro model for better quality
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

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{content[:5000]}

SUMMARY:"""

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=300,
                temperature=0.1,  # Very factual
            )
        )
        summary = response.text.strip()
        
        # Clean up
        if summary.lower().startswith("summary:"):
            summary = summary[8:].strip()
        
        return summary if 80 < len(summary) < 600 else None
    except Exception as e:
        print(f"  [enricher] Gemini error: {e}")
        return None


def enrich(title: str, rss_desc: str, url: str) -> str:
    """
    Get comprehensive summary with all key migration details.
    Priority: AI summary > article excerpt > RSS description
    """
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
        excerpt = " ".join(sentences[:4])
        if len(excerpt) > 100:
            print(f"  [enricher] 📝 Excerpt: {title[:50]}")
            if len(excerpt) > 450:
                excerpt = excerpt[:450].rsplit(" ", 1)[0] + "…"
            return excerpt
    
    # Fallback: RSS description (expanded)
    print(f"  [enricher] ⚠️ RSS fallback: {title[:50]}")
    desc = rss_desc[:400] if rss_desc else title
    if len(desc) > 350:
        desc = desc[:350].rsplit(" ", 1)[0] + "…"
    return desc
