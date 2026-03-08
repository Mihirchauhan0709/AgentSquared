from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Request models ──────────────────────────────────────────────


class CreateAgentRequest(BaseModel):
    agent_type: str = Field(..., pattern="^(support_qa|social_marketing)$")
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    website_url: Optional[str] = None
    forum_url: Optional[str] = None
    config_input: dict = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)


# ── Response models ─────────────────────────────────────────────


class AgentResponse(BaseModel):
    id: str
    slug: str
    name: str
    agent_type: str
    description: str
    website_url: Optional[str] = None
    forum_url: Optional[str] = None
    config_input: Optional[dict] = None
    spec: Optional[dict] = None
    status: str
    created_at: datetime
    url: str  # computed: /a/{slug}

    class Config:
        from_attributes = True


class AgentListItem(BaseModel):
    """Compact agent info for the dashboard list."""
    id: str
    slug: str
    name: str
    agent_type: str
    status: str
    created_at: datetime
    url: str


class AgentPublicResponse(BaseModel):
    """What the workspace page loads — no internal IDs."""
    slug: str
    name: str
    agent_type: str
    description: str
    spec: Optional[dict] = None
    status: str
    has_knowledge: bool = False


class KnowledgeFileResponse(BaseModel):
    id: str
    filename: str
    mime_type: Optional[str] = None
    source_type: str = "upload"

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateInfo(BaseModel):
    agent_type: str
    label: str
    description: str
    fields: list[TemplateField]


class TemplateField(BaseModel):
    name: str
    label: str
    type: str = "text"  # text | textarea
    placeholder: str = ""
    required: bool = True


# Rebuild TemplateInfo so the forward ref to TemplateField resolves
TemplateInfo.model_rebuild()
