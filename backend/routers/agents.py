"""
/api/agents — create, list, and get agents.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from slugify import slugify

from db.database import get_db
from db.models import Agent, Company
from schemas.agent import (
    CreateAgentRequest,
    AgentResponse,
    AgentPublicResponse,
    AgentListItem,
)
from services.gemini_spec import generate_agent_spec
from services.crawler import crawl_website
from templates.agent_templates import get_template, get_all_templates
from dependencies.auth import get_current_company

import uuid

router = APIRouter(prefix="/api", tags=["agents"])


@router.get("/templates")
async def list_templates():
    """Return available agent templates for the frontend build form."""
    return get_all_templates()


@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    req: CreateAgentRequest,
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company),
):
    """Create a new agent: validate → crawl website → generate spec → save."""

    # Validate template exists
    try:
        get_template(req.agent_type)
    except KeyError:
        raise HTTPException(400, f"Unknown agent_type: {req.agent_type}")

    # Generate slug
    base_slug = slugify(req.name)
    slug = base_slug
    if db.query(Agent).filter(Agent.slug == slug).first():
        slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"

    # Create agent record (status=building)
    agent = Agent(
        id=str(uuid.uuid4()),
        company_id=company.id,
        slug=slug,
        name=req.name,
        agent_type=req.agent_type,
        website_url=req.website_url,
        forum_url=req.forum_url,
        bluesky_handle=req.bluesky_handle,
        description=req.description,
        config_input=json.dumps(req.config_input),
        status="building",
    )
    db.add(agent)
    db.commit()

    # Crawl website if URL provided (support_qa agents)
    crawl_results = []
    if req.website_url and req.agent_type == "support_qa":
        try:
            agent.status = "crawling"
            db.commit()
            crawl_results = await crawl_website(db, agent.id, req.website_url)
        except Exception as e:
            print(f"Website crawl failed: {e}")

    # Generate spec via Gemini
    try:
        spec = await generate_agent_spec(
            agent_type=req.agent_type,
            name=req.name,
            description=req.description,
            config_input=req.config_input,
        )
        agent.spec = json.dumps(spec)
        agent.status = "ready"
    except Exception as e:
        print(f"Spec generation failed: {e}")
        # Fallback spec so the agent is still usable
        fallback_spec = {
            "version": "1",
            "agent_type": req.agent_type,
            "identity": {"name": req.name, "greeting": f"Hi! I'm {req.name}. How can I help?"},
            "behavior": {
                "system_prompt": f"You are {req.name}, a helpful AI assistant. {req.description}. Additional context: {json.dumps(req.config_input)}",
                "response_style": "concise and helpful",
                "guardrails": ["Stay on topic", "Be helpful and professional"],
            },
            "starter_prompts": ["How can you help me?", "Tell me about your services."],
            "knowledge_config": {"strategy": "rag" if req.agent_type == "support_qa" else "context_injection", "retrieval_instruction": "Use available knowledge."},
        }
        agent.spec = json.dumps(fallback_spec)
        agent.status = "ready"

    db.commit()
    db.refresh(agent)

    return AgentResponse(
        id=agent.id,
        slug=agent.slug,
        name=agent.name,
        agent_type=agent.agent_type,
        description=agent.description,
        website_url=agent.website_url,
        forum_url=agent.forum_url,
        bluesky_handle=agent.bluesky_handle,
        config_input=json.loads(agent.config_input) if agent.config_input else None,
        spec=json.loads(agent.spec) if agent.spec else None,
        status=agent.status,
        created_at=agent.created_at,
        url=f"/a/{agent.slug}",
    )


@router.get("/agents", response_model=list[AgentListItem])
async def list_agents(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company),
):
    """List all agents belonging to the authenticated company."""
    agents = (
        db.query(Agent)
        .filter(Agent.company_id == company.id)
        .order_by(Agent.created_at.desc())
        .all()
    )
    return [
        AgentListItem(
            id=a.id,
            slug=a.slug,
            name=a.name,
            agent_type=a.agent_type,
            status=a.status,
            created_at=a.created_at,
            url=f"/a/{a.slug}",
        )
        for a in agents
    ]


@router.get("/agents/{slug}", response_model=AgentPublicResponse)
async def get_agent(slug: str, db: Session = Depends(get_db)):
    """Get agent public config for the workspace page. No auth required."""
    agent = db.query(Agent).filter(Agent.slug == slug).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    has_knowledge = len(agent.knowledge_files) > 0

    return AgentPublicResponse(
        slug=agent.slug,
        name=agent.name,
        agent_type=agent.agent_type,
        description=agent.description,
        spec=json.loads(agent.spec) if agent.spec else None,
        status=agent.status,
        has_knowledge=has_knowledge,
    )
