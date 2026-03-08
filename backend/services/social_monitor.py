"""
Social Media Monitor service.

Generates a realistic simulated feed of brand mentions, then uses Gemini to:
1. Classify each mention: complaint | question | praise | spam
2. Generate an on-brand suggested reply

Mirrors forum_action.py — same pattern, different data source.
To swap in the real Twitter/X API, replace generate_mock_mentions() with
a call to the X API v2 /tweets/search/recent endpoint.
"""

import json
from datetime import datetime, timezone, timedelta
import random

from google import genai
from sqlalchemy.orm import Session

from config import settings
from db.models import SocialMention


client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ── Mock data ──────────────────────────────────────────────────────────────

MOCK_MENTIONS = [
    {
        "author": "Jake Morrison",
        "author_handle": "@jakemorrison_",
        "text": "Hey {handle} my order arrived with the wrong size. Really frustrated right now 😠",
    },
    {
        "author": "Priya Patel",
        "author_handle": "@priyapatel92",
        "text": "Does {handle} offer free returns? I want to send back a pair of sneakers",
    },
    {
        "author": "Carlos Rivera",
        "author_handle": "@c_rivera_fit",
        "text": "Just got my new kicks from {handle} and they are FIRE 🔥🔥 10/10 would recommend",
    },
    {
        "author": "TechDeals Bot",
        "author_handle": "@techdealsbot99",
        "text": "Check out the best deals!! Visit our website for amazing offers {handle} #deals #promo",
    },
    {
        "author": "Mia Chen",
        "author_handle": "@mia_runs_far",
        "text": "{handle} what's the difference between the AirRun Pro and the CloudStep? Which is better for marathon training?",
    },
    {
        "author": "Devon Williams",
        "author_handle": "@devonw_atl",
        "text": "waited 3 weeks for my delivery from {handle} and still nothing. Where is my order??",
    },
    {
        "author": "Sam Liu",
        "author_handle": "@samliu_design",
        "text": "The packaging from {handle} is so aesthetic I almost didn't want to open it 😍",
    },
    {
        "author": "Rachel Torres",
        "author_handle": "@rachel_t_nyc",
        "text": "{handle} do you ship internationally? I'm in Canada and want to order",
    },
]


import atproto
from services.bluesky_client import fetch_mentions, bluesky_configured


def fetch_real_mentions(handle: str) -> list[dict]:
    """
    Fetch REAL Bluesky mentions for the given handle.
    Falls back to mock data if Bluesky is not configured or fails.
    """
    if not bluesky_configured():
        return generate_mock_mentions(handle)

    try:
        results = fetch_mentions()
        if not results:
            print("ℹ️ No real Bluesky mentions found — using mock data")
            return generate_mock_mentions(handle)
        
        print(f"✅ Fetched {len(results)} real mentions from Bluesky")
        return results
    except Exception as e:
        print(f"⚠️ Bluesky API error: {e} — falling back to mock data")
        return generate_mock_mentions(handle)


def generate_mock_mentions(handle: str) -> list[dict]:
    """Fallback: simulated brand mentions for demo when API unavailable."""
    mentions = random.sample(MOCK_MENTIONS, k=min(6, len(MOCK_MENTIONS)))
    result = []
    for m in mentions:
        result.append({
            "author": m["author"],
            "author_handle": m["author_handle"],
            "text": m["text"].replace("{handle}", handle),
            "platform": "bluesky",
        })
    return result


# ── Classification + Reply Generation ─────────────────────────────────────

CLASSIFY_PROMPT = """You are a social media AI assistant for a brand called {agent_name}.

Analyze this social media mention and respond with a JSON object.

MENTION:
Author: {author} ({author_handle})
Text: "{text}"

BRAND KNOWLEDGE BASE (use to craft replies):
---
{knowledge_context}
---

Classify the mention and generate a reply. Return ONLY valid JSON:
{{
  "sentiment": "<complaint | question | praise | spam>",
  "suggested_reply": "<a friendly, concise on-brand reply (max 280 chars). Empty string if spam.>"
}}"""


