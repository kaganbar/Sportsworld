/**
 * One-off enrichment: adds real squads (name/position, real dateOfBirth/
 * nationality not stored — this app's Player model has no columns for
 * them) for clubs in football-data.org's 5 most prominent competitions —
 * Premier League (PL), La Liga (PD), UEFA Champions League (CL), Serie A
 * (SA), Bundesliga (BL1) — scoped down from all 13 accessible competitions
 * to keep this one-off run to a reasonable size/time (~65-90 unique clubs
 * after cross-competition dedup, vs. 150+ across all 13; see the report
 * this script's author gave for the exact scoping rationale).
 *
 * football-data.org is a real, licensed data provider (a personal API key
 * in FOOTBALL_DATA_API_KEY, not a shared/free-tier credential) — confirmed
 * live against the API before writing this. Two calls per club (its
 * competition's team list, then /v4/teams/{id} for the squad), paced well
 * under the confirmed 10 requests/minute limit.
 *
 * SAFETY — same rationale/invariants as prisma/enrich-real-players.ts, read
 * that file's doc comment for the full explanation. Concretely here:
 *   - Every Team row this script touches was created by the scraper's real
 *     football-data.org parser (src/scraper/parsers/football-data/), never
 *     by seed.ts's fictional-content generators — seed.ts's own elite/
 *     Ligat Ha'Al clubs use different name strings (e.g. seed's "Real
 *     Madrid" vs. football-data's own "Real Madrid CF"), so there is no
 *     name collision risk with a fictional Team row that already has
 *     seed-generated injuries/MatchEvents attached to its fictional squad.
 *   - Real players are ALWAYS inserted as brand-new rows via `create()`,
 *     never overwriting an existing row.
 *   - isReal: true, seasonStats: null (no fabricated stats) on every row.
 *
 * Idempotent: a club is skipped entirely once it already has any isReal
 * Player row, so re-running only fills in clubs the previous run didn't
 * reach (e.g. after a rate-limit abort).
 *
 * Usage: npm run enrich:football-data-squads
 * Requires FOOTBALL_DATA_API_KEY in the environment.
 */
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// 5 most prominent of the 13 competitions this key can see (see report for
// the full 13). Confirmed real codes against the live /v4/competitions list.
const COMPETITION_CODES = ['PL', 'PD', 'CL', 'SA', 'BL1'];

// Comfortably under the confirmed 10 req/min limit (9.23/min at this
// spacing), shared by both the team-list calls and the per-team squad calls
// below since they hit the same rate budget.
const PACE_MS = 6500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authedGet<T>(path: string): Promise<T> {
  return axios
    .get<T>(`${BASE_URL}${path}`, { headers: { 'X-Auth-Token': API_KEY }, timeout: 15000 })
    .then((res) => res.data);
}

/** One retry after honoring the API's own Retry-After on a 429, since a
 * single mistimed call shouldn't abort an otherwise-paced run. */
async function authedGetWithRetry<T>(path: string): Promise<T> {
  try {
    return await authedGet<T>(path);
  } catch (err: any) {
    if (err?.response?.status === 429) {
      const retryAfterSec = Number(err.response.headers?.['retry-after']) || 65;
      console.log(`[rate-limited] ${path} — waiting ${retryAfterSec}s before retrying once.`);
      await sleep(retryAfterSec * 1000);
      return authedGet<T>(path);
    }
    throw err;
  }
}

interface FDTeamListing {
  id: number;
  name: string;
}

interface FDSquadPlayer {
  id: number;
  name: string;
  position?: string; // "Goalkeeper" | "Defence" | "Midfield" | "Offence" (confirmed set — see report)
  dateOfBirth?: string;
  nationality?: string;
}

interface FDTeamDetail {
  id: number;
  name: string;
  squad: FDSquadPlayer[];
  coach?: { name: string | null };
}

/** Maps football-data.org's real position categories onto this app's own
 * GK/DF/MF/FW vocabulary — same mapping convention as mapPosition() in
 * prisma/enrich-real-players.ts, just a different source taxonomy. Falls
 * back to "MF" for a blank/unrecognized value rather than failing the
 * whole player. */
function mapPosition(pos: string | undefined): string {
  const p = (pos ?? '').toLowerCase();
  if (p.includes('goalkeeper') || p.includes('keeper')) return 'GK';
  if (p.includes('defence') || p.includes('defender') || p.includes('back')) return 'DF';
  if (p.includes('midfield')) return 'MF';
  if (p.includes('offence') || p.includes('forward') || p.includes('attack') || p.includes('striker') || p.includes('wing')) return 'FW';
  return 'MF';
}

async function collectUniqueTeams(): Promise<Map<number, string>> {
  const teams = new Map<number, string>();
  for (const code of COMPETITION_CODES) {
    const data = await authedGetWithRetry<{ teams: FDTeamListing[] }>(`/competitions/${code}/teams`);
    for (const t of data.teams ?? []) teams.set(t.id, t.name);
    console.log(`[teams] ${code}: ${data.teams?.length ?? 0} clubs (running unique total: ${teams.size}).`);
    await sleep(PACE_MS);
  }
  return teams;
}

async function enrichTeam(fdTeamId: number, fdTeamName: string) {
  const team = await prisma.team.findUnique({ where: { name: fdTeamName } });
  if (!team) {
    console.log(`[skip] ${fdTeamName}: no matching Team row yet (the football-data scraper hasn't ingested this club).`);
    return;
  }

  const existingReal = await prisma.player.findFirst({ where: { teamId: team.id, isReal: true } });
  if (existingReal) {
    console.log(`[skip] ${fdTeamName}: already enriched.`);
    return;
  }

  const detail = await authedGetWithRetry<FDTeamDetail>(`/teams/${fdTeamId}`);
  await sleep(PACE_MS);

  if (!detail.squad || detail.squad.length === 0) {
    console.log(`[skip] ${fdTeamName}: football-data.org returned no squad data.`);
    return;
  }

  let inserted = 0;
  for (const p of detail.squad) {
    await prisma.player.create({
      data: {
        teamId: team.id,
        name: p.name,
        position: mapPosition(p.position),
        shirtNumber: undefined, // not present on the v4 squad payload
        seasonStats: undefined, // stays null — no fabricated stats for a real player
        isReal: true,
      },
    });
    inserted++;
  }

  console.log(`[done] ${fdTeamName}: ${inserted}/${detail.squad.length} real players inserted.`);
}

async function main() {
  if (!API_KEY) {
    console.error('FOOTBALL_DATA_API_KEY is not set in the environment — aborting.');
    process.exit(1);
  }

  const teams = await collectUniqueTeams();
  console.log(`Enriching squads for ${teams.size} unique clubs across ${COMPETITION_CODES.join(', ')}...`);

  for (const [id, name] of teams) {
    await enrichTeam(id, name);
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
