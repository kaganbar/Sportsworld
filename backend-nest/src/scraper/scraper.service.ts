import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Parser } from './parsers/parser.interface';
import { Scores365FootballParser } from './parsers/scores365/scores365-football.parser';
import { Scores365BasketballParser } from './parsers/scores365/scores365-basketball.parser';
import { Scores365TennisParser } from './parsers/scores365/scores365-tennis.parser';
import { NormalizeService } from './normalize.service';

const POLL_MS = 45000;

// Orchestrates every registered Parser on a fixed interval: fetch -> parse
// -> NormalizeService.upsertEvent (which itself diffs and emits WS ticks).
// Adding a new source is "write a Parser, add it to this array" — nothing
// else in the pipeline changes. Gated by LIVE_DATA_SOURCE so this can be
// turned off without touching code (see SimulatedTickerService for the
// counterpart flag on the old mock ticker).
@Injectable()
export class ScraperService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScraperService.name);
  private readonly parsers: Parser[];
  private running = false;

  constructor(
    football: Scores365FootballParser,
    basketball: Scores365BasketballParser,
    tennis: Scores365TennisParser,
    private readonly normalize: NormalizeService,
    private readonly config: ConfigService,
  ) {
    this.parsers = [football, basketball, tennis];
  }

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
      await Promise.all(this.parsers.map((p) => this.runParser(p)));
    } finally {
      this.running = false;
    }
  }

  private async runParser(parser: Parser) {
    try {
      const raw = await parser.fetch();
      const events = parser.parse(raw);
      this.logger.log(`${parser.sourceId}/${parser.sport}: ${events.length} fixtures`);
      for (const event of events) {
        try {
          await this.normalize.upsertEvent(event);
        } catch (err) {
          this.logger.error(`Failed to upsert ${event.sourceId}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.error(`${parser.sourceId}/${parser.sport} fetch failed: ${(err as Error).message}`);
    }
  }
}
