import { PredictionAgentService } from './prediction-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { AgentCallerService } from '../common/agent-caller.service';

const fakeGame = {
  id: 1,
  sport: 'football',
  homeTeamId: 10,
  awayTeamId: 20,
  competition: 'Premier League',
  kickoff: new Date('2026-08-01T15:00:00Z'),
  venue: 'Some Stadium',
  homeTeam: { name: 'Arsenal' },
  awayTeam: { name: 'Chelsea' },
};

function makeDeps() {
  const prisma = {
    predictionAnalysis: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
    },
  } as unknown as PrismaService;

  const games = { findGameOrThrow: jest.fn().mockResolvedValue(fakeGame) } as unknown as GamesService;

  const stats = {
    teamRecentResults: jest.fn().mockResolvedValue([]),
    teamHeadToHead: jest.fn().mockResolvedValue([]),
    teamFormStats: jest.fn().mockResolvedValue({}),
  } as unknown as StatsService;

  const translations = { translate: jest.fn(async (text: string) => text) } as unknown as TranslationsService;

  const agentCaller = {
    call: jest.fn().mockResolvedValue([
      { prediction: 'p', key_factors: ['a'], probabilities: { option_a_win: 40, draw: 30, option_b_win: 30 }, confidence: 'medium' },
      'claude-test-model',
    ]),
  } as unknown as AgentCallerService;

  return { prisma, games, stats, translations, agentCaller };
}

describe('PredictionAgentService', () => {
  it('returns a three-way prediction for football and checks the cache after validating sport', async () => {
    const deps = makeDeps();
    const service = new PredictionAgentService(deps.prisma, deps.games, deps.stats, deps.translations, deps.agentCaller);

    const result = await service.getOrCreatePrediction('football', 1, 'en');

    expect(deps.games.findGameOrThrow).toHaveBeenCalledWith(1);
    expect(deps.agentCaller.call).toHaveBeenCalledTimes(1);
    expect((result as any).probabilities).toEqual({ option_a_win: 40, draw: 30, option_b_win: 30 });
  });

  it('throws NotFoundException without hitting the cache when the game does not match the requested sport', async () => {
    const deps = makeDeps();
    (deps.games.findGameOrThrow as jest.Mock).mockResolvedValue({ ...fakeGame, sport: 'basketball' });
    const service = new PredictionAgentService(deps.prisma, deps.games, deps.stats, deps.translations, deps.agentCaller);

    await expect(service.getOrCreatePrediction('football', 1, 'en')).rejects.toThrow('Game 1 is not a football game');
    expect(deps.prisma.predictionAnalysis.findUnique).not.toHaveBeenCalled();
  });
});
