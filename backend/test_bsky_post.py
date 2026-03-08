import asyncio
from db.database import SessionLocal
from db.models import Agent
from services.social_marketing import generate_and_post_marketing_content
import logging

logging.basicConfig(level=logging.INFO)

async def run():
    print("Connecting to DB...")
    db = SessionLocal()
    agent = db.query(Agent).filter(Agent.slug == 'sneakerco-marketing').first()
    if not agent:
        print("Agent not found")
        return
        
    print(f"Testing post generation & upload for {agent.name}...")
    try:
        result = await generate_and_post_marketing_content(
            agent.name,
            "draft a promotional post for our 20% off spring sale",
            "Context: Sell red sneakers."
        )
        print("Result:", result)
    except Exception as e:
        print("CATCHED EXT:", e)

if __name__ == "__main__":
    asyncio.run(run())
