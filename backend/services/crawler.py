"""
Website crawler service.

Crawls a company website, extracts text content from pages,
and stores them as knowledge files for RAG.
"""

import uuid
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from config import settings
from db.models import KnowledgeFile


async def crawl_website(
    db: Session,
    agent_id: str,
    website_url: str,
    max_pages: int | None = None,
) -> list[dict]:
    """
    Crawl a website and store extracted text as knowledge files.

    1. Fetch the homepage
    2. Extract text + find internal links
    3. Follow links up to max_pages
    4. Store each page as a knowledge_file with source_type='web_crawl'

    Returns list of {url, title, text_length} for each crawled page.
    """
    if max_pages is None:
        max_pages = settings.MAX_CRAWL_PAGES

    # Normalize base URL
    parsed_base = urlparse(website_url)
    base_domain = parsed_base.netloc
    if not parsed_base.scheme:
        website_url = f"https://{website_url}"
        parsed_base = urlparse(website_url)
        base_domain = parsed_base.netloc

    visited = set()
    to_visit = [website_url]
    results = []

    headers = {
        "User-Agent": "AgentSquared-Crawler/1.0 (hackathon project)",
    }

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=True,
        headers=headers,
    ) as client:
        while to_visit and len(visited) < max_pages:
            url = to_visit.pop(0)

            # Normalize URL
            url = url.split("#")[0]  # Remove fragment
            url = url.rstrip("/")

            if url in visited:
                continue

            visited.add(url)

            try:
                response = await client.get(url)
                if response.status_code != 200:
                    continue
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    continue
            except Exception:
                continue

            # Parse HTML
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract title
            title = soup.title.string.strip() if soup.title and soup.title.string else url

            # Remove script, style, nav, footer, header elements for cleaner text
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "iframe"]):
                tag.decompose()

            # Extract text content
            text = soup.get_text(separator="\n", strip=True)

            # Clean up whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = "\n".join(lines)

            if len(clean_text) < 50:
                continue  # Skip near-empty pages

            # Store as knowledge file
            knowledge_file = KnowledgeFile(
                id=str(uuid.uuid4()),
                agent_id=agent_id,
                filename=title,
                file_path=None,
                source_type="web_crawl",
                source_url=url,
                mime_type="text/html",
                extracted_text=clean_text[:20_000],  # Cap per page
            )
            db.add(knowledge_file)

            results.append({
                "url": url,
                "title": title,
                "text_length": len(clean_text),
            })

            # Find internal links to follow
            for link_tag in soup.find_all("a", href=True):
                href = link_tag["href"]
                full_url = urljoin(url, href)
                parsed = urlparse(full_url)

                # Only follow same-domain, http(s), non-visited links
                if (
                    parsed.netloc == base_domain
                    and parsed.scheme in ("http", "https")
                    and full_url.rstrip("/") not in visited
                    and not any(full_url.endswith(ext) for ext in (".pdf", ".jpg", ".png", ".gif", ".zip", ".css", ".js"))
                ):
                    to_visit.append(full_url)

    db.commit()
    return results
