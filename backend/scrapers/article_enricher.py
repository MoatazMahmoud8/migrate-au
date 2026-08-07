"""
Article enrichment — fetch article content and generate Nabad-style summaries.
Format: Title + 2-3 sentence summary focused on migration relevance.
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
        
        text = "\n".join(paragraphs[:15])  # First 15 paragraphs max
        return text[:6000] if text else None
    except Exception as e:
        print(f"  [enricher] Fetch failed: {e}")
        return None


def _gemini_summary(title: str, content: str) -> str | None:
    """Generate 2-3 sentence migration-focused summary using Gemini."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        return None
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""Summarize this Australian migration news in exactly 2-3 sentences.
Focus on: what changed, who is affected, key dates/numbers.
Write for visa applicants. Be direct and factual.

Title: {title}
Article: {content[:4000]}

Summary (2-3 sentences only):"""

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=200,
                temperature=0.2,
            )
        )
        summary = response.text.strip()
        return summary if 50 < len(summary) < 500 else None
    except Exception as e:
        print(f"  [enricher] Gemini error: {e}")
        return None


def enrich(title: str, rss_desc: str, url: str) -> str:
    """
    Get Nabad-style summary: 2-3 clear sentences.
    Priority: AI summary > article excerpt > RSS description
    """
    # Try fetching full article
    article = _fetch_article(url)
    
    if article:
        # Try AI summary
        summary = _gemini_summary(title, article)
        if summary:
            print(f"  [enricher] ✅ AI: {title[:50]}")
            return summary
        
        # Fallback: first 2-3 sentences from article
        sentences = re.split(r'(?<=[.!?])\s+', article)
        excerpt = " ".join(sentences[:3])
        if len(excerpt) > 100:
            print(f"  [enricher] 📝 Excerpt: {title[:50]}")
            return excerpt[:400].rsplit(" ", 1)[0] + "…" if len(excerpt) > 400 else excerpt
    
    # Fallback: RSS description
    print(f"  [enricher] ⚠️ RSS fallback: {title[:50]}")
    desc = rss_desc[:350] if rss_desc else title
    return desc.rsplit(" ", 1)[0] + "…" if len(desc) > 300 else desc
