"""
Forum auto-answer service.

Logs into a company's forum, finds unanswered questions,
generates answers using Gemini + the agent's knowledge base,
and posts them back.
"""

import json
import httpx
from google import genai
from sqlalchemy.orm import Session

from config import settings
from services.knowledge import retrieve_knowledge


client = genai.Client(api_key=settings.GEMINI_API_KEY)


ANSWER_PROMPT = """You are {agent_name}, an AI support assistant for a company.

Use ONLY the following company knowledge base to answer the customer's question.
If the knowledge base does not contain the answer, say so honestly.
Be concise, friendly, and professional. Do NOT make up information.

COMPANY KNOWLEDGE BASE:
---
{knowledge_context}
---

CUSTOMER QUESTION:
Title: {question_title}
Details: {question_details}

Write a helpful, accurate answer (2-4 paragraphs max). Do not include a greeting or sign-off."""


async def answer_forum_questions(
    db: Session,
    agent_id: str,
    agent_name: str,
    forum_url: str,
    forum_credentials: dict | None = None,
) -> dict:
    """
    Autonomous forum answering:
    1. Fetch threads from forum API
    2. Filter unanswered ones
    3. Generate answers using Gemini + knowledge base
    4. Post answers back

    Returns a report dict with answered questions and any errors.
    """
    # Normalize forum URL — extract base URL
    base_url = forum_url.rstrip("/")
    if base_url.endswith("/forum"):
        base_url = base_url[: -len("/forum")]

    # Build API URL
    threads_url = f"{base_url}/api/threads"

    report = {
        "total_threads": 0,
        "unanswered_count": 0,
        "answered": [],
        "errors": [],
    }

    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",  # Skip ngrok interstitial
    }

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as http:
        # 1. Fetch all threads
        try:
            resp = await http.get(threads_url)
            resp.raise_for_status()
            threads = resp.json()
        except Exception as e:
            report["errors"].append(f"Failed to fetch threads: {e}")
            return report

        report["total_threads"] = len(threads)

        # 2. Filter unanswered threads
        unanswered = [
            t for t in threads
            if not t.get("answer") or str(t["answer"]).strip() == ""
        ]
        report["unanswered_count"] = len(unanswered)

        if not unanswered:
            return report

        # 3. Get knowledge context from the agent's knowledge base
        knowledge_context = retrieve_knowledge(db, agent_id, "")

        # If no knowledge files stored, try fetching the forum's knowledge base directly
        if not knowledge_context:
            try:
                kb_resp = await http.get(f"{base_url}/sneakerco-knowledge.md")
                if kb_resp.status_code == 200:
                    knowledge_context = kb_resp.text
            except Exception:
                pass

        # 4. For each unanswered question, generate and post answer
        for thread in unanswered:
            thread_id = thread.get("id")
            title = thread.get("title", thread.get("question", ""))
            details = thread.get("details", thread.get("body", ""))

            # Generate answer with Gemini
            prompt = ANSWER_PROMPT.format(
                agent_name=agent_name,
                knowledge_context=knowledge_context[:30_000],  # Cap context
                question_title=title,
                question_details=details,
            )

            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                answer_text = response.text.strip()
            except Exception as e:
                report["errors"].append(f"Gemini error for '{title}': {e}")
                continue

            # Post the answer back to the forum
            answer_url = f"{threads_url}/{thread_id}/answer"
            try:
                post_resp = await http.post(
                    answer_url,
                    json={"answer": answer_text},
                )
                post_resp.raise_for_status()

                report["answered"].append({
                    "id": thread_id,
                    "question": title,
                    "answer_preview": answer_text[:200] + ("..." if len(answer_text) > 200 else ""),
                })
            except Exception as e:
                report["errors"].append(f"Failed to post answer for '{title}': {e}")

    return report


def format_report(report: dict) -> str:
    """Format the action report as a readable chat message."""
    lines = []

    if not report["unanswered_count"]:
        return "✅ All questions on the forum are already answered! Nothing to do."

    if report["answered"]:
        lines.append(f"✅ I answered **{len(report['answered'])}** question(s) on your forum:\n")
        for i, item in enumerate(report["answered"], 1):
            lines.append(f"**{i}. {item['question']}**")
            lines.append(f"   → {item['answer_preview']}\n")

    remaining = report["unanswered_count"] - len(report["answered"])
    if remaining > 0:
        lines.append(f"⚠️ {remaining} question(s) could not be answered.")

    if report["errors"]:
        lines.append("\n**Errors:**")
        for err in report["errors"]:
            lines.append(f"- {err}")

    return "\n".join(lines)
