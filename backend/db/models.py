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
    agent_type = Column(Text, nullable=False)  # support_qa | social_marketing | social_monitor
    website_url = Column(Text, nullable=True)  # Company website to crawl
    bluesky_handle = Column(Text, nullable=True)  # e.g. brand.bsky.social
    forum_url = Column(Text, nullable=True)  # Company forum for auto-answering
    description = Column(Text, nullable=False)
    config_input = Column(Text, nullable=True)  # JSON — raw form inputs
    spec = Column(Text, nullable=True)  # JSON — Gemini-generated agent spec
    status = Column(Text, nullable=False, default="building")
    created_at = Column(DateTime, default=_now)

    company = relationship("Company", back_populates="agents")
    knowledge_files = relationship("KnowledgeFile", back_populates="agent", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="agent", cascade="all, delete-orphan")
    social_mentions = relationship("SocialMention", back_populates="agent", cascade="all, delete-orphan")


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


class SocialMention(Base):
    __tablename__ = "social_mentions"

    id = Column(Text, primary_key=True, default=_uuid)
    agent_id = Column(Text, ForeignKey("agents.id"), nullable=False)
    platform = Column(Text, nullable=False, default="twitter")  # twitter | instagram | etc.
    author = Column(Text, nullable=False)       # Display name
    author_handle = Column(Text, nullable=False)  # @handle
    text = Column(Text, nullable=False)         # The tweet/post text
    sentiment = Column(Text, nullable=True)     # complaint | question | praise | spam
    suggested_reply = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="pending")  # pending | approved | ignored
    
    # Platform-specific IDs for real-time replies
    external_id = Column(Text, nullable=True) # tweet_id or bluesky_uri
    post_cid = Column(Text, nullable=True)     # For Bluesky
    post_uri = Column(Text, nullable=True)     # For Bluesky
    root_cid = Column(Text, nullable=True)     # Thread root
    root_uri = Column(Text, nullable=True)     # Thread root
    
    created_at = Column(DateTime, default=_now)

    agent = relationship("Agent", back_populates="social_mentions")
