import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Company(Base):
    __tablename__ = "companies"

    id = Column(Text, primary_key=True, default=_uuid)
    email = Column(Text, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    company_name = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)

    agents = relationship("Agent", back_populates="company", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Text, primary_key=True, default=_uuid)
    company_id = Column(Text, ForeignKey("companies.id"), nullable=False)
    slug = Column(Text, unique=True, nullable=False, index=True)
    name = Column(Text, nullable=False)
    agent_type = Column(Text, nullable=False)  # support_qa | social_marketing
    website_url = Column(Text, nullable=True)  # Company website to crawl
    forum_url = Column(Text, nullable=True)  # Company forum for auto-answering
    description = Column(Text, nullable=False)
    config_input = Column(Text, nullable=True)  # JSON — raw form inputs
    spec = Column(Text, nullable=True)  # JSON — Gemini-generated agent spec
    status = Column(Text, nullable=False, default="building")
    created_at = Column(DateTime, default=_now)

    company = relationship("Company", back_populates="agents")
    knowledge_files = relationship("KnowledgeFile", back_populates="agent", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="agent", cascade="all, delete-orphan")


class KnowledgeFile(Base):
    __tablename__ = "knowledge_files"

    id = Column(Text, primary_key=True, default=_uuid)
    agent_id = Column(Text, ForeignKey("agents.id"), nullable=False)
    filename = Column(Text, nullable=False)  # Original filename or page title
    file_path = Column(Text, nullable=True)  # Local path (for uploads, null for web)
    source_type = Column(Text, nullable=False, default="upload")  # upload | web_crawl
    source_url = Column(Text, nullable=True)  # Original URL (for crawled pages)
    mime_type = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)

    agent = relationship("Agent", back_populates="knowledge_files")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Text, primary_key=True, default=_uuid)
    agent_id = Column(Text, ForeignKey("agents.id"), nullable=False)
    session_id = Column(Text, nullable=False, index=True)
    role = Column(Text, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)

    agent = relationship("Agent", back_populates="chat_messages")
