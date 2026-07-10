import { Injectable } from '@nestjs/common';
import { Parser, NormalizedEvent, NormalizedSet } from '../parser.interface';
import { fetchAllScores, statusFromGroup, scoreOrNull, AllScoresBilingual, RawStage } from './scores365-client';

const SPORT_ID = 3;

// Confirmed via a live match: "stages" mixes a per-set breakdown (name
// "Set 1", "Set 2", ...) with a running current-game score ("Game") and a
// sets-won summary ("Sets") — only the "Set N" entries are real per-set
// game counts, and only sets that have actually started have non-negative
// scores.
function toSets(stages: RawStage[] | undefined): NormalizedSet[] | undefined {
  if (!stages) return undefined;
  const sets = stages
    .map((s) => {
      const match = s.name?.match(/^Set (\d+)$/i);
      if (!match) return null;
      if (s.homeCompetitorScore < 0 || s.awayCompetitorScore < 0) return null;
      return {
        setNumber: Number(match[1]),
        player1Games: Math.round(s.homeCompetitorScore),
        player2Games: Math.round(s.awayCompetitorScore),
      };
    })
    .filter((s): s is NormalizedSet => s !== null)
    .sort((a, b) => a.setNumber - b.setNumber);
  return sets.length ? sets : undefined;
}

function rankingOf(rankings: { name: string; position: number }[] | undefined): number | null {
  return rankings && rankings.length > 0 ? rankings[0].position : null;
}

function tourOf(rankings: { name: string; position: number }[] | undefined): 'atp' | 'wta' {
  return rankings?.[0]?.name?.toUpperCase() === 'WTA' ? 'wta' : 'atp';
}

@Injectable()
export class Scores365TennisParser implements Parser {
  readonly sourceId = '365scores';
  readonly sport = 'tennis' as const;

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

      // Tennis competitors ARE the players (no separate team/roster layer),
      // so real player names come straight from this same fixtures endpoint
      // — unlike football/basketball, no extra lineup call is needed.
      events.push({
        sourceId: `${this.sourceId}-${g.id}`,
        sport: 'tennis',
        competition: g.competitionDisplayName,
        competitionHe: heGame.competitionDisplayName,
        round: g.stageName ?? g.roundName,
        kickoff: new Date(g.startTime),
        status: statusFromGroup(g.statusGroup),
        tour: tourOf(g.homeCompetitor.rankings),

        homeName: g.homeCompetitor.name,
        homeNameHe: heGame.homeCompetitor.name,
        homeRanking: rankingOf(g.homeCompetitor.rankings),
        homeCountry: g.homeCompetitor.countryId ? enCountryById.get(g.homeCompetitor.countryId) : undefined,

        awayName: g.awayCompetitor.name,
        awayNameHe: heGame.awayCompetitor.name,
        awayRanking: rankingOf(g.awayCompetitor.rankings),
        awayCountry: g.awayCompetitor.countryId ? enCountryById.get(g.awayCompetitor.countryId) : undefined,

        homeScore: scoreOrNull(g.homeCompetitor.score),
        awayScore: scoreOrNull(g.awayCompetitor.score),
        sets: toSets(g.stages),
      });
    }
    return events;
  }
}
