import { Injectable } from '@nestjs/common';
import { Parser, NormalizedEvent, NormalizedQuarter } from '../parser.interface';
import { fetchAllScores, statusFromGroup, scoreOrNull, AllScoresBilingual, RawStage } from './scores365-client';

const SPORT_ID = 2;

// Best-effort: a per-quarter breakdown only appeared for live tennis sets in
// manual inspection (no live basketball game was available to confirm the
// same "stages" shape holds for quarters) — if the provider's live shape
// differs, this just yields no quarters and the total score still updates.
function toQuarters(stages: RawStage[] | undefined): NormalizedQuarter[] | undefined {
  if (!stages || stages.length === 0) return undefined;
  const quarterStages = stages.filter((s) => /^Q\d+|Quarter \d+/i.test(s.name ?? '') || /^Q\d+/i.test(s.shortName ?? ''));
  if (quarterStages.length === 0) return undefined;
  return quarterStages.map((s, i) => ({
    quarter: i + 1,
    homeScore: scoreOrNull(s.homeCompetitorScore) ?? 0,
    awayScore: scoreOrNull(s.awayCompetitorScore) ?? 0,
  }));
}

@Injectable()
export class Scores365BasketballParser implements Parser {
  readonly sourceId = '365scores';
  readonly sport = 'basketball' as const;

  fetch(): Promise<AllScoresBilingual> {
    return fetchAllScores(SPORT_ID, new Date());
  }

  parse(raw: AllScoresBilingual): NormalizedEvent[] {
    const heById = new Map(raw.he.games.map((g) => [g.id, g]));
    const enCountryById = new Map(raw.en.countries.map((c) => [c.id, c.name]));

    const events: NormalizedEvent[] = [];
    for (const g of raw.en.games) {
      const heGame = heById.get(g.id);
      if (!heGame) continue;

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
        quarters: toQuarters(g.stages),
      });
    }
    return events;
  }
}
