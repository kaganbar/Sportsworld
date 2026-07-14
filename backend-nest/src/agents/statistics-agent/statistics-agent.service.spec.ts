import { StatisticsAgentService } from './statistics-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { AgentCallerService } from '../common/agent-caller.service';

const fakeTeam = { id: 5, name: 'Arsenal', sport: 'football' };

function makeDeps() {
  const prisma = {
    team: { findUnique: jest.fn().mockResolvedValue(fakeTeam) },
    statisticsAnalysis: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
    },
  } as unknown as PrismaService;

  const stats = {
    teamRecentResults: jest.fn().mockResolvedValue([]),
    teamFormStats: jest.fn().mockResolvedValue({}),
  } as unknown as StatsService;

  const translations = { translate: jest.fn(async (text: string) => text) } as unknown as TranslationsService;

  const agentCaller = {
    call: jest.fn().mockResolvedValue([
      { summary: 's', key_points: ['a'], confidence: 'medium' },
      'claude-test-model',
    ]),
  } as unknown as AgentCallerService;

  return { prisma, stats, translations, agentCaller };
}

describe('StatisticsAgentService', () => {
  it('validates the team sport before checking the cache', async () => {
    const deps = makeDeps();
    const service = new StatisticsAgentService(deps.prisma, deps.stats, deps.translations, deps.agentCaller);

    await service.getOrCreateStatistics('football', 5, 'en');

    expect(deps.prisma.team.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(deps.agentCaller.call).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException without hitting the cache when the team does not match the requested sport', async () => {
    const deps = makeDeps();
    const service = new StatisticsAgentService(deps.prisma, deps.stats, deps.translations, deps.agentCaller);

    await expect(service.getOrCreateStatistics('basketball', 5, 'en')).rejects.toThrow('Team 5 is not a basketball team');
    expect(deps.prisma.statisticsAnalysis.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a team id that does not exist', async () => {
    const deps = makeDeps();
    (deps.prisma.team.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new StatisticsAgentService(deps.prisma, deps.stats, deps.translations, deps.agentCaller);

    await expect(service.getOrCreateStatistics('football', 999, 'en')).rejects.toThrow('Team 999 not found');
  });
});
