# Agent Squared

A no-code platform for creating config-driven AI business agents, powered by Gemini.

## Quick Start

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env        # Add your GEMINI_API_KEY
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend (Next.js)

```bash
cd frontend
npm install                 # Already done by create-next-app
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Agent Types

| Type | Description | Knowledge |
|---|---|---|
| `support_qa` | Customer support Q&A agent | RAG over uploaded docs |
| `social_marketing` | Social media content generator | Business context in prompt |

## Architecture

```
One runtime, two templates.
Every agent = DB row + JSON config + optional files.
agent_type selects prompt template + knowledge strategy.
No code is generated per agent.
```

## Project Structure

```
Agent-squared/
├── backend/          FastAPI + SQLite + Gemini services
│   ├── routers/      API endpoints
│   ├── services/     Gemini spec gen, chat, extraction, RAG
│   ├── templates/    Agent type configurations
│   └── db/           SQLAlchemy models
└── frontend/         Next.js App Router
    └── src/app/      Pages: /, /build, /success, /a/[slug]
```
