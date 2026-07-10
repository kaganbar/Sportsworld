import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AgentCallerService, AnalysisUnavailableError, RateLimitExceededError } from './agent-caller.service';
import { RedisService } from '../../redis/redis.service';

const mockParse = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
  })),
}));

function makeConfig(values: Record<string, string>): ConfigService {
  return { get: (key: string, defaultValue?: string) => values[key] ?? defaultValue } as unknown as ConfigService;
}

function makeRedis(allowed: boolean): RedisService {
  return { checkRateLimit: jest.fn().mockResolvedValue(allowed) } as unknown as RedisService;
}

const schema = z.object({ answer: z.string() });
const call = (service: AgentCallerService) =>
  service.call({ outputSchema: schema, system: 's', context: {}, mockFactory: () => ({ answer: 'mock' }) });

describe('AgentCallerService', () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  it('mock mode returns the mockFactory result and never touches the SDK', async () => {
    // No ANTHROPIC_API_KEY -> defaultMode is 'mock'.
    const service = new AgentCallerService(makeConfig({}), makeRedis(true));

    const [result, model] = await service.call({
      outputSchema: schema,
      system: 's',
      context: { foo: 'bar' },
      mockFactory: (ctx) => ({ answer: `mock for ${(ctx as any).foo}` }),
    });

    expect(result).toEqual({ answer: 'mock for bar' });
    expect(model).toBe('mock');
    expect(mockParse).not.toHaveBeenCalled();
  });

  it('live mode with no API key throws AnalysisUnavailableError', async () => {
    const service = new AgentCallerService(makeConfig({ AI_AGENT_MODE: 'live' }), makeRedis(true));

    await expect(call(service)).rejects.toThrow(AnalysisUnavailableError);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it('rejects before calling the SDK when the rate limit is exceeded', async () => {
    const service = new AgentCallerService(
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(false),
    );

    await expect(call(service)).rejects.toThrow(RateLimitExceededError);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it('wraps a raw SDK error as AnalysisUnavailableError', async () => {
    const service = new AgentCallerService(
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
    );
    mockParse.mockRejectedValueOnce(new Error('network down'));

    await expect(call(service)).rejects.toThrow(AnalysisUnavailableError);
  });

  it('wraps a "refusal" stop_reason as AnalysisUnavailableError', async () => {
    const service = new AgentCallerService(
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
    );
    mockParse.mockResolvedValueOnce({ stop_reason: 'refusal', parsed_output: null });

    await expect(call(service)).rejects.toThrow(AnalysisUnavailableError);
  });

  it('wraps a null parsed_output as AnalysisUnavailableError', async () => {
    const service = new AgentCallerService(
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live' }),
      makeRedis(true),
    );
    mockParse.mockResolvedValueOnce({ stop_reason: 'end_turn', parsed_output: null });

    await expect(call(service)).rejects.toThrow(AnalysisUnavailableError);
  });

  it('returns [parsed, model] on a successful live call', async () => {
    const service = new AgentCallerService(
      makeConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_AGENT_MODE: 'live', ANTHROPIC_MODEL: 'claude-test-model' }),
      makeRedis(true),
    );
    mockParse.mockResolvedValueOnce({ stop_reason: 'end_turn', parsed_output: { answer: 'real answer' } });

    const [result, model] = await call(service);

    expect(result).toEqual({ answer: 'real answer' });
    expect(model).toBe('claude-test-model');
  });
});
