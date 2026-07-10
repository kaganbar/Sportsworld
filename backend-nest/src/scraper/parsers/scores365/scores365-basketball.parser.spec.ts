import { Scores365BasketballParser, BasketballRaw } from './scores365-basketball.parser';
import { RawGame } from './scores365-client';

function makeGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    id: 1,
    sportId: 2,
    competitionDisplayName: 'NBA',
    startTime: '2026-07-10T18:00:00Z',
    statusGroup: 3, // live
    gameTime: 0,
    homeCompetitor: { id: 10, name: 'Lakers', symbolicName: 'LAL', score: 60, countryId: 100 },
    awayCompetitor: { id: 20, name: 'Celtics', symbolicName: 'BOS', score: 58, countryId: 100 },
    ...overrides,
  };
}

describe('Scores365BasketballParser', () => {
  const parser = new Scores365BasketballParser();

  it('maps "Q1".."Q4" stage names into quarter numbers, in order', () => {
    const game = makeGame();
    const raw: BasketballRaw = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
      details: new Map([
        [
          1,
          {
            en: {
              ...game,
              stages: [
                { id: 1, name: 'Q2', shortName: 'Q2', homeCompetitorScore: 32, awayCompetitorScore: 30 },
                { id: 2, name: 'Q1', shortName: 'Q1', homeCompetitorScore: 28, awayCompetitorScore: 28 },
                { id: 3, name: 'Current Score', shortName: 'Total', homeCompetitorScore: 60, awayCompetitorScore: 58 },
              ],
            },
            he: game,
          },
        ],
      ]),
    };

    const [event] = parser.parse(raw);

    expect(event.quarters).toEqual([
      { quarter: 1, homeScore: 28, awayScore: 28 },
      { quarter: 2, homeScore: 32, awayScore: 30 },
    ]);
  });

  it('maps an overtime stage onto quarter 5 and beyond', () => {
    const game = makeGame();
    const raw: BasketballRaw = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
      details: new Map([
        [
          1,
          {
            en: {
              ...game,
              stages: [
                { id: 1, name: 'Q4', shortName: 'Q4', homeCompetitorScore: 20, awayCompetitorScore: 22 },
                { id: 2, name: 'OT', shortName: 'OT', homeCompetitorScore: 10, awayCompetitorScore: 8 },
              ],
            },
            he: game,
          },
        ],
      ]),
    };

    const [event] = parser.parse(raw);

    expect(event.quarters).toEqual([
      { quarter: 4, homeScore: 20, awayScore: 22 },
      { quarter: 5, homeScore: 10, awayScore: 8 },
    ]);
  });

  it('leaves quarters undefined when there is no per-game detail (scheduled game)', () => {
    const game = makeGame({ statusGroup: 2 });
    const raw: BasketballRaw = {
      en: { games: [game], countries: [] },
      he: { games: [game], countries: [] },
      details: new Map(),
    };

    const [event] = parser.parse(raw);
    expect(event.quarters).toBeUndefined();
  });
});
