import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Agent Squared"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agent_squared.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE_MB: int = 10
    MAX_FILES_PER_AGENT: int = 5
    MAX_CRAWL_PAGES: int = 20
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "agent-squared-hackathon-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24


settings = Settings()
