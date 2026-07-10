import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// A minimal fake standing in for every `new Redis(...)` call, backed by one
// shared in-memory store — mirrors how RedisService's two real connections
// (client + subscriber) talk to the same physical Redis server and would
// see each other's writes.
const store = new Map<string, number>();

class FakeRedis {
  incr = jest.fn(async (key: string) => {
    const next = (store.get(key) ?? 0) + 1;
    store.set(key, next);
    return next;
  });
  expire = jest.fn(async (_key: string, _seconds: number) => 1);
  get = jest.fn(async () => null);
  set = jest.fn(async () => 'OK');
  publish = jest.fn(async () => 0);
  subscribe = jest.fn(async () => undefined);
  quit = jest.fn(async () => 'OK');
  on = jest.fn();
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => new FakeRedis()),
}));

function makeConfig(): ConfigService {
  return { get: (_key: string, defaultValue?: unknown) => defaultValue } as unknown as ConfigService;
}

describe('RedisService.checkRateLimit', () => {
  beforeEach(() => {
    store.clear();
  });

  it('allows calls up to the limit and denies the next one in the same window', async () => {
    const service = new RedisService(makeConfig());
    service.onModuleInit();

    const bucket = 'test-bucket';
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      results.push(await service.checkRateLimit(bucket, 5, 60));
    }

    expect(results).toEqual([true, true, true, true, true, false, false]);
  });

  it('tracks separate buckets independently', async () => {
    const service = new RedisService(makeConfig());
    service.onModuleInit();

    const a = await service.checkRateLimit('bucket-a', 1, 60);
    const b = await service.checkRateLimit('bucket-b', 1, 60);

    expect(a).toBe(true);
    expect(b).toBe(true);
  });

  it('only sets an expiry on the first increment of a window, not every call', async () => {
    const service = new RedisService(makeConfig());
    service.onModuleInit();
    const client = (service as any).client as FakeRedis;

    await service.checkRateLimit('expiry-bucket', 5, 60);
    await service.checkRateLimit('expiry-bucket', 5, 60);
    await service.checkRateLimit('expiry-bucket', 5, 60);

    expect(client.expire).toHaveBeenCalledTimes(1);
  });
});
