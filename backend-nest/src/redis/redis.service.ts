import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Three roles per ARCHITECTURE.md's Phase 9: (1) pub/sub so a game tick
// produced on any backend instance reaches WebSocket clients connected to
// any other instance, (2) a read-through cache for hot/slow-changing reads,
// (3) a fixed-window counter used to rate-limit real (paid) Claude calls.
//
// ioredis requires a dedicated connection once .subscribe() is called on it
// (a subscriber connection can't run other commands), so this holds two
// clients: `client` for everything else, `subscriber` for pub/sub only.
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private subscriber!: Redis;
  private readonly channelHandlers = new Map<string, (message: string) => void>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({ host, port, lazyConnect: false });
    this.subscriber = new Redis({ host, port, lazyConnect: false });

    this.client.on('error', (err) => this.logger.error(`Redis client error: ${err.message}`));
    this.subscriber.on('error', (err) => this.logger.error(`Redis subscriber error: ${err.message}`));

    this.subscriber.on('message', (channel: string, message: string) => {
      this.channelHandlers.get(channel)?.(message);
    });
  }

  async onModuleDestroy() {
    await Promise.all([this.client?.quit(), this.subscriber?.quit()]);
  }

  publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /** One handler per channel — matches how LiveGateway uses a single shared
   * 'game-ticks' channel and filters by gameKey itself, rather than
   * subscribing/unsubscribing per game. */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.channelHandlers.set(channel, handler);
    await this.subscriber.subscribe(channel);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /** Fixed-window counter. Returns true if the call is allowed (under
   * limit), false if it should be rejected. Global (not per-IP/per-user) —
   * this protects the app's overall real-Claude-call spend, not
   * per-client abuse. */
  async checkRateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${bucket}:${window}`;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, windowSeconds);
    return count <= limit;
  }
}
