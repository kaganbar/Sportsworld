# SportsWorld — Project Roadmap

Living document tracking what's built, what's deliberately deferred, and what's
still undecided. See `CLAUDE.md` for architecture/commands (currently written
against the Django-era Phase 3 state — the NestJS pivot below post-dates it).
See `ARCHITECTURE.md` for the v2 platform expansion (Next.js frontend, 5 new
AI agents, auth, Redis, Transfer/News Centers) — this file's "Known gaps" and
"Possible next steps" sections below are being superseded by that plan.

## Done

### Django era (`backend/`, still runs, no longer actively developed)
- **Phase 0** — Dockerized Django + React/Vite skeleton.
- **Phase 1** — Football MVP + Football Agent, mock AI mode (`AI_AGENT_MODE`).
- **Phase 2** — Multi-sport: basketball + tennis, sport-agnostic `games` core
  + separate `tennis` app, `basketball_agent`/`tennis_agent`.
- **Phase 3** — Hebrew-first UX + RTL, translation layer, live WebSocket
  ticking via Django Channels/Redis (simulated), React Three Fiber 3D
  backgrounds (football/basketball only), "Other Sports" nav.

### NestJS pivot (`backend-nest/`, **active development target**)
On a 4th ask, paired with a real scraper requirement, the backend was pivoted
from Django to NestJS + Prisma. Django keeps running underneath but nothing
new is being built there.

- **Phase A** — Prisma schema + REST parity with Django. One unified
  `MatchAnalysis` model across all 3 sports instead of Django's 3 separate
  agent apps.
- **Phase B** — NestJS AI agent modules (football/basketball/tennis), same
  mock/live pattern as Django, `client.messages.parse()` + `zodOutputFormat()`.
- **Phase C** — WebSocket live-ticker parity. Bypasses `@nestjs/websockets`'
  `WsAdapter` (routes by exact pathname only, can't express a dynamic id) in
  favor of a manual `ws` server on the raw HTTP `'upgrade'` event — keeps the
  frontend's native-WebSocket hook working unmodified.
- **Phase D** — Real `ScraperService` against **365scores.com**'s public JSON
  API (no auth needed), polling every 45s. Real teams/fixtures for
  football/basketball, real players directly for tennis (competitors ARE
  players). `LIVE_DATA_SOURCE=scraper|simulated|off` env var controls this.
- **Frontend cutover** — `VITE_API_URL` now points at `backend-nest` (`:8001`)
  by default; Django (`:8000`) is a one-line revert if ever needed.
- **3D rigged players** — replaced the floating-sphere placeholders with
  actual bone-animated humanoid figures (`Xbot.glb`, three.js's own bundled
  example asset), recolored per team, running looped animations. Tennis got
  its first-ever 3D scene (grass court + net + two rally players) — it
  previously had none.
- **Basketball quarter-breakdown fix** — the allscores list endpoint never
  includes per-quarter data for basketball; fixed by fetching 365scores' per-
  game detail endpoint for live/finished games, including overtime periods.

## Known gaps / explicitly deferred

- **No real lineups/rosters for football or basketball.** The scraper only
  has team-level data (names, colors, scores) — real starting-XI/roster data
  would need a separate per-game endpoint that hasn't been explored yet.
- **No real historical head-to-head / recent form beyond what the scraper has
  captured.** "Recent form" only includes fixtures seen since the scraper
  started running, not real historical archives.
- **No real kit textures or club crests on the 3D players** — deliberate.
  Those are trademarked; team identity is conveyed via solid-color recolor
  only (same approach the rest of the UI already uses for team badges).
- **AI agents run in mock mode by default** — real Claude calls require
  `ANTHROPIC_API_KEY` in `.env`; each analysis is cached per (game, language)
  so cost is bounded per fixture, not per page view.
- **Auth (JWT + Google) is deferred** — no feature yet strictly requires user
  identity.
- **Tauri desktop shell is deferred** — explicitly decided against when the
  NestJS pivot was confirmed ("target the web app for now"). **Superseded
  2026-07-10:** the frontend is now being migrated to Next.js (see
  `ARCHITECTURE.md`), reversing the earlier "don't rewrite in Next.js"
  guidance — if Tauri comes back into scope, it would wrap `frontend-next/`.
- **"Other Sports" (baseball, volleyball) are nav-only placeholders** — no
  data model or pages built.
- **Only 1 scraper source (365scores.com)** — the `Parser` interface is
  source-agnostic by design, but no second source has been added.
- **Only 3 AI agents exist** (football/basketball/tennis) — no
  News/Transfer/Stats/Prediction/Master agents have been built.

## Possible next steps (undecided — ask before assuming an order)

- Real lineups/rosters (extend the scraper to a per-game detail endpoint).
- A second scraper source, or hardening the existing one (retry/backoff,
  reduce concurrent-request timeouts seen under load).
- Deepen one sport's agent stack (additional agent types beyond match
  analysis).
- Full Baseball/Volleyball build.
- Transfer Center.
- Tauri desktop shell.
- Retire the Django backend once NestJS parity is fully trusted (not before
  explicit sign-off — nothing gets deleted preemptively).
