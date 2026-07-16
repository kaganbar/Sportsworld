import { MasterAgentService } from './master-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { RateLimitExceededError, AnalysisUnavailableError } from '../common/agent-caller.service';
import { FootballAgentService } from '../football-agent/football-agent.service';
import { BasketballAgentService } from '../basketball-agent/basketball-agent.service';
import { BaseballAgentService } from '../baseball-agent/baseball-agent.service';
import { VolleyballAgentService } from '../volleyball-agent/volleyball-agent.service';
import { TennisAgentService } from '../tennis-agent/tennis-agent.service';
import { GeneralSportsAgentService } from '../general-sports-agent/general-sports-agent.service';
import { TransferAgentService } from '../transfer-agent/transfer-agent.service';
import { StatisticsAgentService } from '../statistics-agent/statistics-agent.service';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';

const mockToolRunner = jest.fn();

// See football-agent.service.spec.ts for why this can't reference an outer
// const directly (jest.mock's factory is hoisted above const declarations).
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
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

function makeDeps() {
  const prisma = {
    masterReport: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, createdAt: new Date('2026-01-01'), ...data })),
    },
  } as unknown as PrismaService;

  return {
    prisma,
    football: { getOrCreateAnalysis: jest.fn().mockResolvedValue({ summary: 'f' }) } as unknown as FootballAgentService,
    basketball: { getOrCreateAnalysis: jest.fn().mockResolvedValue({ summary: 'b' }) } as unknown as BasketballAgentService,
    baseball: { getOrCreateAnalysis: jest.fn().mockResolvedValue({ summary: 'bb' }) } as unknown as BaseballAgentService,
    volleyball: { getOrCreateAnalysis: jest.fn().mockResolvedValue({ summary: 'v' }) } as unknown as VolleyballAgentService,
    tennis: { getOrCreateAnalysis: jest.fn().mockResolvedValue({ summary: 't' }) } as unknown as TennisAgentService,
    generalSports: { ask: jest.fn().mockResolvedValue({ answer: 'a' }) } as unknown as GeneralSportsAgentService,
    transferAgent: { listStories: jest.fn().mockResolvedValue([]) } as unknown as TransferAgentService,
    statisticsAgent: { getOrCreateStatistics: jest.fn().mockResolvedValue({ summary: 's' }) } as unknown as StatisticsAgentService,
    newsAgent: { listClusters: jest.fn().mockResolvedValue([]) } as unknown as NewsAgentService,
    predictionAgent: { getOrCreatePrediction: jest.fn().mockResolvedValue({ prediction: 'p' }) } as unknown as PredictionAgentService,
  };
}

function makeService(deps: ReturnType<typeof makeDeps>, config: ConfigService, redis: RedisService) {
  return new MasterAgentService(
    config,
    deps.prisma,
    redis,
    deps.football,
    deps.basketball,
    deps.baseball,
    deps.volleyball,
    deps.tennis,
    deps.generalSports,
    deps.transferAgent,
    deps.statisticsAgent,
    deps.newsAgent,
    deps.predictionAgent,
  );
}

describe('MasterAgentService', () => {
  beforeEach(() => {
    mockToolRunner.mockReset();
    mockAnthropicCtor.mockClear();
  });

  it('mock mode never constructs an Anthropic client and caches the mock report', async () => {
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({}), makeRedis(true));

    const result = await service.answerQuery('who will win the derby?', 'en');

    expect(mockAnthropicCtor).not.toHaveBeenCalled();
    expect(mockToolRunner).not.toHaveBeenCalled();
    expect(result.cached).toBe(false);
    expect(result.model).toBe('mock');
    expect(deps.prisma.masterReport.create).toHaveBeenCalledTimes(1);
  });

  it('returns the cached report without calling toolRunner when the query hash already exists', async () => {
    const deps = makeDeps();
    (deps.prisma.masterReport.findUnique as jest.Mock).mockResolvedValue({
      reportText: 'cached report',
      model: 'claude-opus-4-8',
      createdAt: new Date('2026-01-01'),
    });
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    const result = await service.answerQuery('same question', 'en');

    expect(mockToolRunner).not.toHaveBeenCalled();
    expect(result.cached).toBe(true);
    expect(result.report).toBe('cached report');
    expect(deps.prisma.masterReport.create).not.toHaveBeenCalled();
  });

  it('live mode calls toolRunner with max_iterations 6 and all 10 tools', async () => {
    mockToolRunner.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'report' }] });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.answerQuery('what is the outlook for baseball game 5?', 'en');

    expect(mockToolRunner).toHaveBeenCalledTimes(1);
    const call = mockToolRunner.mock.calls[0][0];
    expect(call.max_iterations).toBe(6);
    expect(call.tools.map((t: any) => t.name).sort()).toEqual([
      'ask_general_sports',
      'get_baseball_analysis',
      'get_basketball_analysis',
      'get_football_analysis',
      'get_news_clusters',
      'get_prediction',
      'get_statistics',
      'get_tennis_analysis',
      'get_transfer_stories',
      'get_volleyball_analysis',
    ]);
  });

  it('the get_baseball_analysis tool delegates to BaseballAgentService.getOrCreateAnalysis', async () => {
    mockToolRunner.mockImplementation(async (params: any) => {
      const tool = params.tools.find((t: any) => t.name === 'get_baseball_analysis');
      await tool.run({ game_id: 42 });
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'report' }] };
    });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.answerQuery('baseball game 42 outlook', 'en');

    expect(deps.baseball.getOrCreateAnalysis).toHaveBeenCalledWith(42, 'en');
  });

  it('the get_statistics tool delegates to StatisticsAgentService with the requested sport', async () => {
    mockToolRunner.mockImplementation(async (params: any) => {
      const tool = params.tools.find((t: any) => t.name === 'get_statistics');
      await tool.run({ sport: 'volleyball', subject_id: 7 });
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'report' }] };
    });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.answerQuery('volleyball team 7 form', 'en');

    expect(deps.statisticsAgent.getOrCreateStatistics).toHaveBeenCalledWith('volleyball', 7, 'en');
  });

  it('a RateLimitExceededError from the shared bucket propagates and toolRunner is never invoked', async () => {
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(false));

    await expect(service.answerQuery('anything', 'en')).rejects.toThrow(RateLimitExceededError);
    expect(mockToolRunner).not.toHaveBeenCalled();
  });

  it('throws AnalysisUnavailableError when live mode is forced but no API key is configured', async () => {
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ AI_AGENT_MODE: 'live' }), makeRedis(true));

    await expect(service.answerQuery('anything', 'en')).rejects.toThrow(AnalysisUnavailableError);
  });

  it('throws AnalysisUnavailableError when the model refuses', async () => {
    mockToolRunner.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await expect(service.answerQuery('anything', 'en')).rejects.toThrow(AnalysisUnavailableError);
  });

  it('throws AnalysisUnavailableError when the final message has no text block', async () => {
    mockToolRunner.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'tool_use' }] });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await expect(service.answerQuery('anything', 'en')).rejects.toThrow(AnalysisUnavailableError);
  });

  it('appends the Hebrew language instruction to the system prompt when lang=he', async () => {
    mockToolRunner.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'דוח' }] });
    const deps = makeDeps();
    const service = makeService(deps, makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }), makeRedis(true));

    await service.answerQuery('מה התחזית?', 'he');

    const call = mockToolRunner.mock.calls[0][0];
    expect(call.system).toContain('Hebrew');
  });
});
