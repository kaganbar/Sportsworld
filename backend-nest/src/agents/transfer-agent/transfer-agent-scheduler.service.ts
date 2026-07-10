import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TransferAgentService } from './transfer-agent.service';

// Same hourly cadence as TransferIngestService's own scrape cycle (Phase 6)
// — a separate timer rather than hooking directly into that service, so this
// phase doesn't touch already-verified Phase 6 ingestion code.
const POLL_MS = 60 * 60 * 1000;

@Injectable()
export class TransferAgentSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TransferAgentSchedulerService.name);

  constructor(private readonly transferAgent: TransferAgentService) {}

  onApplicationBootstrap() {
    this.run();
  }

  @Interval(POLL_MS)
  async run() {
    try {
      await this.transferAgent.groupAndScoreStories();
    } catch (err) {
      this.logger.error(`Transfer Agent grouping/scoring failed: ${(err as Error).message}`);
    }
  }
}
