# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SportsWorld: pick a sport, see today's games, get an AI-generated match analysis per game — now Hebrew-first with live-updating scores and immersive 3D backgrounds. Football shipped first (Phase 1); basketball and tennis followed (Phase 2, "go wide" before deepening any one sport's agent stack); Phase 3 added Hebrew/RTL-as-default, a name-translation layer, real-time WebSocket score ticking, and React Three Fiber backgrounds. The full original phased plan (data model, Football Agent design) lives at `/Users/barkagan/.claude/plans/ancient-wishing-emerson.md` — read it for Phase 0/1 background only; Phases 2-3 extend well past what it specifies. The Phase 3 plan (`/Users/barkagan/.claude/plans/bubbly-shimmying-tiger.md`) has the concrete design for the translation layer, Channels/Redis wiring, and the R3F scene approach.

**Current status: Phase 3 done.** Football, basketball, and tennis all have seeded data, a working UI, an AI agent, live WebSocket score ticking, and (football/basketball only) a 3D animated background. Every agent runs in **mock mode by default** (`AI_AGENT_MODE`, see Config below) so the app is fully usable with zero Anthropic API cost; set `ANTHROPIC_API_KEY` and it switches to real Claude calls automatically. Hebrew is the default UI language (EN/HE toggle still works). Next likely phases (not yet built): a Tauri desktop shell around the existing React/Vite frontend, a full Baseball/Volleyball build (currently nav-only placeholders under "Other Sports"), deepening any one sport's agent stack (Stats/News/Prediction/Master), or Transfer Center — see memory for the current decision on ordering.

## Stack

- **Backend:** Django + Django REST Framework, PostgreSQL, Django Channels + Redis (live WebSocket ticking) (`backend/`)
- **Frontend:** React + Vite, TypeScript, `@react-three/fiber`/`@react-three/drei` (pinned to the v8/three-r169 line — v9 requires React 19, this app is on React 18) (`frontend/`)
- **AI:** Claude API via the `anthropic` Python SDK + Pydantic schemas (Football Agent, Phase 1 onward)
- **Dev environment:** Docker Compose, one Dockerfile per tier — this is a dev-only setup (bind-mounted source, Django/Vite dev servers); there is no production build yet. Five services: `db`, `redis`, `backend`, `live_ticker` (a second process on the same backend image, runs `run_live_ticker`), `frontend`.

## Commands

All commands assume Docker Compose is running (`docker compose up --build`, from the repo root, after `cp .env.example .env`).

```bash
# Backend: run inside the backend container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py makemigrations <app>
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py seed_data       # reseeds football/basketball/tennis + Hebrew translations
docker compose logs live_ticker                                # watch the simulated live-tick loop

# Frontend: runs automatically via the container's dev command (npm run dev -- --host 0.0.0.0);
# to run one-off frontend commands (e.g. adding a package) exec into the container instead of
# running npm locally, since node/npm are not installed on the host in this environment:
docker compose exec frontend npm install <package>
docker compose exec frontend npx tsc -b                        # typecheck (the app's own `npm run build` also runs this)
```

No test suite exists yet in either app. There is no `manage.py test` config or frontend test runner configured — add one (and its command here) when tests are introduced.

Ports: frontend `localhost:5173`, backend `localhost:8000` (health check at `/api/health/`, WebSockets at `/ws/...`), Postgres `localhost:5432`. Redis has no host port exposed (internal-only, used by the Channels layer).

**Note:** the above describes the original Django/Vite stack (`backend/`, `frontend/`). The project has since moved to `backend-nest/` (NestJS + Prisma) and `frontend-next/` (Next.js) — see memory for the pivot history; this file hasn't been fully updated to match yet.

### Desktop shell (Tauri)

`frontend-next/src-tauri/` wraps the Next.js app (`frontend-next/`) in a
native desktop shell via Tauri v2. Requires a Rust toolchain on the host
(`rustup`) and `cargo install tauri-cli --version "^2"` — unlike the rest
of this project, Tauri's own CLI runs on the host, not in Docker (it needs
to open a native window), but it never needs Node/npm itself: the frontend
build still happens inside the `frontend-next` container.

```bash
# Dev — requires `docker compose up` already running (frontend-next's
# `next dev` on :3000 is what the shell's window points at):
cd frontend-next && cargo tauri dev

# Production bundle — runs `docker compose exec frontend-next npm run build`
# itself (a static export, output: 'export' in next.config.js) before
# bundling the native app:
cd frontend-next && cargo tauri build
```

**Frontend package caveat:** this app is pinned to **React 18**. `@react-three/fiber`/`@react-three/drei` latest majors (v9/v10) require React 19 and will fail `npm install` with an ERESOLVE conflict — install the v8 line (`@react-three/fiber@^8`, `@react-three/drei@^9`) instead, or upgrade React first if that's ever a deliberate decision.

## Architecture

**Django app split** (`backend/sportsworld/` is the project config package — settings, root `urls.py`; apps live as siblings of it, e.g. `backend/games/`, `backend/football_agent/`, not nested inside `sportsworld/`):

