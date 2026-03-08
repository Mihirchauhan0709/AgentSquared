from db.database import engine, Base
from db.models import Agent, KnowledgeFile, ChatMessage, SocialMention  # noqa: F401 — import to register models


def init_db():
    """Create all tables. Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("✅ Database tables created.")
