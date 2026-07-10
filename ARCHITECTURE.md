# SportsWorld v2 — Architecture

This document captures the target architecture for SportsWorld's expansion
from a 3-agent, 3-sport app into the full platform described in the "Master
Project Instructions": 9 modules, 8 AI agents, Next.js frontend, Redis,
auth. It's the Phase 1 deliverable of that spec's own gated process (Phase
1 = Architecture, approved before Phase 2 = Project Setup begins) — a
decision record to build against, not code. See `PROJECT_ROADMAP.md` for
what's already shipped and `CLAUDE.md` for day-to-day commands/conventions
(currently written against the pre-v2 state).

## Why extend, not rewrite

`backend-nest/` already *is* the target stack — NestJS + Prisma +
PostgreSQL — and is verified working end-to-end: real fixtures/players
from a live scraper, 3 AI agents making real Claude calls, live WebSocket
ticking, real 3D scenes. None of that is being thrown away. The genuine
rewrite is the **frontend** (Vite → Next.js was an explicit, repeated ask
finally confirmed this time); the backend's job is to grow into the larger
scope (more agents, auth, Redis), not to be re-derived from zero.

## Module map

```
frontend-next/     NEW. Next.js (App Router), built alongside the existing
                    frontend/ (Vite) — exactly the same pattern already
                    proven in this repo when backend-nest/ was built next
                    to backend/ (Django): both serve traffic, cut over only
                    once frontend-next/ reaches parity, frontend/ untouched
                    until then.

frontend/           EXISTING (Vite). Not touched or deleted before cutover.

backend/            EXISTING (Django). Already superseded by backend-nest/,
                    kept running until full trust in the NestJS side; no
                    new work happens here.

backend-nest/       EXTENDED:
  auth/              NEW. Passport (google-oauth20 + jwt strategies), a
                     `User` Prisma model, guards any controller can use.
  agents/
    football-agent/, basketball-agent/, tennis-agent/
                     EXISTING, unchanged — single structured-output call
                     per analysis, cached per (subject, language).
    general-sports-agent/
                     NEW. One module parametrized by sport name rather than
                     a dedicated module per sport — backs "Other Sports"
                     (baseball, volleyball, ...) without triplicating the
                     existing per-sport agent pattern for long-tail sports.
    transfer-agent/  NEW. Collects rumors/official transfers, merges
                     duplicates, ranks source credibility, estimates
                     probability, builds timelines.
    statistics-agent/ NEW. Team/player form, xG, win probability,
                     possession, advanced analytics.
    news-agent/      NEW. Collects, summarizes, dedupes, highlights.
    prediction-agent/ NEW. Statistical predictions with confidence and
                     reasoning — always framed as an estimate, never a
                     guarantee (per the source spec's own explicit rule).
    master-agent/    NEW. Tool-use loop over the other 7 agents — see below.
    common/          EXISTING (AgentCallerService, probability-normalizer).
                     The tool-use loop is new plumbing alongside this, not
                     a replacement — every per-sport/specialized agent keeps
                     the existing single-shot `messages.parse()` pattern;
                     only Master Agent uses tools, because only Master Agent
                     needs to decide *which* other agents' output it needs.
  scraper/           EXISTING (365scores parsers for live scores). Transfer
                     and News get their own parsers under the same `Parser`
                     interface (`scraper/parsers/parser.interface.ts`) once
                     a real source is named — not before, matching how
                     365scores.com itself was only chosen at the point the
                     live-scores scraper actually needed a source.
  websockets/        EXISTING (LiveGateway, SimulatedTickerService). Gains
                     Redis pub/sub — see below.
  games/, basketball/, tennis/, stats/, translations/, prisma/
                     EXISTING, unchanged.

redis               Already in docker-compose (added for Django Channels;
                    backend-nest doesn't use it yet). Three roles once wired
                    into backend-nest:
                    1. WebSocket pub/sub. LiveGateway currently tracks
                       subscriptions in an in-process Map — works for
                       exactly one backend instance. This is the concrete
                       "why Redis matters for millions of users" gap: a
                       second backend replica needs ticks published to
                       Redis and fanned out to each instance's own
                       locally-connected sockets, or a client connected to
                       instance A never sees a tick produced on instance B.
                    2. Read-through cache for hot, slow-changing reads
                       (games/today lists).
                    3. Rate limiting on endpoints that trigger paid Claude
                       calls (analysis endpoints, Master Agent reports).
```

## Frontend: Next.js

**App Router, not Pages Router** — the modern default, better
layouts/streaming. Real caveat for this specific app: nearly everything
interactive (the live-WebSocket hook, the R3F 3D canvas, the RTL/language
toggle) must be Client Components (`"use client"`) — Next.js doesn't give
free SSR benefits for data that's live and changes after page load. Where
it *does* help: the initial "today's games" list can be server-fetched for
faster first paint and indexable/SEO-able sport pages, which the current
pure-SPA Vite app can't do at all.

