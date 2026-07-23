/**
 * One-off enrichment: adds real NBA rosters (name/position/jersey number)
 * for every team balldontlie.io knows about, sourced from balldontlie's
 * real v1 API (a personal API key in BALLDONTLIE_API_KEY, not a shared/
 * free-tier credential — see src/scraper/parsers/balldontlie/ for the
 * live-fixtures parser this pairs with).
 *
 * Confirmed live shapes before writing this:
 *   - GET /v1/teams -> { data: [{ id, city, name, full_name,
 *     abbreviation, conference, division }] } — all 30 real NBA teams,
 *     one call, no pagination needed.
 *   - GET /v1/players?team_ids[]=<id> -> { data: [{ id, first_name,
 *     last_name, position, jersey_number, ... }], meta: { next_cursor,
 *     per_page } }. Deliberately only the first page (default per_page,
 *     no cursor follow-up) is fetched per team: a bare team_ids[] filter
 *     with no season param appears to return every player balldontlie has
 *     ever associated with that franchise id, not just a current-season
 *     roster (confirmed live for team 27/Spurs: names like Marco Belinelli
 *     and Bismack Biyombo came back, both long gone from the roster by
 *     2026) — capping to one page keeps each team's real-player count in
 *     the same rough ballpark as this app's own 10-player fictional squads
 *     (BASKETBALL_SQUAD_TEMPLATE in prisma/seed.ts) instead of dumping in
 *     a full multi-season historical list, and keeps this script's total
 *     call count exactly 30 (see PACE_MS below).
 *   - `position` is coarse — "G", "F", "C", or a hyphenated combo like
 *     "G-F" for a player balldontlie lists at two spots — NOT the finer
 *     PG/SG/SF/PF/C vocabulary this app's own fictional seed data uses.
 *     Stored as-is (uppercased) rather than guessed/mapped onto that
 *     finer vocabulary, since balldontlie genuinely doesn't expose which
 *     of PG/SG a "G" is. frontend-next/lib/positions.ts's
 *     translateBasketballPosition() Hebrew-translates both vocabularies.
 *
 * SAFETY — same invariants as prisma/enrich-real-players.ts and
 * prisma/enrich-football-data-squads.ts (read either for the full
 * rationale); concretely here:
 *   - 4 of the 30 real team names (Los Angeles Lakers, Boston Celtics,
 *     Golden State Warriors, Miami Heat) exactly match Team rows
 *     prisma/seed.ts's BASKETBALL_TEAMS already created fictionally —
 *     unlike football-data.org's squads script, this is NOT a
 *     no-collision situation. NormalizeService.upsertTeam (keyed on the
 *     globally-unique Team.name) upserts the balldontlie scraper's real
 *     score/status data onto those SAME 4 rows rather than creating fresh
 *     ones. This script doesn't care either way: it looks up each of
 *     balldontlie's 30 real team names against whatever Team row already
 *     has that name (fictional-seed in origin or scraper-created,
 *     indistinguishable once real score data has been upserted onto it),
 *     and only ever INSERTs new Player rows — the 10 pre-existing
 *     fictional players on those 4 teams (and their seed-generated
 *     Lineup/Injury/MatchEvent rows) are never read, renamed, or deleted.
 *   - Real players are ALWAYS `create()`d as brand-new rows, isReal: true,
 *     seasonStats: null (no fabricated stats) — never UPDATEs an existing
 *     row.
 *   - A team is skipped entirely (not just re-checked) once it already has
 *     any isReal Player row, so a partial/interrupted run is safe to
 *     re-launch — it just picks up wherever it left off.
 *   - A team with no matching Team row yet (the balldontlie *scraper*
 *     hasn't ingested a fixture involving it — expected to be common
 *     during NBA off-season, since games?dates[]=today returns empty
 *     July-September) is skipped with a log line, not an error; re-run
 *     this script anytime after the season resumes to pick up the rest.
 *
 * Usage: npm run enrich:balldontlie-rosters
 * Requires BALLDONTLIE_API_KEY in the environment.
 */
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const BASE_URL = 'https://api.balldontlie.io/v1';
const API_KEY = process.env.BALLDONTLIE_API_KEY;

// Confirmed live: x-ratelimit-limit is 5/min. 13s spacing is ~4.6 calls/min
// — real headroom under the cap for other concurrent usage of this key
// (e.g. the live scraper's own poll, see BalldontlieSchedulerService),
// while still finishing 31 calls (1 team list + 30 rosters) in ~6.5
// minutes, matching the task's own worst-case-schedule math.
const PACE_MS = 13000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authedGet<T>(path: string, params: Record<string, string>): Promise<T> {
  return axios
    .get<T>(`${BASE_URL}${path}`, { params, headers: { Authorization: API_KEY as string }, timeout: 15000 })
    .then((res) => res.data);
}

