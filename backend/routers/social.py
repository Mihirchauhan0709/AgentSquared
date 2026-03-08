"""
/api/agents/{slug}/social — social monitor endpoints.
"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Agent, SocialMention
from schemas.agent import SocialMentionResponse
from services.social_monitor import scan_and_classify_mentions
from services.knowledge import retrieve_knowledge
from services.bluesky_client import post_reply, bluesky_configured

router = APIRouter(prefix="/api", tags=["social"])


class UpdateMentionRequest(BaseModel):
    status: str  # approved | ignored


@router.post("/agents/{slug}/social/scan")
async def scan_mentions(slug: str, db: Session = Depends(get_db)):
    """Trigger a fresh scan of brand mentions — classify + generate replies."""
    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    handle = agent.bluesky_handle or agent.name
    knowledge_context = retrieve_knowledge(db, agent.id, "")

    report = await scan_and_classify_mentions(
        db=db,
        agent_id=agent.id,
        agent_name=agent.name,
        bluesky_handle=agent.bluesky_handle or agent.name,
        knowledge_context=knowledge_context,
    )
    return report


@router.get("/agents/{slug}/social/mentions", response_model=list[SocialMentionResponse])
def get_mentions(slug: str, db: Session = Depends(get_db)):
    """List all social mentions for an agent, newest first."""
    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    mentions = (
        db.query(SocialMention)
        .filter(SocialMention.agent_id == agent.id)
        .order_by(SocialMention.created_at.desc())
        .all()
    )
    return mentions


@router.patch("/agents/{slug}/social/mentions/{mention_id}", response_model=SocialMentionResponse)
def update_mention(
    slug: str,
    mention_id: str,
    req: UpdateMentionRequest,
    db: Session = Depends(get_db),
):
    """Approve or ignore a social mention. Approved mentions are posted as real tweets."""
    if req.status not in ("approved", "ignored", "pending"):
        raise HTTPException(400, "Status must be approved, ignored, or pending")

    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    mention = (
        db.query(SocialMention)
        .filter(SocialMention.id == mention_id, SocialMention.agent_id == agent.id)
        .first()
    )
    if not mention:
        raise HTTPException(404, "Mention not found")

    # ── Post real reply when approved (Bluesky) ────────────────────────
    if req.status == "approved" and mention.suggested_reply and mention.status != "approved":
        if bluesky_configured() and mention.platform == "bluesky":
            result = post_reply(
                text=mention.suggested_reply,
                parent_uri=mention.post_uri,
                parent_cid=mention.post_cid,
                root_uri=mention.root_uri,
                root_cid=mention.root_cid,
            )
            if result.get("success"):
                print(f"✅ Bluesky reply posted: {result.get('uri')}")
                mention.external_id = result.get("uri")
            else:
                print(f"⚠️ Bluesky reply failed: {result.get('error')}")

    mention.status = req.status
    db.commit()
    db.refresh(mention)
    return mention
