# SportsWorld

A multi-sport app: pick a sport, see today's games, get an AI-generated match analysis per game. Football-only MVP first; other sports and agents come later (see the plan at `/Users/barkagan/.claude/plans/ancient-wishing-emerson.md`).

## Stack

- **Backend:** Django + Django REST Framework, PostgreSQL
- **Frontend:** React + Vite
- **AI:** Claude API (Football Agent — Phase 1)
- **Dev environment:** Docker Compose (one Dockerfile per tier)

## Running locally

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY once you reach Phase 1

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/api/health/
- Postgres: localhost:5432

## Structure

```
backend/    Django project (games app, football_agent app)
frontend/   React + Vite SPA
```

Status: Phase 0 (dockerized skeleton) — a health-check round trip from frontend to backend. Phase 1 (mock data, football UI, live Football Agent) is next.
