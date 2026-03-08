from google import genai
from config import settings
client = genai.Client(api_key=settings.GEMINI_API_KEY)
for m in client.models.list():
    if 'imagen' in m.name.lower():
        print(m.name, getattr(m, 'supported_generation_methods', getattr(m, 'supported_methods', '')))
