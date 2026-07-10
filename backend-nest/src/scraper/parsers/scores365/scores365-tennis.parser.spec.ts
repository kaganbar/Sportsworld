import { Scores365TennisParser } from './scores365-tennis.parser';
import { AllScoresBilingual, RawGame } from './scores365-client';

function makeGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    id: 1,
    sportId: 3,
    competitionDisplayName: 'Wimbledon',
    roundName: 'Final',
    startTime: '2026-07-10T13:00:00Z',
    statusGroup: 3, // live
    gameTime: 0,
    homeCompetitor: {
      id: 10,
      name: 'Player A',
      score: 1,
      countryId: 100,
      rankings: [{ name: 'ATP', position: 3 }],
    },
    awayCompetitor: {
      id: 20,
      name: 'Player B',
      score: 0,
      countryId: 200,
      rankings: [{ name: 'ATP', position: 7 }],
    },
    ...overrides,
  };
}

describe('Scores365TennisParser', () => {
  const parser = new Scores365TennisParser();

  it('parses "Set N" stages into ordered sets and reads ranking/tour from rankings', () => {
    const game = makeGame({
      stages: [
        { id: 1, name: 'Set 2', shortName: 'S2', homeCompetitorScore: 3, awayCompetitorScore: 2 },
        { id: 2, name: 'Set 1', shortName: 'S1', homeCompetitorScore: 6, awayCompetitorScore: 4 },
        { id: 3, name: 'Game', shortName: 'G', homeCompetitorScore: 40, awayCompetitorScore: 30 },
      ],
    });
    const raw: AllScoresBilingual = {
      en: { games: [game], countries: [{ id: 100, name: 'USA' }, { id: 200, name: 'Spain' }] },
      he: { games: [game], countries: [] },
    };

    const [event] = parser.parse(raw);

    expect(event.sport).toBe('tennis');
    expect(event.tour).toBe('atp');
    expect(event.homeRanking).toBe(3);
    expect(event.awayRanking).toBe(7);
    expect(event.round).toBe('Final');
    expect(event.sets).toEqual([
      { setNumber: 1, player1Games: 6, player2Games: 4 },
      { setNumber: 2, player1Games: 3, player2Games: 2 },
    ]);
  });

  it('excludes a set whose scores are still negative (not yet started)', () => {
    const game = makeGame({
      stages: [
        { id: 1, name: 'Set 1', shortName: 'S1', homeCompetitorScore: 6, awayCompetitorScore: 4 },
        { id: 2, name: 'Set 2', shortName: 'S2', homeCompetitorScore: -1, awayCompetitorScore: -1 },
      ],
    });
    const raw: AllScoresBilingual = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
    };

    const [event] = parser.parse(raw);
    expect(event.sets).toEqual([{ setNumber: 1, player1Games: 6, player2Games: 4 }]);
  });

  it('detects the WTA tour from rankings', () => {
    const game = makeGame({
      homeCompetitor: { ...makeGame().homeCompetitor, rankings: [{ name: 'WTA', position: 5 }] },
    });
    const raw: AllScoresBilingual = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
    };

    const [event] = parser.parse(raw);
    expect(event.tour).toBe('wta');
  });

  it('falls back to null ranking when no rankings are present', () => {
    const game = makeGame({ homeCompetitor: { ...makeGame().homeCompetitor, rankings: undefined } });
    const raw: AllScoresBilingual = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
    };

    const [event] = parser.parse(raw);
    expect(event.homeRanking).toBeNull();
  });
});
