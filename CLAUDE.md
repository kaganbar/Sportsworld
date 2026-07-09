# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SportsWorld: pick a sport, see today's games, get an AI-generated match analysis per game. Football shipped first (Phase 1); basketball and tennis followed (Phase 2, "go wide" before deepening any one sport's agent stack). The full original phased plan (data model, Football Agent design) lives at `/Users/barkagan/.claude/plans/ancient-wishing-emerson.md` — read it for Phase 0/1 background, though Phase 2 already extends past what it specifies.

**Current status: Phase 2 done.** Football, basketball, and tennis all have seeded data, a working UI, and an AI agent. Every agent runs in **mock mode by default** (`AI_AGENT_MODE`, see Config below) so the app is fully usable with zero Anthropic API cost; set `ANTHROPIC_API_KEY` and it switches to real Claude calls automatically. Next likely phases (not yet built): a Tauri desktop shell around the existing React/Vite frontend, deepening any one sport's agent stack (Stats/News/Prediction/Master), or Transfer Center — see memory for the current decision on ordering.

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

- `games` — the sport-agnostic core data layer for **team sports** (football + basketball): teams, players, fixtures, results, injuries, head-to-head. A `sport` field on `Team`/`Game` distinguishes football from basketball; both share the same tables. Head-to-head is derived by querying prior meetings between two team IDs, not a stored join table.
- `basketball` — the one piece of schema that's genuinely basketball-specific: `QuarterScore` (per-quarter score breakdown), FK'd to `games.Game`. Everything else (teams, players, lineups, injuries, H2H) is inherited from `games`.
- `tennis` — fully separate from `games`, since tennis is player-vs-player, not team-vs-team: `TennisPlayer`, `TennisMatch` (doubles as both a fixture and, once finished, a historical record), `TennisSet`. Its own `services.py` mirrors `games/services.py`'s recent-form/H2H query pattern, keyed on a player instead of a team.
- `football_agent`, `basketball_agent`, `tennis_agent` — one Claude-backed agent app per sport, each with its own `MatchAnalysis`-style model (basketball/tennis use a 2-way win probability, no draw), a Pydantic schema, and a `services.py` that builds match context from the ORM and calls `ai_common.service.call_agent()`.
- `ai_common` — shared plumbing (not a Django app — no models, just an importable package) used by every agent: the mock/live branching, the `client.messages.parse()` call, and the refusal/`None` guards. Each agent supplies its own system prompt, schema, context, and mock-response factory.
- Root API is mounted at `/api/` (`sportsworld/urls.py` includes each app's own `urls.py`); routes are namespaced per sport, e.g. `/api/games/today/?sport=football|basketball`, `/api/basketball/games/<id>/`, `/api/tennis/matches/<id>/`.

**Config:** `sportsworld/settings.py` reads all runtime config from environment variables (Postgres connection, `DJANGO_SECRET_KEY`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, CORS origin for the Vite dev server) with dev-safe defaults — no separate settings-per-environment module yet. `AI_AGENT_MODE` (`mock`/`live`, auto-defaults to `mock` when no API key is set) controls whether every agent calls Claude for real or returns a hardcoded, schema-shaped response — see `ai_common/service.py`.

**Frontend:** routed pages per sport (sport select → today's games/matches → detail), sharing `ThemeLayout` (reads a `sportsTheme` entry per sport key to set CSS custom properties for background/accent) and a generalized `AiAnalysisPanel` (takes a fetch function and a function mapping an agent's analysis to probability segments, so it renders football's 3-way split and basketball/tennis's 2-way split without duplicating the loading/error/summary/key-factors UI). The theme data shape is meant to be extended (new sport keys) rather than restructured as more sports are added.

**Data flow for a game's AI analysis:** the frontend requests `/api/<sport-prefix>/.../analysis/`; the backend checks for an existing `MatchAnalysis` row first, and only calls Claude (or the mock factory) on a cache miss. Each call is a single structured-output request (not a tool-use loop) — all data gathering happens in Django before the call. Probabilities aren't guaranteed to sum to 100 (structured outputs don't enforce cross-field numeric constraints), so each agent's service renormalizes them before persisting.
