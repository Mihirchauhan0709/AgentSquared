import sys
from db.database import SessionLocal
from db.models import Agent, KnowledgeFile

db = SessionLocal()
agent = db.query(Agent).filter(Agent.slug == 'sneakerco').first()

if not agent:
    print("Agent not found!")
    sys.exit(1)

with open("sneakerco-knowledge.md", "r") as f:
    text_content = f.read()

kf = KnowledgeFile(
    agent_id=agent.id,
    filename="sneakerco-knowledge.md",
    extracted_text=text_content,
    mime_type="text/markdown",
    source_type="upload"
)

db.add(kf)
db.commit()
print("Successfully added knowledge base to database!")
