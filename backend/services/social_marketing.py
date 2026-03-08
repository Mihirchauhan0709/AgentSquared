import uuid
import os
import json
import base64
from google import genai
from config import settings
from services.bluesky_client import post_with_image

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Define frontend public dir for saving images so Next.js can serve them
FRONTEND_PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "public", "generated")
os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)

MARKETING_PROMPT = """You are a social media marketing expert for a brand called {agent_name}.
The user wants you to create a Bluesky post about the following topic:
"{topic}"

BRAND KNOWLEDGE BASE/CONTEXT:
---
{knowledge_context}
---

Generate two things:
1. The text of the social media post (max 280 characters). Make it engaging, punchy, and on-brand.
2. A highly detailed prompt for an AI image generator (Imagen 3) to create an accompanying promotional image (unless the user implies they provided one). The image prompt should be very descriptive, cinematic, professional, and visually compelling.

Return ONLY valid JSON:
{{
  "post_text": "...",
  "image_prompt": "..."
}}"""

async def generate_and_post_marketing_content(agent_name: str, topic: str, knowledge_context: str, custom_image_b64: str = None) -> dict:
    """
    Generate post text and image, post to Bluesky, and return info for chat.
    """
    prompt = MARKETING_PROMPT.format(
        agent_name=agent_name,
        topic=topic,
        knowledge_context=knowledge_context[:20_000] if knowledge_context else "No specific context provided."
    )
    
    # 1. Generate text and image prompt
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )
    
    # Parse JSON safely
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    
    try:
        parsed = json.loads(text.strip())
        post_text = parsed.get("post_text", f"Check out our latest update! #{agent_name.replace(' ', '')}")
        image_prompt = parsed.get("image_prompt", "A high quality promotional image product shot.")
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        post_text = f"Check out our latest update! #{agent_name.replace(' ', '')}"
        image_prompt = "A high quality promotional image product shot."
        
    # 2. Get image bytes (either from user or generate with Imagen)
    if custom_image_b64:
        # Strip potential data URI prefix if present
        if "," in custom_image_b64:
            custom_image_b64 = custom_image_b64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(custom_image_b64)
        except Exception as e:
            print(f"Error decoding custom image: {e}")
            return {"success": False, "error": f"Failed to decode provided image: {e}"}
    else:
        # Generate Image with Imagen
        try:
            image_result = client.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=image_prompt,
                config=dict(
                    number_of_images=1,
                    aspect_ratio="16:9",
                    output_mime_type="image/jpeg",
                )
            )
            generated_image = image_result.generated_images[0]
            image_bytes = generated_image.image.image_bytes
        except Exception as e:
            print(f"Error generating image: {e}")
            return {"success": False, "error": f"Failed to generate image: {e}"}

    # 3. Save Image locally for chat preview
    filename = f"post_{uuid.uuid4().hex[:8]}.jpg"
    local_path = os.path.join(FRONTEND_PUBLIC_DIR, filename)
    
    with open(local_path, "wb") as f:
        f.write(image_bytes)
        
    public_url = f"/generated/{filename}"
    
    # 4. Post to Bluesky
    bsky_resp = post_with_image(text=post_text, image_bytes=image_bytes, alt_text=image_prompt[:100])
    
    if not bsky_resp.get("success"):
        return {
            "success": False, 
            "error": f"Failed to post to Bluesky: {bsky_resp.get('error')}", 
            "preview_url": public_url, 
            "post_text": post_text
        }
        
    return {
        "success": True,
        "post_text": post_text,
        "preview_url": public_url,
        "bsky_uri": bsky_resp.get("uri")
    }
