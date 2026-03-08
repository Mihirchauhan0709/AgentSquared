"""
Gemini service: chat runtime.

Builds a system prompt from the agent spec + knowledge context, then streams
a response from Gemini.
"""

import json
from google import genai
from config import settings


client = genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_system_prompt(spec: dict, knowledge_context: str = "") -> str:
    """Assemble the full system prompt from spec + retrieved knowledge."""
    base = spec.get("behavior", {}).get("system_prompt", "You are a helpful assistant.")
    style = spec.get("behavior", {}).get("response_style", "")
    guardrails = spec.get("behavior", {}).get("guardrails", [])

    parts = [base]

    if style:
        parts.append(f"\nResponse style: {style}")

    if guardrails:
        parts.append("\nGuardrails:")
        for g in guardrails:
            parts.append(f"- {g}")

    if knowledge_context:
        parts.append(
            "\n\nRelevant knowledge from uploaded documents:\n"
            "---\n"
            f"{knowledge_context}\n"
            "---\n"
            "Use the above knowledge to answer the user's question. "
            "Cite the source when applicable."
        )

    return "\n".join(parts)


def _build_chat_history(messages: list[dict]) -> list[dict]:
    """Convert DB messages into Gemini-compatible content list."""
    history = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        history.append({"role": role, "parts": [{"text": msg["content"]}]})
    return history


async def chat_with_agent(
    spec: dict,
    user_message: str,
    chat_history: list[dict],
    knowledge_context: str = "",
) -> str:
    """Send a message and get a response (non-streaming for MVP simplicity)."""
    system_prompt = _build_system_prompt(spec, knowledge_context)

    # Build contents: system instruction as first user turn, then history, then new message
    contents = _build_chat_history(chat_history)
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
        ),
    )

    return response.text


async def chat_with_agent_stream(
    spec: dict,
    user_message: str,
    chat_history: list[dict],
    knowledge_context: str = "",
):
    """Stream a response from Gemini. Yields text chunks."""
    system_prompt = _build_system_prompt(spec, knowledge_context)

    contents = _build_chat_history(chat_history)
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    response = client.models.generate_content_stream(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
        ),
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text
