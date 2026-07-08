# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SportsWorld: pick a sport, see today's games, get an AI-generated match analysis per game. Football-only MVP first (Phase 1); other sports, more agents, and a multi-sport theme system come later. The full phased plan (data model, Football Agent design, future phases) lives at `/Users/barkagan/.claude/plans/ancient-wishing-emerson.md` — read it before making architectural changes.

**Current status: Phase 0.** Only a dockerized skeleton exists — a health-check round trip from the frontend to the backend. `games` and `football_agent` are installed Django apps with no models yet; the frontend is a single placeholder `App.tsx`. Phase 1 (mock data, the football UI, a live Claude-backed Football Agent) has not been built.

## Stack

- **Backend:** Django + Django REST Framework, PostgreSQL (`backend/`)
- **Frontend:** React + Vite, TypeScript (`frontend/`)
- **AI:** Claude API via the `anthropic` Python SDK + Pydantic schemas (Football Agent, Phase 1 onward)
- **Dev environment:** Docker Compose, one Dockerfile per tier — this is a dev-only setup (bind-mounted source, Django/Vite dev servers); there is no production build yet

## Commands

All commands assume Docker Compose is running (`docker compose up --build`, from the repo root, after `cp .env.example .env`).

```bash
# Backend: run inside the backend container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py makemigrations <app>
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Frontend: runs automatically via the container's dev command (npm run dev -- --host 0.0.0.0);
# to run one-off frontend commands (e.g. adding a package) exec into the container instead of
# running npm locally, since node/npm are not installed on the host in this environment:
docker compose exec frontend npm install <package>
```

No test suite exists yet in either app. There is no `manage.py test` config or frontend test runner configured — add one (and its command here) when tests are introduced.

Ports: frontend `localhost:5173`, backend `localhost:8000` (health check at `/api/health/`), Postgres `localhost:5432`.

## Architecture

**Django app split** (`backend/sportsworld/` is the project config package — settings, root `urls.py`; apps live as siblings of it, e.g. `backend/games/`, `backend/football_agent/`, not nested inside `sportsworld/`):

- `games` — the data layer: teams, players, fixtures, results, injuries, head-to-head (Phase 1). Head-to-head is derived by querying prior meetings between two team IDs, not a stored join table (see the plan, section 3.1).
- `football_agent` — the Claude-backed logic: a `MatchAnalysis` model (persisted so each game's analysis is generated once, not on every request), an `AnthropicService` wrapper meant to be reused by future sport/task agents (Stats, News, Prediction — Phase 2), and a `FootballAgentService` that builds match context from the ORM and calls Claude via `client.messages.parse()` with a Pydantic output schema.
- Root API is mounted at `/api/` (`sportsworld/urls.py` → `games.urls`); each app owns its own `urls.py`.

**Config:** `sportsworld/settings.py` reads all runtime config from environment variables (Postgres connection, `DJANGO_SECRET_KEY`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, CORS origin for the Vite dev server) with dev-safe defaults — no separate settings-per-environment module yet.

**Frontend:** currently a single `App.tsx` that fetches the backend health check. Phase 1 replaces this with routed pages (sport select → today's games → game detail) and a `sportsTheme` object that drives per-sport background/accent color via CSS custom properties — the theme's data shape is meant to be extended (new sport keys) rather than restructured when non-football sports are added.

**Data flow for a game's AI analysis (Phase 1 design):** the frontend requests `/api/games/<id>/analysis/`; the backend checks for an existing `MatchAnalysis` row first, and only calls Claude on a cache miss. The Claude call is a single structured-output request (not a tool-use loop) — all data gathering happens in Django before the call. Claude's returned win/draw/loss probabilities are not guaranteed to sum to 100 (structured outputs don't enforce cross-field numeric constraints), so the service must renormalize them before persisting.
