import { Scores365FootballParser } from './scores365-football.parser';
import { AllScoresBilingual, RawGame } from './scores365-client';

function makeGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    id: 1,
    sportId: 1,
    competitionDisplayName: 'Premier League',
    startTime: '2026-07-10T18:00:00Z',
    statusGroup: 3, // live
    gameTime: 37.8,
    homeCompetitor: { id: 10, name: 'Arsenal', symbolicName: 'ARS', score: 2, color: '#FF0000', countryId: 100 },
    awayCompetitor: { id: 20, name: 'Chelsea', symbolicName: 'CHE', score: 1, color: '#0000FF', countryId: 100 },
    ...overrides,
  };
}

describe('Scores365FootballParser', () => {
  const parser = new Scores365FootballParser();

  it('parses a live game into a NormalizedEvent with a rounded minute and no sets/quarters', () => {
    const raw: AllScoresBilingual = {
      en: { games: [makeGame()], countries: [{ id: 100, name: 'England' }] },
      he: {
        games: [
          makeGame({
            competitionDisplayName: 'ליגת העל',
            homeCompetitor: { ...makeGame().homeCompetitor, name: 'ארסנל' },
            awayCompetitor: { ...makeGame().awayCompetitor, name: 'צלסי' },
          }),
        ],
        countries: [{ id: 100, name: 'אנגליה' }],
      },
    };

    const [event] = parser.parse(raw);

    expect(event.sourceId).toBe('365scores-1');
    expect(event.sport).toBe('football');
    expect(event.status).toBe('live');
    expect(event.minute).toBe(38); // rounded from 37.8
    expect(event.homeScore).toBe(2);
    expect(event.awayScore).toBe(1);
    expect(event.homeName).toBe('Arsenal');
    expect(event.homeNameHe).toBe('ארסנל');
    expect(event.homeCountry).toBe('England');
    expect(event.quarters).toBeUndefined();
    expect(event.sets).toBeUndefined();
  });

  it('sets minute to null for a scheduled game', () => {
    const scheduled = makeGame({ statusGroup: 2, gameTime: 0 });
    const raw: AllScoresBilingual = {
      en: { games: [scheduled], countries: [] },
      he: { games: [scheduled], countries: [] },
    };

    const [event] = parser.parse(raw);
    expect(event.status).toBe('scheduled');
    expect(event.minute).toBeNull();
  });

  it('skips a game missing from the Hebrew response rather than throwing', () => {
    const raw: AllScoresBilingual = {
      en: { games: [makeGame()], countries: [] },
      he: { games: [], countries: [] },
    };

    expect(parser.parse(raw)).toEqual([]);
  });
});
