import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Parser, NormalizedEvent, NormalizedStatus } from '../parser.interface';

// Football-Data.org v4 — a real, official football data provider (a
// personal API key, not a shared/free-tier credential like TheSportsDB's
// "123"). Confirmed live against the API before writing this:
//   - GET /v4/matches?dateFrom&dateTo returns fixtures across ALL 13
//     competitions this key can see in a single call — always prefer this
//     bulk endpoint over per-competition calls (rate limit is a confirmed
//     10 requests/minute, via the `x-requests-available-minute` response
//     header).
//   - Real crest URLs are included per team (`homeTeam.crest` /
//     `awayTeam.crest`) — threaded through NormalizedEvent's
//     homeLogoUrl/awayLogoUrl onto Team.logoUrl (see normalize.service.ts).
// This parser only handles fixtures/live scores. Real squads are a separate
// one-off enrichment (prisma/enrich-football-data-squads.ts), not part of
// the polling loop, since /v4/teams/{id} isn't a per-match endpoint.
const BASE_URL = 'https://api.football-data.org/v4';

interface FDTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface FDCompetition {
  id: number;
  name: string;
  code: string;
}

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  competition: FDCompetition;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface FDMatchesResponse {
  matches: FDMatch[];
}

/** Maps football-data.org's status vocabulary onto ours, mirroring the style
 * of `statusFromGroup` in scores365-client.ts. Returns null for a match that
 * isn't happening as scheduled (POSTPONED/SUSPENDED/CANCELLED/AWARDED/...)
 * — the caller skips those entirely rather than creating a Game row. */
export function mapStatus(status: string): NormalizedStatus | null {
  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
      return 'scheduled';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'FINISHED':
      return 'finished';
    default:
      return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class FootballDataFootballParser implements Parser {
  private readonly logger = new Logger(FootballDataFootballParser.name);
  readonly sourceId = 'football-data';
  readonly sport = 'football' as const;

  constructor(private readonly config: ConfigService) {}

  fetch(): Promise<FDMatchesResponse> {
    const apiKey = this.config.get<string>('FOOTBALL_DATA_API_KEY');
    if (!apiKey) {
      // No key loaded yet (or intentionally unset) — behave like an empty
      // poll rather than throwing, so ScraperService's per-parser try/catch
      // doesn't need special-casing for this source.
      return Promise.resolve({ matches: [] });
    }

    // A rolling window around "today": yesterday (so a match still marked
    // finished/live near midnight isn't dropped) through 3 days out (some
    // upcoming fixtures for list/nav screens). One bulk call covers every
    // accessible competition, well within the 10 req/min budget at this
    // app's 45s poll interval (~1.3 calls/min).
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 1);
    const to = new Date(today);
    to.setDate(to.getDate() + 3);

    return axios
      .get<FDMatchesResponse>(`${BASE_URL}/matches`, {
        params: { dateFrom: formatDate(from), dateTo: formatDate(to) },
        headers: { 'X-Auth-Token': apiKey },
        timeout: 15000,
      })
      .then((res) => res.data)
      .catch((err) => {
        this.logger.error(`football-data.org fetch failed: ${(err as Error).message}`);
        return { matches: [] };
      });
  }

  parse(raw: FDMatchesResponse): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];
    for (const m of raw.matches ?? []) {
      const status = mapStatus(m.status);
      if (!status) continue; // postponed/suspended/cancelled — not happening as scheduled

      events.push({
        sourceId: `${this.sourceId}-${m.id}`,
        sport: 'football',
        competition: m.competition.name,
        kickoff: new Date(m.utcDate),
        status,

        homeName: m.homeTeam.name,
        homeShortName: m.homeTeam.shortName ?? m.homeTeam.tla,
        homeLogoUrl: m.homeTeam.crest,

        awayName: m.awayTeam.name,
        awayShortName: m.awayTeam.shortName ?? m.awayTeam.tla,
        awayLogoUrl: m.awayTeam.crest,

        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        minute: null, // football-data.org doesn't expose live elapsed minutes on this endpoint
      });
    }
    return events;
  }
}
