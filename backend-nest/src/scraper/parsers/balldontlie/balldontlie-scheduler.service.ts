import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { BalldontlieBasketballParser } from './balldontlie-basketball.parser';
import { NormalizeService } from '../../normalize.service';

// balldontlie's confirmed 5 requests/minute rate limit (see
// BalldontlieBasketballParser's doc comment) is far tighter than
// ScraperService's shared 45s loop can afford once this joins the 3
// 365scores parsers + football-data.org (10/min) already on it — one more
// parser on that loop would blow through 5/min fast, especially since NBA
// has far more teams/games per day than a single European league. So this
// source gets its own longer-interval timer instead, mirroring
// TransferAgentSchedulerService's (src/agents/transfer-agent/) separate-
// timer pattern rather than ScraperService's shared-loop one. One poll is
// exactly one balldontlie call (GET /v1/games?dates[]=today), so 90s keeps
// this at ~0.67 calls/min — comfortable headroom under the 5/min budget
// even while prisma/enrich-balldontlie-rosters.ts is also spending calls
// against the same key.
const POLL_MS = 90_000;

@Injectable()
export class BalldontlieSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BalldontlieSchedulerService.name);
  private running = false;

  constructor(
    private readonly parser: BalldontlieBasketballParser,
    private readonly normalize: NormalizeService,
    private readonly config: ConfigService,
  ) {}

  // Same LIVE_DATA_SOURCE flag ScraperService gates on — one switch turns
  // every real-data source off at once, not just the shared-loop ones.
  private get enabled(): boolean {
    return this.config.get<string>('LIVE_DATA_SOURCE', 'scraper') === 'scraper';
  }

  onApplicationBootstrap() {
    if (this.enabled) this.poll();
  }

  @Interval(POLL_MS)
  async poll() {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      const raw = await this.parser.fetch();
      const events = this.parser.parse(raw);
      this.logger.log(`${this.parser.sourceId}/${this.parser.sport}: ${events.length} fixtures`);
      for (const event of events) {
        try {
          await this.normalize.upsertEvent(event);
        } catch (err) {
          this.logger.error(`Failed to upsert ${event.sourceId}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.error(`${this.parser.sourceId}/${this.parser.sport} poll failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
