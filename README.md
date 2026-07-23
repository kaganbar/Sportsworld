[README_SportsWorld.md](https://github.com/user-attachments/files/30289534/README_SportsWorld.md)
# SportsWorld

A multi-sport platform: pick a sport, see today's live games, and get AI-generated analysis, predictions, and news for each one. Started as a football-only MVP and grew into a multi-agent AI system covering football, basketball, and tennis — with transfer rumors, news, and cross-sport predictions layered on top.

> **Status note:** this README was out of date for a while (it used to say "Phase 0" from the very first prototype). It now reflects the actual current state of the project.

## What it does

- Shows today's real fixtures for football, basketball, and tennis, pulled from a live scraper — not mock data
- Generates AI match analysis per game via dedicated AI agents (one per sport), with results cached so repeat views don't re-trigger a paid API call
- Ticks scores live over WebSocket as games progress
- Renders each sport in a 3D scene with animated, team-colored player models
- Surfaces transfer rumors and sports news, deduplicated and summarized
- A "Master Agent" can synthesize insight across all of the above (predictions, stats, news, transfers) in a single query, using a tool-use loop to decide which specialized agent(s) to call
- Fully Hebrew/RTL-supported UI with a translation layer
- Google OAuth + JWT authentication

## Architecture

The project went through two real pivots, both intentional and both documented in `PROJECT_ROADMAP.md` / `ARCHITECTURE.md`:

1. **Backend:** Django → **NestJS + Prisma + PostgreSQL** (current, actively developed). The original Django backend (`backend/`) still runs but is no longer where new work happens.
2. **Frontend:** Vite/React → **Next.js (App Router) + Tailwind + shadcn/ui** (`frontend-next/`, current). The original Vite frontend (`frontend/`) is kept running until the Next.js version reaches full parity.

| Layer | Technology |
|---|---|
| Backend | NestJS, Prisma ORM, PostgreSQL |
| Frontend | Next.js (App Router), Tailwind CSS, shadcn/ui |
| Real-time | WebSocket (custom `ws` server), Redis pub/sub (for multi-instance fan-out) |
| AI | Anthropic Claude API — 8 specialized agents (Football, Basketball, Tennis, General Sports, Transfer, Statistics, News, Prediction) plus a Master Agent that orchestrates the others via a tool-use loop |
| Data | Live scraper against 365scores.com (scores/fixtures), Transfermarkt (transfer rumors), NewsAPI.org (sports news) |
| Auth | Passport.js — Google OAuth 2.0 + JWT |
| 3D | three.js / React Three Fiber — rigged, animated player models per sport |
| Caching / Rate limiting | Redis — read-through cache for hot endpoints, fixed-window rate limiting on AI-calling endpoints |
| Testing | Jest (backend, 31 tests) + Vitest/Testing Library (frontend, 16 tests) |
| Deployment (prepared) | Vercel (frontend) + Railway (backend, PostgreSQL, Redis) |

See `ARCHITECTURE.md` for the full design rationale (including *why* NestJS over Django, *why* Redis pub/sub instead of in-process state, and how the Master Agent's tool-use loop is scoped and cost-bounded), and `PROJECT_ROADMAP.md` for the phase-by-phase build history and what's explicitly still deferred (real player lineups/rosters, additional scraper sources, a second sport-data provider, the deferred Tauri desktop shell).

## Running locally

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY to enable live AI agent calls (mock mode works without it)

docker compose up --build
```

- Frontend (Next.js): http://localhost:3000
- Backend (NestJS): http://localhost:8001
- Legacy Django backend: http://localhost:8000/api/health/
- PostgreSQL: localhost:5432

## Testing

```bash
# Backend
cd backend-nest && npm test

# Frontend
cd frontend-next && npm test
```

## Deployment

Deployment is fully prepared but not yet live — see `DEPLOYMENT.md` for the complete runbook (Railway for backend/Postgres/Redis, Vercel for the frontend, environment variable checklist, and the Google OAuth credential setup that's still pending on the account side).

## Known limitations (by design, not oversights)

- Real lineups/rosters aren't available yet — the scraper currently only exposes team-level data
- Only one live-scores source (365scores.com) is wired in; the scraper interface is source-agnostic and built to support more
- No kit textures or club crests on the 3D players — deliberately avoided (trademarked assets); team identity is conveyed through color only
- AI agents default to mock mode unless `ANTHROPIC_API_KEY` is set, to keep costs bounded during development
