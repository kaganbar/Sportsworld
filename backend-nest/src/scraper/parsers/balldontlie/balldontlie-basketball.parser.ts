import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Parser, NormalizedEvent, NormalizedQuarter } from '../parser.interface';

// balldontlie.io v1 — a real, official NBA data provider (a personal API
// key, not a shared/free-tier credential). Confirmed live against the API
// before writing this:
//   - GET /v1/games?dates[]=YYYY-MM-DD (one day, one call) returns
//     `{ data: [...], meta: { per_page } }`; auth is `Authorization: <key>`
//     with NO "Bearer" prefix.
//   - Real shape for a finished game (verified against a real 2026-06-05
//     playoff game): id, date ("2026-06-05"), datetime (full ISO
//     timestamp, used as `kickoff` below — `date` alone has no tip-off
//     time), season, status ("Final" once finished), period (4 for a
//     regulation finish, higher once OT rounds are counted), postseason,
//     postponed, home_team_score/visitor_team_score, and a full
//     home_q1..q4/home_ot1..ot3 + visitor_q1..q4/visitor_ot1..ot3
//     quarter-by-quarter breakdown (null for periods that didn't happen) —
//     mapped onto NormalizedQuarter below, so (unlike 365scores'
//     basketball parser) this source needs no separate per-game detail
//     call to backfill quarters.
//   - Confirmed rate limit: 5 requests/minute (`x-ratelimit-limit: 5`
//     response header) — this is why this source gets its own
//     BalldontlieSchedulerService on a slower interval instead of joining
//     ScraperService's shared 45s loop (see that file's doc comment).
//   - balldontlie only covers the NBA — there's no per-fixture competition
//     field to read, so `competition` below is the fixed string "NBA".
//
// NOT independently confirmed live this session: the exact `status`/
// `period` values for a scheduled-but-not-yet-started or currently-live
// game. July 2026 is NBA off-season (2025-26 season already finished,
// 2026-27 preseason doesn't start until October), so no such game existed
// to fetch. mapStatus() below keys off `period` (documented by balldontlie
// as 0 before tipoff, incrementing during play) rather than pattern-
// matching `status`'s free text, specifically to stay correct without that
// verification — revisit if the live path ever misfires once games resume.
const BASE_URL = 'https://api.balldontlie.io/v1';

interface BDLTeam {
  id: number;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

interface BDLGame {
  id: number;
  date: string;
  datetime: string;
  status: string;
  period: number;
  postseason: boolean;
  postponed: boolean;
  home_team_score: number;
  visitor_team_score: number;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_q1: number | null;
  home_q2: number | null;
  home_q3: number | null;
  home_q4: number | null;
  home_ot1: number | null;
  home_ot2: number | null;
  home_ot3: number | null;
  visitor_q1: number | null;
  visitor_q2: number | null;
  visitor_q3: number | null;
  visitor_q4: number | null;
  visitor_ot1: number | null;
  visitor_ot2: number | null;
  visitor_ot3: number | null;
}

export interface BDLGamesResponse {
  data: BDLGame[];
}

/** See the "NOT independently confirmed live" note above for why this keys
 * off `period` rather than `status` text. `status === 'Final'` (the one
 * value confirmed live) always wins first. */
export function mapStatus(g: BDLGame): 'scheduled' | 'live' | 'finished' {
  if (g.status === 'Final') return 'finished';
  return g.period >= 1 ? 'live' : 'scheduled';
}

/** Real per-quarter/OT breakdown straight off the games-list response — no
 * separate per-game detail call needed (contrast with
 * scores365-basketball.parser.ts's toQuarters, which has to backfill this
 * from a second endpoint). OT quarters map onto quarter numbers 5, 6, 7 —
 * same "no separate overtime concept" convention as the 365scores parser. */
function toQuarters(g: BDLGame): NormalizedQuarter[] | undefined {
  const periods: [number, number | null, number | null][] = [
    [1, g.home_q1, g.visitor_q1],
    [2, g.home_q2, g.visitor_q2],
    [3, g.home_q3, g.visitor_q3],
    [4, g.home_q4, g.visitor_q4],
    [5, g.home_ot1, g.visitor_ot1],
    [6, g.home_ot2, g.visitor_ot2],
    [7, g.home_ot3, g.visitor_ot3],
  ];
  const quarters = periods
    .filter((p): p is [number, number, number] => p[1] != null && p[2] != null)
    .map(([quarter, homeScore, awayScore]) => ({ quarter, homeScore, awayScore }));
  return quarters.length ? quarters : undefined;
}

// UTC calendar date, not Asia/Jerusalem like the 365scores client uses —
// NBA tip-offs are US-evening (~2-6am Israel time), so a game can briefly
// fall on "the wrong side" of this boundary right around Israeli midnight.
// Not corrected for here: balldontlie has no timezone param on this
// endpoint (unlike 365scores' explicit timezoneName), and the 90s poll
// (see BalldontlieSchedulerService) will pick the game up on the next
// day's fetch either way — acceptable for a single-day, minimal-calls
// design.
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class BalldontlieBasketballParser implements Parser {
  private readonly logger = new Logger(BalldontlieBasketballParser.name);
  readonly sourceId = 'balldontlie';
  readonly sport = 'basketball' as const;

  constructor(private readonly config: ConfigService) {}

  fetch(): Promise<BDLGamesResponse> {
    const apiKey = this.config.get<string>('BALLDONTLIE_API_KEY');
    if (!apiKey) {
      // No key loaded yet (or intentionally unset) — behave like an empty
      // poll rather than throwing, same convention as
      // FootballDataFootballParser.fetch().
      return Promise.resolve({ data: [] });
    }

    return axios
      .get<BDLGamesResponse>(`${BASE_URL}/games`, {
        params: { 'dates[]': formatDate(new Date()) },
        headers: { Authorization: apiKey },
        timeout: 15000,
      })
      .then((res) => res.data)
      .catch((err) => {
        this.logger.error(`balldontlie fetch failed: ${(err as Error).message}`);
        return { data: [] };
      });
  }

  parse(raw: BDLGamesResponse): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];
    for (const g of raw.data ?? []) {
      if (g.postponed) continue;

      events.push({
        sourceId: `${this.sourceId}-${g.id}`,
        sport: 'basketball',
        competition: 'NBA',
        kickoff: new Date(g.datetime),
        status: mapStatus(g),

        homeName: g.home_team.full_name,
        homeShortName: g.home_team.abbreviation,

        awayName: g.visitor_team.full_name,
        awayShortName: g.visitor_team.abbreviation,

        homeScore: g.home_team_score,
        awayScore: g.visitor_team_score,
        quarters: toQuarters(g),
      });
    }
    return events;
  }
}
