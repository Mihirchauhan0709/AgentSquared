"""
Forum auto-answer service — adapter pattern.

Supports multiple forum platforms:
  - custom  : SneakerCo-style API (/api/threads)
  - discourse: Discourse session login (/session + /latest.json + /posts.json)

Logs into the forum, finds unanswered questions,
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


# ═══════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════


async def answer_forum_questions(
    db: Session,
    agent_id: str,
    agent_name: str,
    forum_url: str,
    forum_type: str = "auto",
    forum_credentials: str | None = None,
) -> dict:
    """
    Route to the correct adapter based on forum_type.
    If forum_type is 'auto', try to detect from the URL.
    """
    creds = json.loads(forum_credentials) if forum_credentials else {}

    # Auto-detect forum type
    if forum_type == "auto" or not forum_type:
        forum_type = _detect_forum_type(forum_url)

    if forum_type == "discourse":
        return await _discourse_adapter(db, agent_id, agent_name, forum_url, creds)
    else:
        return await _custom_adapter(db, agent_id, agent_name, forum_url, creds)


def _detect_forum_type(url: str) -> str:
    """Guess forum type from URL patterns."""
    url_lower = url.lower()
    # Discourse instances often have /c/ categories or discourse in the URL
    if "discourse" in url_lower or "/c/" in url_lower:
        return "discourse"
    return "custom"


# ═══════════════════════════════════════════════════════════
# CUSTOM ADAPTER (SneakerCo-style)
# ═══════════════════════════════════════════════════════════


async def _custom_adapter(
    db: Session, agent_id: str, agent_name: str,
    forum_url: str, creds: dict,
) -> dict:
    """SneakerCo-style forum: GET /api/threads, POST /api/threads/:id/answer"""
    base_url = forum_url.rstrip("/")
    if base_url.endswith("/forum"):
        base_url = base_url[: -len("/forum")]

    threads_url = f"{base_url}/api/threads"

    report = _empty_report()
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
    }

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as http:
        # Fetch threads
        try:
            resp = await http.get(threads_url)
            resp.raise_for_status()
            threads = resp.json()
        except Exception as e:
            report["errors"].append(f"Failed to fetch threads: {e}")
            return report

        report["total_threads"] = len(threads)

        # Filter unanswered
        unanswered = [
            t for t in threads
            if not t.get("answer") or str(t["answer"]).strip() == ""
        ]
        report["unanswered_count"] = len(unanswered)

        if not unanswered:
            return report

        # Get knowledge
        knowledge_context = _get_knowledge(db, agent_id, http, base_url)
        if isinstance(knowledge_context, str) and not knowledge_context:
            try:
                kb_resp = await http.get(f"{base_url}/sneakerco-knowledge.md")
                if kb_resp.status_code == 200:
                    knowledge_context = kb_resp.text
            except Exception:
                pass

        # Answer each question
        for thread in unanswered:
            thread_id = thread.get("id")
            title = thread.get("title", thread.get("question", ""))
            details = thread.get("details", thread.get("body", ""))

            answer_text = await _generate_answer(agent_name, knowledge_context, title, details)
            if not answer_text:
                report["errors"].append(f"Gemini error for '{title}'")
                continue

            try:
                post_resp = await http.post(
                    f"{threads_url}/{thread_id}/answer",
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


# ═══════════════════════════════════════════════════════════
# DISCOURSE ADAPTER
# ═══════════════════════════════════════════════════════════


async def _discourse_adapter(
    db: Session, agent_id: str, agent_name: str,
    forum_url: str, creds: dict,
) -> dict:
    """
    Discourse forum adapter:
    1. Login via POST /session (CSRF + cookie)
    2. GET /latest.json → find topics with posts_count == 1
    3. Generate answers with Gemini
    4. POST /posts.json → reply to each topic
    """
    base_url = forum_url.rstrip("/")
    # Ensure protocol
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    # Strip trailing path segments to get the Discourse root
    for suffix in ["/latest", "/top", "/categories", "/c"]:
        if base_url.endswith(suffix):
            base_url = base_url[: -len(suffix)]

    report = _empty_report()
    report["forum_type"] = "discourse"

    print(f"[Discourse] Base URL: {base_url}")
    print(f"[Discourse] Credentials provided: {bool(creds.get('email'))}")

    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
        headers={"Accept": "application/json"},
    ) as http:

        # ── Step 1: Login ──────────────────────────────
        if creds.get("email") and creds.get("password"):
            try:
                # Get CSRF token
                csrf_resp = await http.get(f"{base_url}/session/csrf.json")
                csrf_resp.raise_for_status()
                csrf_token = csrf_resp.json().get("csrf")
                print(f"[Discourse] Got CSRF token: {csrf_token[:20]}...")

                # Login — Discourse requires XMLHttpRequest header for CSRF
                login_resp = await http.post(
                    f"{base_url}/session",
                    headers={
                        "X-CSRF-Token": csrf_token,
                        "X-Requested-With": "XMLHttpRequest",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Origin": base_url,
                        "Referer": f"{base_url}/login",
                    },
                    data={
                        "login": creds["email"],
                        "password": creds["password"],
                    },
                )
                print(f"[Discourse] Login status: {login_resp.status_code}")
                if login_resp.status_code not in (200, 302):
                    report["errors"].append(
                        f"Discourse login failed ({login_resp.status_code}): "
                        f"{login_resp.text[:200]}"
                    )
                    return report
                print(f"[Discourse] Login successful")
            except Exception as e:
                report["errors"].append(f"Discourse login error: {e}")
                return report
        else:
            print("[Discourse] No credentials — trying as public")

        # ── Step 2: Fetch latest topics ────────────────
        try:
            topics_resp = await http.get(f"{base_url}/latest.json")
            topics_resp.raise_for_status()
            data = topics_resp.json()
            topics = data.get("topic_list", {}).get("topics", [])
            print(f"[Discourse] Fetched {len(topics)} topics")
            for t in topics:
                print(f"  - id={t.get('id')} title='{t.get('title')}' "
                      f"posts_count={t.get('posts_count')} reply_count={t.get('reply_count')} "
                      f"pinned={t.get('pinned')} pinned_globally={t.get('pinned_globally')} "
                      f"closed={t.get('closed')} archived={t.get('archived')}")
        except Exception as e:
            report["errors"].append(f"Failed to fetch topics: {e}")
            return report

        report["total_threads"] = len(topics)

        # ── Step 3: Find unanswered topics ─────────────
        # Unanswered = topics with no replies (reply_count == 0 or posts_count <= 1)
        # Skip pinned, closed, and archived topics
        unanswered = [
            t for t in topics
            if (t.get("reply_count", 0) == 0 or t.get("posts_count", 0) <= 1)
            and not t.get("pinned", False)
            and not t.get("pinned_globally", False)
            and not t.get("closed", False)
            and not t.get("archived", False)
        ]
        print(f"[Discourse] Unanswered topics: {len(unanswered)}")
        report["unanswered_count"] = len(unanswered)

        if not unanswered:
            return report

        # ── Step 4: Get knowledge context ──────────────
        knowledge_context = retrieve_knowledge(db, agent_id, "")

        # ── Step 5: Answer each topic ──────────────────
        for topic in unanswered:
            topic_id = topic.get("id")
            title = topic.get("title", "")

            # Fetch the actual post content
            details = ""
            try:
                topic_resp = await http.get(f"{base_url}/t/{topic_id}.json")
                if topic_resp.status_code == 200:
                    topic_data = topic_resp.json()
                    posts = topic_data.get("post_stream", {}).get("posts", [])
                    if posts:
                        details = posts[0].get("cooked", posts[0].get("raw", ""))
            except Exception:
                pass

            # Generate answer
            answer_text = await _generate_answer(agent_name, knowledge_context, title, details)
            if not answer_text:
                report["errors"].append(f"Gemini error for '{title}'")
                continue

            # Post reply
            try:
                # Need fresh CSRF for posting
                csrf_resp = await http.get(f"{base_url}/session/csrf.json")
                csrf_token = csrf_resp.json().get("csrf", "")

                post_resp = await http.post(
                    f"{base_url}/posts.json",
                    headers={
                        "X-CSRF-Token": csrf_token,
                        "Content-Type": "application/json",
                    },
                    json={
                        "topic_id": topic_id,
                        "raw": answer_text,
                    },
                )
                if post_resp.status_code in (200, 201):
                    report["answered"].append({
                        "id": topic_id,
                        "question": title,
                        "answer_preview": answer_text[:200] + ("..." if len(answer_text) > 200 else ""),
                    })
                else:
                    err_detail = post_resp.text[:200]
                    report["errors"].append(f"Failed to post reply for '{title}': {post_resp.status_code} {err_detail}")
            except Exception as e:
                report["errors"].append(f"Failed to post reply for '{title}': {e}")

    return report


# ═══════════════════════════════════════════════════════════
# SHARED HELPERS
# ═══════════════════════════════════════════════════════════


def _empty_report() -> dict:
    return {
        "forum_type": "unknown",
        "total_threads": 0,
        "unanswered_count": 0,
        "answered": [],
        "errors": [],
    }


def _get_knowledge(db: Session, agent_id: str, http=None, base_url=None) -> str:
    """Get knowledge context from stored knowledge files."""
    return retrieve_knowledge(db, agent_id, "")


async def _generate_answer(
    agent_name: str, knowledge_context: str,
    question_title: str, question_details: str,
) -> str | None:
    """Generate an answer using Gemini."""
    prompt = ANSWER_PROMPT.format(
        agent_name=agent_name,
        knowledge_context=knowledge_context[:30_000],
        question_title=question_title,
        question_details=question_details,
    )
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return None


def format_report(report: dict) -> str:
    """Format the action report as a readable chat message."""
    lines = []

    forum_type = report.get("forum_type", "forum")
    type_label = "Discourse" if forum_type == "discourse" else "Forum"

    if not report["unanswered_count"]:
        return f"✅ All questions on your {type_label} are already answered! Nothing to do."

    if report["answered"]:
        lines.append(f"✅ I answered **{len(report['answered'])}** question(s) on your {type_label}:\n")
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
