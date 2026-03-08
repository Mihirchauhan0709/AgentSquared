import sys
from db.database import SessionLocal
from db.models import Agent
import uuid

db = SessionLocal()
base_agent = db.query(Agent).filter(Agent.slug == 'sneakerco').first()

if not base_agent:
    print("Could not find base agent. Checking any agent.")
    base_agent = db.query(Agent).first()

if not base_agent:
    print("No agents in db.")
    sys.exit(1)

# Check if it already exists
existing = db.query(Agent).filter(Agent.slug == 'sneakerco-marketing').first()
if existing:
    print("Success:", existing.slug)
    sys.exit(0)

new_agent = Agent(
    id=str(uuid.uuid4()),
    company_id=base_agent.company_id,
    slug="sneakerco-marketing",
    name="SneakerCo Marketing",
    agent_type="social_marketing",
    bluesky_handle=base_agent.bluesky_handle or "test.bsky.social",
    description="SneakerCo Marketing agent",
    status="active",
)
db.add(new_agent)
db.commit()
print("Success:", new_agent.slug)
