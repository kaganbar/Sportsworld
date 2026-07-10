import { Injectable, Logger } from '@nestjs/common';
import { Parser, NormalizedEvent, NormalizedQuarter } from '../parser.interface';
import {
  fetchAllScores,
  fetchGameDetail,
  statusFromGroup,
  scoreOrNull,
  AllScoresBilingual,
  RawGame,
  RawStage,
} from './scores365-client';

const SPORT_ID = 2;

export interface BasketballRaw extends AllScoresBilingual {
  // Per-game quarter detail, keyed by game id — only populated for
  // live/finished games (see fetch() below), since the allscores list
  // endpoint never includes it, only the per-game endpoint does.
  details: Map<number, { en: RawGame; he: RawGame }>;
}

// Real per-quarter English naming, confirmed against the live per-game
// endpoint: "Q1".."Q4", an "OT"/"OT2".. overtime period for games that need
// it (mapped onto quarter 5, 6, ... since our schema has no separate
// overtime concept), and a "Current Score" summary entry — excluded, it's
// just the running total, not a period.
function toQuarters(stages: RawStage[] | undefined): NormalizedQuarter[] | undefined {
  if (!stages) return undefined;
  const quarters = stages
    .map((s) => {
      const qMatch = s.name?.match(/^Q(\d+)$/i);
      if (qMatch) {
        return {
          quarter: Number(qMatch[1]),
          homeScore: scoreOrNull(s.homeCompetitorScore) ?? 0,
          awayScore: scoreOrNull(s.awayCompetitorScore) ?? 0,
        };
      }
      const otMatch = s.name?.match(/^OT(\d*)$/i);
      if (otMatch) {
        const otNumber = otMatch[1] ? Number(otMatch[1]) : 1;
        return {
          quarter: 4 + otNumber,
          homeScore: scoreOrNull(s.homeCompetitorScore) ?? 0,
          awayScore: scoreOrNull(s.awayCompetitorScore) ?? 0,
        };
      }
      return null;
    })
    .filter((q): q is NormalizedQuarter => q !== null)
    .sort((a, b) => a.quarter - b.quarter);
  return quarters.length ? quarters : undefined;
}

@Injectable()
export class Scores365BasketballParser implements Parser {
  private readonly logger = new Logger(Scores365BasketballParser.name);
  readonly sourceId = '365scores';
  readonly sport = 'basketball' as const;

  async fetch(): Promise<BasketballRaw> {
    const allScores = await fetchAllScores(SPORT_ID, new Date());

    // Only live/finished games have a meaningful quarter breakdown to fetch —
    // a scheduled game has no score yet. This is still one extra pair of
    // requests (en+he) per relevant game every poll; acceptable at the
    // current "onlyMajorGames" volume, but a candidate to optimize later by
    // skipping finished games we've already backfilled.
    const relevantGames = allScores.en.games.filter((g) => g.statusGroup === 3 || g.statusGroup === 4);
    const details = new Map<number, { en: RawGame; he: RawGame }>();

    await Promise.all(
      relevantGames.map(async (g) => {
        try {
          const [en, he] = await Promise.all([fetchGameDetail(g.id, 1), fetchGameDetail(g.id, 2)]);
          details.set(g.id, { en, he });
        } catch (err) {
          this.logger.warn(`Failed to fetch quarter detail for game ${g.id}: ${(err as Error).message}`);
        }
      }),
    );

    return { ...allScores, details };
  }

  parse(raw: BasketballRaw): NormalizedEvent[] {
    const heById = new Map(raw.he.games.map((g) => [g.id, g]));
    const enCountryById = new Map(raw.en.countries.map((c) => [c.id, c.name]));

    const events: NormalizedEvent[] = [];
    for (const g of raw.en.games) {
      const heGame = heById.get(g.id);
      if (!heGame) continue;

      const detail = raw.details.get(g.id);

      events.push({
        sourceId: `${this.sourceId}-${g.id}`,
        sport: 'basketball',
        competition: g.competitionDisplayName,
        competitionHe: heGame.competitionDisplayName,
        kickoff: new Date(g.startTime),
        status: statusFromGroup(g.statusGroup),

        homeName: g.homeCompetitor.name,
        homeNameHe: heGame.homeCompetitor.name,
        homeShortName: g.homeCompetitor.symbolicName,
        homeColor: g.homeCompetitor.color,
        homeCountry: g.homeCompetitor.countryId ? enCountryById.get(g.homeCompetitor.countryId) : undefined,

        awayName: g.awayCompetitor.name,
        awayNameHe: heGame.awayCompetitor.name,
        awayShortName: g.awayCompetitor.symbolicName,
        awayColor: g.awayCompetitor.color,
        awayCountry: g.awayCompetitor.countryId ? enCountryById.get(g.awayCompetitor.countryId) : undefined,

        homeScore: scoreOrNull(g.homeCompetitor.score),
        awayScore: scoreOrNull(g.awayCompetitor.score),
        quarters: toQuarters(detail?.en.stages),
      });
    }
    return events;
  }
}
