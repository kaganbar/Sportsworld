import { BaseballAgentService } from './baseball-agent.service';
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

// See football-agent.service.spec.ts for why this can't reference an outer
// const directly (jest.mock's factory is hoisted above const declarations).
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
  sport: 'baseball',
  homeTeamId: 10,
  awayTeamId: 20,
  competition: 'MLB',
  kickoff: new Date('2026-08-01T19:00:00Z'),
  venue: 'Some Ballpark',
  homeTeam: { name: 'Yankees' },
  awayTeam: { name: 'Red Sox' },
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
      { summary: 's', key_factors: ['a'], probabilities: { home_win: 55, away_win: 45 }, confidence: 'medium' },
      'claude-test-model',
    ]),
  } as unknown as AgentCallerService;

  const newsAgent = { getNewsForSubject: jest.fn().mockResolvedValue([{ headline: 'h', summary: 's', updated_at: '2026-01-01' }]) } as unknown as NewsAgentService;
  const predictionAgent = {
    getOrCreatePrediction: jest
      .fn()
      .mockResolvedValue({ prediction: 'p', probabilities: { option_a_win: 55, option_b_win: 45 }, confidence: 'medium' }),
  } as unknown as PredictionAgentService;

  return { prisma, games, stats, translations, agentCaller, newsAgent, predictionAgent };
}

function makeService(deps: ReturnType<typeof makeDeps>, config: ConfigService, redis: RedisService) {
  return new BaseballAgentService(
    deps.prisma,
    deps.games,
    deps.stats,
    deps.translations,
    deps.agentCaller,
    config,
    redis,
    deps.newsAgent,
    deps.predictionAgent,
  );
}

describe('BaseballAgentService enrichment (Phase A)', () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockToolRunner.mockReset();
    mockAnthropicCtor.mockClear();
  });

  it('mock mode never constructs an Anthropic client or calls toolRunner', async () => {
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({}), makeRedis(true));

    await service.getOrCreateAnalysis(1, 'en');

    expect(mockAnthropicCtor).not.toHaveBeenCalled();
    expect(mockToolRunner).not.toHaveBeenCalled();
    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toBeUndefined();
    expect(context.cross_check_prediction).toBeUndefined();
  });

  it('live mode calls toolRunner with max_iterations 4 and exactly the two enrichment tools', async () => {
    mockToolRunner.mockResolvedValue({ content: [{ type: 'text', text: 'done' }] });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.getOrCreateAnalysis(1, 'en');

    expect(mockToolRunner).toHaveBeenCalledTimes(1);
    const call = mockToolRunner.mock.calls[0][0];
    expect(call.max_iterations).toBe(4);
    expect(call.tools.map((t: any) => t.name).sort()).toEqual(['get_independent_prediction', 'get_team_news']);
  });

  it('a non-rate-limit Phase A failure still reaches agentCaller.call with base context only', async () => {
    mockToolRunner.mockRejectedValue(new Error('transient SDK error'));
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.getOrCreateAnalysis(1, 'en');

    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toBeUndefined();
    expect(context.cross_check_prediction).toBeUndefined();
  });

  it('a RateLimitExceededError from Phase A propagates and agentCaller.call is never invoked', async () => {
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(false));

    await expect(service.getOrCreateAnalysis(1, 'en')).rejects.toThrow(RateLimitExceededError);
    expect(deps.agentCaller.call).not.toHaveBeenCalled();
  });

  it('tool results captured via closures appear in Phase B context', async () => {
    mockToolRunner.mockImplementation(async (params: any) => {
      const newsTool = params.tools.find((t: any) => t.name === 'get_team_news');
      const predictionTool = params.tools.find((t: any) => t.name === 'get_independent_prediction');
      await newsTool.run({ team_name: 'Yankees' });
      await predictionTool.run({});
      return { content: [{ type: 'text', text: 'done' }] };
    });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.getOrCreateAnalysis(1, 'en');

    expect(deps.newsAgent.getNewsForSubject).toHaveBeenCalledWith('Yankees', 'en');
    expect(deps.predictionAgent.getOrCreatePrediction).toHaveBeenCalledWith('baseball', 1, 'en');
    const context = (deps.agentCaller.call as jest.Mock).mock.calls[0][0].context;
    expect(context.recent_news).toEqual({ Yankees: [{ headline: 'h', summary: 's', updated_at: '2026-01-01' }] });
    expect(context.cross_check_prediction).toEqual({
      prediction: 'p',
      probabilities: { option_a_win: 55, option_b_win: 45 },
      confidence: 'medium',
    });
  });

  it('throws NotFoundException for a game that is not baseball', async () => {
    const deps = makeDeps();
    (deps.games.findGameOrThrow as jest.Mock).mockResolvedValue({ ...fakeGame, sport: 'football' });
    const service = makeService(deps, makeConfig({}), makeRedis(true));

    await expect(service.getOrCreateAnalysis(1, 'en')).rejects.toThrow('Game 1 is not a baseball game');
  });
});