- `games` — the sport-agnostic core data layer for **team sports** (football + basketball): teams, players, fixtures, results, injuries, head-to-head. A `sport` field on `Team`/`Game` distinguishes football from basketball; both share the same tables. Head-to-head is derived by querying prior meetings between two team IDs, not a stored join table.
- `basketball` — the one piece of schema that's genuinely basketball-specific: `QuarterScore` (per-quarter score breakdown), FK'd to `games.Game`. Everything else (teams, players, lineups, injuries, H2H) is inherited from `games`.
- `tennis` — fully separate from `games`, since tennis is player-vs-player, not team-vs-team: `TennisPlayer`, `TennisMatch` (doubles as both a fixture and, once finished, a historical record), `TennisSet`. Its own `services.py` mirrors `games/services.py`'s recent-form/H2H query pattern, keyed on a player instead of a team.
- `football_agent`, `basketball_agent`, `tennis_agent` — one Claude-backed agent app per sport, each with its own `MatchAnalysis`-style model (basketball/tennis use a 2-way win probability, no draw), a Pydantic schema, and a `services.py` that builds match context from the ORM and calls `ai_common.service.call_agent()`.
- `ai_common` — shared plumbing (not a Django app — no models, just an importable package) used by every agent: the mock/live branching, the `client.messages.parse()` call, and the refusal/`None` guards. Each agent supplies its own system prompt, schema, context, and mock-response factory.
- `translations` — sport-agnostic `NameTranslation` dictionary (English `source_text` -> Hebrew `translated_text`), consulted via `translations/fields.py::TranslatedCharField` (a drop-in `serializers.CharField` replacement) wherever a serializer emits a display name. Falls back to the English original when no entry exists, so an unrecognized name (e.g. from a future live sports API) never breaks the UI — it just shows untranslated until an entry is added. Every view that returns names passes `context={"lang": lang}` into its serializer; each AI agent's `_build_match_context` also translates names into the Claude prompt context when `language == "he"`.
- Root API is mounted at `/api/` (`sportsworld/urls.py` includes each app's own `urls.py`); routes are namespaced per sport, e.g. `/api/games/today/?sport=football|basketball&lang=he`, `/api/basketball/games/<id>/`, `/api/tennis/matches/<id>/`.
- Live WebSocket ticking: `games/consumers.py` + `games/routing.py` (football+basketball, `ws/games/<sport>/<id>/`) and `tennis/consumers.py` + `tennis/routing.py` (`ws/tennis/<id>/`), combined in root `sportsworld/routing.py` and wired into `sportsworld/asgi.py`. A separate `run_live_ticker` management command (its own `live_ticker` container/process, not part of request handling) sleeps 4s in a loop, mutates `status="live"` games/matches, and pushes each change over the Channels layer to per-game groups (`game-<sport>-<id>`, `match-tennis-<id>`). Matches reach `status="finished"` on their own (90 minutes, a set won by 2, etc.) rather than ticking forever.

**Config:** `sportsworld/settings.py` reads all runtime config from environment variables (Postgres connection, `DJANGO_SECRET_KEY`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, `REDIS_HOST`/`REDIS_PORT`, CORS origin for the Vite dev server) with dev-safe defaults — no separate settings-per-environment module yet. `AI_AGENT_MODE` (`mock`/`live`, auto-defaults to `mock` when no API key is set) controls whether every agent calls Claude for real or returns a hardcoded, schema-shaped response — see `ai_common/service.py`. `daphne` must be the **first** entry in `INSTALLED_APPS` (before `django.contrib.admin`) — without it, Channels is installed but `runserver` silently keeps serving plain HTTP/WSGI and every WebSocket request 404s; this is easy to get wrong since nothing errors at startup.

**Frontend:** routed pages per sport (sport select → today's games/matches → detail), sharing `ThemeLayout` (reads a `sportsTheme` entry per sport key to set CSS custom properties for background/accent, and — since Phase 3 — lazy-loads `three/SportBackgroundCanvas` behind `React.lazy`/`Suspense` so the 3D bundle isn't part of the main chunk) and a generalized `AiAnalysisPanel` (takes a fetch function and a function mapping an agent's analysis to probability segments, so it renders football's 3-way split and basketball/tennis's 2-way split without duplicating the loading/error/summary/key-factors UI). The theme data shape is meant to be extended (new sport keys) rather than restructured as more sports are added. `hooks/useLiveGame.ts` opens a WebSocket (only when a game/match's status is `"live"`) and hands parsed JSON ticks to a caller-supplied merge callback — used on both list pages (per-row) and detail pages. `i18n.tsx` defaults to Hebrew and already flips `document.documentElement.dir`; any UI element showing a home:away-style numeric pair (a score badge, not a "HH:MM" clock) needs an explicit `dir="ltr"` wrapper or the Unicode bidi algorithm can visually swap the two numbers under RTL — a real bug hit and fixed in Phase 3.

**3D backgrounds:** `frontend/src/three/SportBackgroundCanvas.tsx` checks WebGL support and looks up a scene in `three/scenes.ts` (currently football + basketball only); if either check fails it renders `null` and the existing CSS gradient shows through untouched. `ThemeLayout`'s CSS (`.sport-layout`) needs `position: relative; z-index: 0` — not just `position: relative` — for its own local stacking context to exist, which is what makes the 3D canvas's `z-index: -1` layer behind the content panels instead of behind the whole page.

**Data flow for a game's AI analysis:** the frontend requests `/api/<sport-prefix>/.../analysis/`; the backend checks for an existing `MatchAnalysis` row first, and only calls Claude (or the mock factory) on a cache miss. Each call is a single structured-output request (not a tool-use loop) — all data gathering happens in Django before the call. Probabilities aren't guaranteed to sum to 100 (structured outputs don't enforce cross-field numeric constraints), so each agent's service renormalizes them before persisting.
