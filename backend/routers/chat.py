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


def _is_forum_action(message: str) -> bool:
    """Check if the user message is a forum action command."""
    msg = message.lower().strip()
    return any(re.search(pattern, msg) for pattern in FORUM_ACTION_PATTERNS)


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
            )
            response_text = format_report(report)
        except Exception as e:
            print(f"Forum action error: {e}")
            response_text = f"⚠️ I tried to access your forum but ran into an error: {str(e)[:200]}"

        # Save assistant response
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

    # ── Normal Chat Flow ────────────────────────────────────────
    # Retrieve knowledge context
    knowledge_context = ""
    knowledge_strategy = spec.get("knowledge_config", {}).get("strategy", "")
    if knowledge_strategy == "rag":
        knowledge_context = retrieve_knowledge(db, agent.id, req.message)

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
