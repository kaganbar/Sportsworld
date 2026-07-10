# SportsWorld — Deployment (Phase 11)

Target: **Vercel** (`frontend-next/`) + **Railway** (`backend-nest/` +
managed Postgres + managed Redis). This is the user-executed half of
Phase 11 — everything file/code-side is already prepared and committed
(`backend-nest/Dockerfile.prod`, `.dockerignore`, `railway.toml`, and the
`REDIS_URL` support in `redis.service.ts`). Every step below is either a
Railway/Vercel dashboard action or a Google Cloud Console action — none of
it can be done from this repo.

**Do these in order.** The backend needs to exist before the frontend can
point at it; the frontend needs to exist before the backend's CORS/OAuth
redirect can point back at it. Steps 1-2, then 3, then 4, then 5.

---

## 1. Railway — provision Postgres and Redis

In a new Railway project:

1. **Add a Postgres plugin.** Railway injects `DATABASE_URL` automatically
   in the `postgresql://...` shape Prisma already expects — no code
   changes needed, nothing to copy by hand.
2. **Add a Redis plugin.** Railway injects a single `REDIS_URL` connection
   string. `RedisService` already prefers `REDIS_URL` over
   `REDIS_HOST`/`REDIS_PORT` when it's present (see
   `backend-nest/src/redis/redis.service.ts`), so this also needs no
   manual host/port entry.

## 2. Railway — deploy `backend-nest`

1. Create a new service from this GitHub repo. Set its **Root Directory**
   to `backend-nest`.
2. Railway will pick up `backend-nest/railway.toml`, which pins the build
   to `Dockerfile.prod` (the production multi-stage image — the existing
   dev `Dockerfile` stays untouched and keeps serving local
   `docker compose up`).
3. Reference the Postgres and Redis plugins' `DATABASE_URL`/`REDIS_URL`
   into this service's environment (Railway's "Add variable reference"
   flow — no copy-pasting the actual connection strings).
4. Set these environment variables (placeholders for now — steps 3-5 fill
   in the real values):

   | Variable | Value for now | Why |
   |---|---|---|
   | `PORT` | `8001` | matches `EXPOSE 8001` in the Dockerfile |
   | `AI_AGENT_MODE` | `live` | you already have a real, working `ANTHROPIC_API_KEY` |
   | `ANTHROPIC_API_KEY` | *(copy from your local `.env`)* | already real and working — reuse as-is, don't regenerate |
   | `ANTHROPIC_MODEL` | `claude-opus-4-8` | matches local default |
   | `NEWS_API_KEY` | *(copy from your local `.env`)* | already real and working — reuse as-is |
   | `LIVE_DATA_SOURCE` | `scraper` | real 365scores.com fixtures, matches local default |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | *(leave blank for now)* | filled in step 3 — the app boots fine without them, `/api/auth/google` just won't work until then |
   | `GOOGLE_CALLBACK_URL` | *(leave as-is for now)* | filled in step 3, needs this service's real Railway URL first |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | *(see below)* | fresh random values — **never reuse the local dev-insecure defaults** |
   | `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` | matches local default, no reason to change |
   | `FRONTEND_URL` | *(leave as-is for now)* | filled in step 4, needs the real Vercel URL first |
   | `CORS_ALLOWED_ORIGINS` | *(leave as-is for now)* | same — filled in step 4 |

   **Generating `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`**: run
   `openssl rand -base64 48` twice (once per secret) and paste the two
   results in. Don't commit these anywhere — Railway's env var store is
   where they live, full stop.

5. Deploy. Railway assigns a public URL like
   `https://backend-nest-production-xxxx.up.railway.app` — **note it
   down**, steps 3-5 all need it.
6. Confirm it's actually up: `curl https://<your-railway-url>/api/health`.

## 3. Google Cloud Console — real OAuth credentials

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs &
   Services → Credentials → Create OAuth 2.0 Client ID (type: Web
   application).
2. **Authorized redirect URI**: exactly
   `https://<your-railway-url>/api/auth/google/callback` — this must
   match `GOOGLE_CALLBACK_URL` byte-for-byte, including the trailing path.
3. Back in Railway, set:
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — the values Google just gave you.
   - `GOOGLE_CALLBACK_URL` = `https://<your-railway-url>/api/auth/google/callback`
4. Redeploy the `backend-nest` service so the new env vars take effect.

## 4. Vercel — deploy `frontend-next`

1. Import this GitHub repo as a new Vercel project. Set its **Root
   Directory** to `frontend-next`. Vercel auto-detects Next.js — no
   Dockerfile, no build command override needed.
2. Set environment variable `NEXT_PUBLIC_API_URL` = `https://<your-railway-url>`
   (the real backend URL from step 2). This is a Next.js build-time
   variable — it must be set **before** the first deploy/build runs, or
   you'll need to redeploy after setting it.
3. Deploy. Vercel assigns a public URL like
   `https://sportsworld-frontend-next.vercel.app` — **note it down**.

## 5. Railway — close the loop

Back in the `backend-nest` service's environment:

- `FRONTEND_URL` = the real Vercel URL from step 4 (used for the
  post-login OAuth redirect target).
- `CORS_ALLOWED_ORIGINS` = the real Vercel URL from step 4 (comma-separate
  if you also want to allow another origin).

Redeploy.

## 6. Smoke test against the real URLs

- Open the Vercel URL — today's games list loads (proves
  `NEXT_PUBLIC_API_URL` → Railway → Postgres is wired correctly).
- Open a live game's detail page — a WebSocket tick arrives within a few
  seconds (proves the Redis-backed pub/sub path works in production, not
  just docker-compose).
- Open a game's AI analysis panel — a real Claude-backed response renders
  (proves `ANTHROPIC_API_KEY`/`AI_AGENT_MODE=live` are wired).
- Click "Sign in with Google" — completes and redirects back to
  `FRONTEND_URL` with a working session (proves the full OAuth round trip:
  Google → Railway callback → JWT issuance → redirect).

If any of these fail, check the corresponding Railway/Vercel service logs
first — almost every likely failure here is a missed or mistyped
environment variable from the steps above, not application code.

---

## What's deliberately not covered here

- **Custom domain.** The steps above use the platform-provided
  `*.up.railway.app`/`*.vercel.app` subdomains. Adding a custom domain
  later is a DNS-only change on top of this — it doesn't require touching
  anything built in this repo.
- **CI gating deploys on tests.** Both Railway and Vercel already
  redeploy automatically on every push to this repo once connected (their
  default behavior, not something built here) — but neither currently
  runs the Phase 10 test suites (`backend-nest`'s Jest, `frontend-next`'s
  Vitest) before deploying. Adding a GitHub Actions workflow to gate on
  that is a reasonable next increment, not part of this phase.