/** One retry after honoring the API's own Retry-After on a 429, same
 * pattern as authedGetWithRetry in enrich-football-data-squads.ts. */
async function authedGetWithRetry<T>(path: string, params: Record<string, string>): Promise<T> {
  try {
    return await authedGet<T>(path, params);
  } catch (err: any) {
    if (err?.response?.status === 429) {
      const retryAfterSec = Number(err.response.headers?.['retry-after']) || 65;
      console.log(`[rate-limited] ${path} — waiting ${retryAfterSec}s before retrying once.`);
      await sleep(retryAfterSec * 1000);
      return authedGet<T>(path, params);
    }
    throw err;
  }
}

interface BDLTeam {
  id: number;
  full_name: string;
}

interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string; // "G" | "F" | "C" | "G-F" | "F-G" | "F-C" | "" — see doc comment above
  jersey_number: string | null;
}

/** Parses balldontlie's `jersey_number` (a string, sometimes null) into a
 * positive integer, or null if absent/unparseable — same convention as
 * parseShirtNumber in prisma/enrich-real-players.ts. Collision against an
 * existing squadmate's number is checked separately by the caller. */
function parseShirtNumber(raw: string | null): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}

/** balldontlie's position codes, uppercased and passed through as-is (see
 * the doc comment above for why this deliberately doesn't map onto this
 * app's PG/SG/SF/PF/C vocabulary). Blank/missing falls back to "F" —
 * same "don't fail the whole player over one unclear field" spirit as
 * mapPosition()'s "MF" fallback in the football enrichment scripts, "F"
 * chosen simply as the single most common non-informative default. */
function normalizePosition(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : 'F';
}

async function fetchRealTeams(): Promise<BDLTeam[]> {
  const res = await authedGetWithRetry<{ data: BDLTeam[] }>('/teams', {});
  return res.data ?? [];
}

async function enrichTeam(bdlTeam: BDLTeam) {
  const team = await prisma.team.findUnique({ where: { name: bdlTeam.full_name } });
  if (!team) {
    console.log(
      `[skip] ${bdlTeam.full_name}: no matching Team row yet (the balldontlie scraper hasn't ingested a fixture for this team — expected during NBA off-season; re-run this script once it has).`,
    );
    return;
  }

  const existingReal = await prisma.player.findFirst({ where: { teamId: team.id, isReal: true } });
  if (existingReal) {
    console.log(`[skip] ${bdlTeam.full_name}: already enriched.`);
    return;
  }

  const res = await authedGetWithRetry<{ data: BDLPlayer[] }>('/players', { 'team_ids[]': String(bdlTeam.id) });
  const players = res.data ?? [];
  if (players.length === 0) {
    console.log(`[skip] ${bdlTeam.full_name}: balldontlie returned no players for team id ${bdlTeam.id}.`);
    return;
  }

  const existingPlayers = await prisma.player.findMany({ where: { teamId: team.id } });
  const takenShirtNumbers = new Set(existingPlayers.map((p) => p.shirtNumber).filter((n): n is number => n != null));

  let inserted = 0;
  for (const p of players) {
    let shirtNumber = parseShirtNumber(p.jersey_number);
    if (shirtNumber != null && takenShirtNumbers.has(shirtNumber)) {
      shirtNumber = null; // collision with an existing squadmate's number (fictional or real) — leave unset
    }

    await prisma.player.create({
      data: {
        teamId: team.id,
        name: `${p.first_name} ${p.last_name}`.trim(),
        position: normalizePosition(p.position),
        shirtNumber: shirtNumber ?? undefined,
        seasonStats: undefined, // stays null — no fabricated stats for a real player
        isReal: true,
      },
    });
    if (shirtNumber != null) takenShirtNumbers.add(shirtNumber);
    inserted++;
  }

  console.log(`[done] ${bdlTeam.full_name} (balldontlie id ${bdlTeam.id}): ${inserted}/${players.length} real players inserted.`);
}

async function main() {
  if (!API_KEY) {
    console.error('BALLDONTLIE_API_KEY is not set in the environment — aborting.');
    process.exit(1);
  }

  const teams = await fetchRealTeams();
  console.log(`Fetched ${teams.length} real NBA teams from balldontlie. Enriching rosters one team at a time (${PACE_MS}ms apart)...`);

  for (const bdlTeam of teams) {
    await sleep(PACE_MS);
    try {
      await enrichTeam(bdlTeam);
    } catch (err) {
      console.error(`[error] ${bdlTeam.full_name}: ${(err as Error).message}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
