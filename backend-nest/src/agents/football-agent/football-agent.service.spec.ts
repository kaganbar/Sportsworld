import { FootballAgentService } from './football-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { AgentCallerService, RateLimitExceededError } from '../common/agent-caller.service';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

const mockParse = jest.fn();
const mockToolRunner = jest.fn();

// jest.mock's factory is hoisted above these const declarations, so it must
// not reference the outer `mockAnthropicCtor` name directly (a genuine
// temporal-dead-zone error) — instead it builds its own constructor inline
// and lazily closes over mockParse/mockToolRunner, which is safe since
// those closures only run later, at actual test-invocation time, well
// after module-level consts have initialized (same pattern already used in
// agent-caller.service.spec.ts).
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
    beta: { messages: { toolRunner: mockToolRunner } },
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockAnthropicCtor = jest.requireMock('@anthropic-ai/sdk').default as jest.Mock;

function makeConfig(values: Record<string, string>): ConfigService {
  return { get: (key: string, defaultValue?: string) => values[key] ?? defaultValue } as unknown as ConfigService;
}

function makeRedis(allowed: boolean): RedisService {
  return { checkRateLimit: jest.fn().mockResolvedValue(allowed) } as unknown as RedisService;
}

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
    matchAnalysis: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
    },
    injury: { findMany: jest.fn().mockResolvedValue([]) },
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
      { summary: 's', key_factors: ['a'], probabilities: { home_win: 40, draw: 30, away_win: 30 }, confidence: 'medium' },
      'claude-test-model',
    ]),
  } as unknown as AgentCallerService;

  const newsAgent = { getNewsForSubject: jest.fn().mockResolvedValue([{ headline: 'h', summary: 's', updated_at: '2026-01-01' }]) } as unknown as NewsAgentService;
  const predictionAgent = {
    getOrCreatePrediction: jest
      .fn()
      .mockResolvedValue({ prediction: 'p', probabilities: { option_a_win: 50, draw: 25, option_b_win: 25 }, confidence: 'medium' }),
  } as unknown as PredictionAgentService;

  return { prisma, games, stats, translations, agentCaller, newsAgent, predictionAgent };
}

describe('FootballAgentService enrichment (Phase A)', () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockToolRunner.mockReset();
    mockAnthropicCtor.mockClear();
  });

  it('mock mode never constructs an Anthropic client or calls toolRunner', async () => {
    const deps = makeDeps();
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({}), // no ANTHROPIC_API_KEY -> mock mode
      makeRedis(true),
      deps.newsAgent,
      deps.predictionAgent,
    );

    await service.getOrCreateAnalysis(1, 'en');

    expect(mockAnthropicCtor).not.toHaveBeenCalled();
    expect(mockToolRunner).not.toHaveBeenCalled();
    expect(deps.agentCaller.call).toHaveBeenCalledTimes(1);
    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toBeUndefined();
    expect(context.cross_check_prediction).toBeUndefined();
  });

  it('live mode calls toolRunner with max_iterations 4 and exactly the two enrichment tools', async () => {
    mockToolRunner.mockResolvedValue({ content: [{ type: 'text', text: 'done' }] });
    const deps = makeDeps();
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
      deps.newsAgent,
      deps.predictionAgent,
    );

    await service.getOrCreateAnalysis(1, 'en');

    expect(mockToolRunner).toHaveBeenCalledTimes(1);
    const call = mockToolRunner.mock.calls[0][0];
    expect(call.max_iterations).toBe(4);
    expect(call.tools.map((t: any) => t.name).sort()).toEqual(['get_independent_prediction', 'get_team_news']);
  });

  it('a non-rate-limit Phase A failure still reaches agentCaller.call with base context only', async () => {
    mockToolRunner.mockRejectedValue(new Error('transient SDK error'));
    const deps = makeDeps();
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
      deps.newsAgent,
      deps.predictionAgent,
    );

    await service.getOrCreateAnalysis(1, 'en');

    expect(deps.agentCaller.call).toHaveBeenCalledTimes(1);
    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toBeUndefined();
    expect(context.cross_check_prediction).toBeUndefined();
  });

  it('a RateLimitExceededError from Phase A propagates and agentCaller.call is never invoked', async () => {
    const deps = makeDeps();
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(false), // rate limit exceeded
      deps.newsAgent,
      deps.predictionAgent,
    );

    await expect(service.getOrCreateAnalysis(1, 'en')).rejects.toThrow(RateLimitExceededError);
    expect(deps.agentCaller.call).not.toHaveBeenCalled();
  });

  it('tool results captured via closures appear in Phase B context', async () => {
    mockToolRunner.mockImplementation(async (params: any) => {
      const newsTool = params.tools.find((t: any) => t.name === 'get_team_news');
      const predictionTool = params.tools.find((t: any) => t.name === 'get_independent_prediction');
      await newsTool.run({ team_name: 'Arsenal' });
      await predictionTool.run({});
      return { content: [{ type: 'text', text: 'done' }] };
    });
    const deps = makeDeps();
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
      deps.newsAgent,
      deps.predictionAgent,
    );

    await service.getOrCreateAnalysis(1, 'en');

    expect(deps.newsAgent.getNewsForSubject).toHaveBeenCalledWith('Arsenal', 'en');
    expect(deps.predictionAgent.getOrCreatePrediction).toHaveBeenCalledWith('football', 1, 'en');
    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toEqual({ Arsenal: [{ headline: 'h', summary: 's', updated_at: '2026-01-01' }] });
    expect(context.cross_check_prediction).toEqual({
      prediction: 'p',
      probabilities: { option_a_win: 50, draw: 25, option_b_win: 25 },
      confidence: 'medium',
    });
  });

  it('throws NotFoundException for a game that is not football', async () => {
    const deps = makeDeps();
    (deps.games.findGameOrThrow as jest.Mock).mockResolvedValue({ ...fakeGame, sport: 'basketball' });
    const service = new FootballAgentService(
      deps.prisma,
      deps.games,
      deps.stats,
      deps.translations,
      deps.agentCaller,
      makeConfig({}),
      makeRedis(true),
      deps.newsAgent,
      deps.predictionAgent,
    );

    await expect(service.getOrCreateAnalysis(1, 'en')).rejects.toThrow('Game 1 is not a football game');
  });
});
