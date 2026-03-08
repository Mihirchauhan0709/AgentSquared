"""
Knowledge retrieval service.

For MVP: concatenate all extracted text from both uploaded docs and crawled web pages.
Gemini handles fuzzy matching well, so brute-force context injection works fine.
"""

from sqlalchemy.orm import Session
from db.models import KnowledgeFile


def retrieve_knowledge(db: Session, agent_id: str, query: str, top_k: int = 3) -> str:
    """
    Retrieve relevant knowledge chunks for a given query.

    MVP strategy: return all extracted_text (concatenated and truncated).
    Sources are labeled by type (website page vs uploaded document).
    """
    files = (
        db.query(KnowledgeFile)
        .filter(KnowledgeFile.agent_id == agent_id)
        .filter(KnowledgeFile.extracted_text.isnot(None))
        .all()
    )

    if not files:
        return ""

    # Concatenate all knowledge with source labels
    chunks = []
    for f in files:
        if f.extracted_text and f.extracted_text.strip():
            if f.source_type == "web_crawl":
                label = f"[From website: {f.source_url or f.filename}]"
            else:
                label = f"[From document: {f.filename}]"
            chunks.append(f"{label}\n{f.extracted_text.strip()}")

    combined = "\n\n".join(chunks)

    # Truncate to ~50k characters to stay within context limits
    max_chars = 50_000
    if len(combined) > max_chars:
        combined = combined[:max_chars] + "\n\n[... knowledge truncated for length ...]"

    return combined
