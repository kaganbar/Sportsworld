import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NewsAgentService } from './news-agent.service';

// Same hourly cadence as NewsIngestService's own fetch cycle (Phase 6) — a
// separate timer rather than hooking directly into that service, so this
// phase doesn't touch already-verified Phase 6 ingestion code.
const POLL_MS = 60 * 60 * 1000;

@Injectable()
export class NewsAgentSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NewsAgentSchedulerService.name);

  constructor(private readonly newsAgent: NewsAgentService) {}

  onApplicationBootstrap() {
    this.run();
  }

  @Interval(POLL_MS)
  async run() {
    try {
      await this.newsAgent.clusterAndSummarize();
    } catch (err) {
      this.logger.error(`News Agent clustering/summarizing failed: ${(err as Error).message}`);
    }
  }
}
