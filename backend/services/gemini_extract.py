"""
Gemini service: extract text content from uploaded files.

Uses Gemini's multimodal capabilities to understand PDFs, images, etc.
"""

import base64
from pathlib import Path

from google import genai
from config import settings


client = genai.Client(api_key=settings.GEMINI_API_KEY)

EXTRACTION_PROMPT = """Extract all meaningful text content from this file.
If it's a document, extract the full text.
If it's an image or screenshot, describe what you see and extract any visible text.
Return only the extracted content, no commentary."""


async def extract_text_from_file(file_path: str, mime_type: str) -> str:
    """Use Gemini to extract text from a file (PDF, image, etc.)."""
    path = Path(file_path)

    if not path.exists():
        return ""

    file_bytes = path.read_bytes()
    b64_data = base64.b64encode(file_bytes).decode("utf-8")

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            {
                "parts": [
                    {"text": EXTRACTION_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_data,
                        }
                    },
                ]
            }
        ],
    )

    return response.text or ""