Everything currently in `frontend/src/` — `three/` (3D scenes), `i18n.tsx`
(Hebrew/RTL), `hooks/useLiveGame.ts`, `lib/api.ts`, `theme/sportsTheme.ts` —
ports over conceptually unchanged; only the routing/rendering shell
(React Router → Next.js file-based routing, plain components → Client
Components where interactive) actually changes.

## Auth

Passport strategies (`google-oauth20`, `jwt`) live in `backend-nest/src/auth/`.
NestJS is the system of record — it issues and validates its own JWTs;
`frontend-next/` only redirects into the OAuth flow and attaches the
resulting access token to API calls. This avoids running two auth models
(NestJS's own JWTs vs. NextAuth.js's session model) that would otherwise
need reconciling.

Stateless JWT: short-lived access token, longer-lived refresh token, both
issued by the API. No Redis-backed session store unless refresh-token
revocation becomes an actual requirement — starting stateless matches this
project's existing pattern of not building ahead of a need that hasn't
appeared yet (auth itself was deferred the same way, until a feature
actually required identity).

## Master Agent: tool-use loop

Each of the 7 specialized agents (Football/Basketball/Tennis/
GeneralSports/Transfer/Statistics/News/Prediction) is exposed to Master
Agent as a typed tool (e.g. `get_football_analysis(gameId)`,
`get_transfer_timeline(playerId)`). Master Agent's system prompt describes
when each is relevant; the loop runs until Claude produces a final
synthesized report or a round cap is hit, so a bad prompt can't run up an
unbounded bill. The final report is cached the same way `MatchAnalysis`
already is — keyed on whatever subject it covers — so a repeat request is
free.

This is a genuinely new pattern for this codebase (every existing agent
call today is one single-shot structured-output request, never a tool-use
loop) — expect materially higher latency and cost per Master Agent report
than a per-sport analysis call, and design the round cap + caching with
that in mind from the start.

## Transfer Center / News Center data shape

Conceptual only — exact Prisma fields are Phase 5's (Database) job, not
this document's:
- A raw **per-source report** (player, from/to club or article text,
  source URL, source name, reported/published time).
- A canonical **story grouping** that a report belongs to — this is what
  "merge duplicate reports" / "detect duplicate news" structurally
  requires: without a grouping concept, dedup logic has nothing to attach
  its result to.
- **Source credibility** is a property of the source, not the individual
  report — it likely wants its own small lookup table rather than a
  copied field on every report.

No real source has been chosen for either pipeline yet. Per this project's
own precedent, that decision happens when we actually reach that build
phase, the same way 365scores.com was only named once the live-scores
scraper needed a concrete target — not guessed in advance.

## Deliberately not decided here

- **Deployment target** (Vercel + Railway or AWS). The spec's own Phase 11,
  last on purpose — deciding it now would be exactly the kind of rushing
  the source spec warns against. Both the backend (standard Docker
  containers) and frontend (standard Next.js build) stay deployment-target
  -agnostic so this can be decided later without constraining anything
  built in between.
- **Monorepo tooling** (Turborepo/Nx). Current sibling-directory + Docker
  Compose structure already works and is simple — introduce shared tooling
  only if type-sharing duplication between `frontend-next/` and
  `backend-nest/` actually becomes painful, not preemptively.

## Phase mapping (source spec's Phase 2-11 vs. current state)

| Their phase | Status |
|---|---|
| 2. Project setup | **Done** — `frontend-next/` scaffolded (Next.js 14 App Router, Tailwind, shadcn/ui, Dockerized on :3000), `auth/` module skeleton registered in `backend-nest` |
| 3. Frontend | Not started — Next.js port of existing pages + new modules (Transfer Center, News Center, AI Center, Profile, Settings) |
| 4. Backend | Mostly done — NestJS/Prisma/Postgres already the active stack; new work is `auth/` + 5 new agent modules |
| 5. Database | Mostly done — existing schema covers football/basketball/tennis; new models needed for `User`, transfer reports/story-groups, news reports/story-groups |
| 6. Sports APIs | Done for live scores (365scores.com scraper) — no source chosen yet for transfer/news data |
| 7. Football Agent | Done |
| 8. Other AI Agents | Not started — General Sports, Transfer, Statistics, News, Prediction, Master |
| 9. Realtime features | Mostly done — WebSocket live ticking works single-instance; Redis pub/sub needed for horizontal scaling |
| 10. Testing | Not started — no test suite exists in either backend today |
| 11. Deployment | Not started — deliberately deferred, see above |