async def scan_and_classify_mentions(
    db: Session,
    agent_id: str,
    agent_name: str,
    bluesky_handle: str,
    knowledge_context: str,
) -> dict:
    """
    Main entry point:
    1. Generate mock mentions (swap for X API in prod)
    2. Classify sentiment + generate reply for each using Gemini
    3. Save to DB
    4. Return a summary report
    """
    handle = bluesky_handle if bluesky_handle else "brand.bsky.social"

    # Try real Bluesky mentions first; fall back to mock if unavailable
    mentions_raw = fetch_real_mentions(handle)

    # --- Deduplication Logic ---
    existing_uris_query = db.query(SocialMention.post_uri).filter(
        SocialMention.agent_id == agent_id,
        SocialMention.post_uri.isnot(None)
    ).all()
    existing_uris = {r[0] for r in existing_uris_query}

    existing_texts_query = db.query(SocialMention.text).filter(
        SocialMention.agent_id == agent_id
    ).all()
    existing_texts = {r[0] for r in existing_texts_query}

    new_mentions = []
    for m in mentions_raw:
        if m.get("post_uri") and m["post_uri"] in existing_uris:
            continue
        if m["text"] in existing_texts:
            continue
            
        new_mentions.append(m)
        if m.get("post_uri"):
            existing_uris.add(m["post_uri"])
        existing_texts.add(m["text"])
    # ---------------------------

    report = {
        "total": len(new_mentions),
        "breakdown": {"complaint": 0, "question": 0, "praise": 0, "spam": 0},
        "mentions": [],
        "errors": [],
    }

    for m in new_mentions:
        prompt = CLASSIFY_PROMPT.format(
            agent_name=agent_name,
            author=m["author"],
            author_handle=m["author_handle"],
            text=m["text"],
            knowledge_context=knowledge_context[:20_000] if knowledge_context else "No knowledge base uploaded yet.",
        )

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("```", 1)[0]
            parsed = json.loads(text.strip())
            sentiment = parsed.get("sentiment", "question")
            suggested_reply = parsed.get("suggested_reply", "")
        except Exception as e:
            report["errors"].append(f"Gemini error for {m['author_handle']}: {e}")
            sentiment = "question"
            suggested_reply = ""

        # Save to DB
        mention = SocialMention(
            agent_id=agent_id,
            platform=m["platform"],
            author=m["author"],
            author_handle=m["author_handle"],
            text=m["text"],
            sentiment=sentiment,
            suggested_reply=suggested_reply,
            status="pending",
            post_cid=m.get("post_cid"),
            post_uri=m.get("post_uri"),
            root_cid=m.get("root_cid"),
            root_uri=m.get("root_uri"),
        )
        db.add(mention)

        report["breakdown"][sentiment] = report["breakdown"].get(sentiment, 0) + 1
        report["mentions"].append({
            "author": m["author"],
            "author_handle": m["author_handle"],
            "text": m["text"],
            "sentiment": sentiment,
            "reply_preview": suggested_reply[:100] + ("..." if len(suggested_reply) > 100 else ""),
        })

    db.commit()
    return report


def format_scan_report(report: dict) -> str:
    """Format the scan report as a readable chat message with snippets."""
    b = report["breakdown"]
    lines = [
        f"📡 **Scanned {report['total']} mentions** for your brand:\n",
        f"🔴 {b.get('complaint', 0)} complaints / 🟡 {b.get('question', 0)} questions",
        f"🟢 {b.get('praise', 0)} praise / ⬛ {b.get('spam', 0)} spam\n",
    ]

    # Pull out specific interesting mentions (questions and complaints)
    interesting = [m for m in report["mentions"] if m["sentiment"] in ("question", "complaint")]
    if not interesting:
        interesting = report["mentions"][:3] # Fallback to first few if no questions
    else:
        interesting = interesting[:3] # Show top 3 interesting ones

    if interesting:
        lines.append("**Top Mentions:**")
        for m in interesting:
            sentiment_icon = "🔴" if m["sentiment"] == "complaint" else "🟡" if m["sentiment"] == "question" else "🟢"
            # Strip @ from handle for cleaner display if it's there
            handle = m["author_handle"].lstrip('@')
            lines.append(f"{sentiment_icon} **@{handle}**: \"{m['text']}\"")
        lines.append("")

    lines.append("I've generated suggested replies for each one. Visit your **Social Dashboard** to review and approve them.")
    
    if report["errors"]:
        lines.append(f"\n⚠️ {len(report['errors'])} mention(s) had errors during processing.")
    
    return "\n".join(lines)
