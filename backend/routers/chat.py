"""
/api/agents/{slug}/chat — chat with an agent.

Supports both normal chat and forum action commands.
When the user asks the agent to "answer forum questions", 
the agent autonomously processes the forum instead of chatting.
"""

import json
import re
import uuid
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Agent, ChatMessage
from schemas.agent import ChatRequest, ChatMessageResponse
from services.gemini_chat import chat_with_agent
from services.knowledge import retrieve_knowledge
from services.forum_action import answer_forum_questions, format_report
from services.social_monitor import scan_and_classify_mentions, format_scan_report
from db.models import SocialMention

router = APIRouter(prefix="/api", tags=["chat"])


# Patterns that trigger the forum action
FORUM_ACTION_PATTERNS = [
    r"answer.*(forum|question)",
    r"go.*(answer|respond|reply).*(forum|question)",
    r"check.*(forum|question)",
    r"respond.*(forum|question)",
    r"reply.*(forum|question)",
    r"handle.*(forum|question)",
    r"process.*(forum|question)",
    r"forum",
]

SOCIAL_MONITOR_PATTERNS = [
    r"check.*(mention|tweet|social)",
    r"scan.*(mention|tweet|social)",
    r"(mention|tweet)s?",
    r"social.*(media|monitor|scan)",
    r"what.*(people|customers|saying)",
    r"monitor",
]

MARKETING_ACTION_PATTERNS = [
    r"(create|make|write|generate|draft).*(post|tweet|content|update|message)",
    r"post.*about",
]

def _is_forum_action(message: str) -> bool:
    """Check if the user message is a forum action command."""
    msg = message.lower().strip()
    return any(re.search(pattern, msg) for pattern in FORUM_ACTION_PATTERNS)


def _is_social_action(message: str) -> bool:
    """Check if the user message is a social monitor command."""
    msg = message.lower().strip()
    return any(re.search(pattern, msg) for pattern in SOCIAL_MONITOR_PATTERNS)

def _is_marketing_action(message: str, has_image: bool = False) -> bool:
    """Check if the user message is a marketing post command."""
    if has_image:
        return True
    msg = message.lower().strip()
    return any(re.search(pattern, msg) for pattern in MARKETING_ACTION_PATTERNS)


