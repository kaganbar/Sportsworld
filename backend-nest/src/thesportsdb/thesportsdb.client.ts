import axios from 'axios';

// TheSportsDB v1 JSON API, using the published free/test key "123" (not a
// personal paid credential — see prisma/enrich-real-players.ts for the
// one-off script that's the only current caller of this client). Confirmed
// against TheSportsDB's own docs before writing this:
//   - lookup_all_players.php is capped at ~10 players per team on this tier.
//   - eventsnext.php/eventslast.php only return the home leg of a fixture
//     (not used here at all — this app's 365scores scraper already covers
//     fixtures/live scores comprehensively, see src/scraper).
//   - live scores are premium-only, not reachable on this key.
//   - rate limit is 30 requests/minute; callers are expected to pace their
//     own requests (see `sleep` below) since this client is a thin wrapper,
//     not a queue.
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

export interface TSDBTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strCountry?: string;
  strLeague?: string;
}

export interface TSDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strTeam?: string;
  strPosition?: string;
  strNumber?: string; // often missing/empty on the free tier — treat as optional
}

/** GET searchteams.php?t=<name> — returns the first matching team, or null
 * if TheSportsDB has no entry for it (some smaller Israeli clubs aren't in
 * its database at all). */
export async function searchTeam(name: string): Promise<TSDBTeam | null> {
  const res = await axios.get<{ teams: TSDBTeam[] | null }>(`${BASE_URL}/searchteams.php`, {
    params: { t: name },
    headers: HEADERS,
    timeout: 15000,
  });
  const teams = res.data.teams;
  return teams && teams.length > 0 ? teams[0] : null;
}

/** GET lookup_all_players.php?id=<teamId> — up to ~10 real players on the
 * free tier. Returns [] (not null) when the team has no roster data. */
export async function listPlayers(teamId: string): Promise<TSDBPlayer[]> {
  const res = await axios.get<{ player: TSDBPlayer[] | null }>(`${BASE_URL}/lookup_all_players.php`, {
    params: { id: teamId },
    headers: HEADERS,
    timeout: 15000,
  });
  return res.data.player ?? [];
}

/** Simple pacing helper for the 30 req/min limit — see doc comment above. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
