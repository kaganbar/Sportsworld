import { Injectable } from '@nestjs/common';
import { Parser, NormalizedEvent } from '../parser.interface';
import { fetchAllScores, statusFromGroup, scoreOrNull, AllScoresBilingual } from './scores365-client';

const SPORT_ID = 1;

@Injectable()
export class Scores365FootballParser implements Parser {
  readonly sourceId = '365scores';
  readonly sport = 'football' as const;

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
        sport: 'football',
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
        minute: g.statusGroup === 3 ? Math.round(g.gameTime) : null,
      });
    }
    return events;
  }
}