@router.post("/agents/{slug}/chat")
async def chat(slug: str, req: ChatRequest, db: Session = Depends(get_db)):
    """Send a message to an agent and get a response."""

    # Load agent
    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    spec = json.loads(agent.spec) if agent.spec else {}

    # Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        session_id=req.session_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    db.commit()

    # ── Forum Action Detection ──────────────────────────────────
    if _is_forum_action(req.message) and agent.forum_url:
        try:
            report = await answer_forum_questions(
                db=db,
                agent_id=agent.id,
                agent_name=agent.name,
                forum_url=agent.forum_url,
                forum_type=agent.forum_type or "auto",
                forum_credentials=agent.forum_credentials,
            )
            response_text = format_report(report)
        except Exception as e:
            print(f"Forum action error: {e}")
            response_text = f"⚠️ I tried to access your forum but ran into an error: {str(e)[:200]}"

        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            session_id=req.session_id,
            role="assistant",
            content=response_text,
        )
        db.add(assistant_msg)
        db.commit()
        return {"response": response_text, "session_id": req.session_id}

    # ── Social Monitor Action Detection ─────────────────────────
    if _is_social_action(req.message) and agent.agent_type == "social_monitor":
        try:
            from services.knowledge import retrieve_knowledge as _rk
            knowledge_context = _rk(db, agent.id, "")
            report = await scan_and_classify_mentions(
                db=db,
                agent_id=agent.id,
                agent_name=agent.name,
                bluesky_handle=agent.bluesky_handle or agent.name,
                knowledge_context=knowledge_context,
            )
            response_text = format_scan_report(report)
        except Exception as e:
            print(f"Social monitor error: {e}")
            response_text = f"⚠️ I tried to scan your mentions but ran into an error: {str(e)[:200]}"

        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            session_id=req.session_id,
            role="assistant",
            content=response_text,
        )
        db.add(assistant_msg)
        db.commit()
        return {"response": response_text, "session_id": req.session_id}

    # ── Social Marketing Action Detection ─────────────────────────
    if _is_marketing_action(req.message, bool(req.image)) and agent.agent_type == "social_marketing":
        try:
            from services.knowledge import retrieve_knowledge as _rk
            from services.social_marketing import generate_and_post_marketing_content
            
            knowledge_context = _rk(db, agent.id, req.message)
            config_context = agent.config_input or ""
            full_context = f"{config_context}\n\n{knowledge_context}"
            
            result = await generate_and_post_marketing_content(
                agent_name=agent.name,
                topic=req.message,
                knowledge_context=full_context,
                custom_image_b64=req.image
            )
            
            if result.get("success"):
                response_text = f"✅ Successfully generated and posted to Bluesky!\n\n**Post Text:**\n{result['post_text']}\n\n![Generated Image]({result['preview_url']})"
            else:
                response_text = f"⚠️ I generated the content but hit an error posting to Bluesky: {result.get('error')}\n\n**Post Text:**\n{result.get('post_text', 'N/A')}\n\n![Generated Image]({result.get('preview_url', '')})"
                
        except Exception as e:
            print(f"Social marketing error: {e}")
            response_text = f"⚠️ I tried to generate and post your content but ran into an error: {str(e)[:200]}"

        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            session_id=req.session_id,
            role="assistant",
            content=response_text,
        )
        db.add(assistant_msg)
        db.commit()
        return {"response": response_text, "session_id": req.session_id}

    # Retrieve knowledge context
    knowledge_context = ""
    knowledge_strategy = spec.get("knowledge_config", {}).get("strategy", "")
    if knowledge_strategy == "rag":
        knowledge_context = retrieve_knowledge(db, agent.id, req.message)

    # For social_monitor agents, also pull in the most recent real mentions
    if agent.agent_type == "social_monitor":
        recent_mentions = (
            db.query(SocialMention)
            .filter(SocialMention.agent_id == agent.id)
            .order_by(SocialMention.created_at.desc())
            .limit(10)
            .all()
        )
        if recent_mentions:
            mentions_text = "\nRECENT SOCIAL MEDIA MENTIONS (Bluesky):\n---\n"
            for m in recent_mentions:
                date_str = m.created_at.strftime("%Y-%m-%d %H:%M")
                mentions_text += f"- [{date_str}] @{m.author_handle.lstrip('@')}: \"{m.text}\" (Sentiment: {m.sentiment})\n"
            mentions_text += "---\n"
            knowledge_context = mentions_text + knowledge_context

    # Load chat history
    history_records = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.agent_id == agent.id,
            ChatMessage.session_id == req.session_id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    chat_history = [
        {"role": m.role, "content": m.content}
        for m in history_records
        if m.id != user_msg.id
    ]

    # Get response from Gemini with retry for rate limiting
    response_text = None
    last_error = None
    for attempt in range(3):
        try:
            response_text = await chat_with_agent(
                spec=spec,
                user_message=req.message,
                chat_history=chat_history,
                knowledge_context=knowledge_context,
            )
            break
        except Exception as e:
            last_error = e
            error_str = str(e)
            print(f"Chat error (attempt {attempt + 1}): {error_str}")
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = (attempt + 1) * 2
                print(f"Rate limited, waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
            else:
                break

    if response_text is None:
        error_msg = str(last_error) if last_error else "Unknown error"
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(429, "Gemini API rate limit reached. Please wait a moment and try again.")
        raise HTTPException(500, f"Failed to generate response: {error_msg[:200]}")

    # Save assistant message
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        session_id=req.session_id,
        role="assistant",
        content=response_text,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "response": response_text,
        "session_id": req.session_id,
    }


@router.get("/agents/{slug}/history/{session_id}", response_model=list[ChatMessageResponse])
async def get_history(slug: str, session_id: str, db: Session = Depends(get_db)):
    """Get chat history for a session."""
    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.agent_id == agent.id,
            ChatMessage.session_id == session_id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )

    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at,
        )
        for m in messages
    ]
