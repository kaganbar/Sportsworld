import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { fetchTransferRumours } from './transfermarkt.client';

// Hourly, same conservative cadence as News — this is a real scraped site
// (a ToS gray area, same category of risk already accepted for 365scores),
// not a published API with documented rate limits, so there's extra reason
// not to hammer it.
const POLL_MS = 60 * 60 * 1000;

@Injectable()
export class TransferIngestService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TransferIngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.poll();
  }

  @Interval(POLL_MS)
  async poll() {
    try {
      const rumours = await fetchTransferRumours();
      const source = await this.prisma.contentSource.upsert({
        where: { name: 'Transfermarkt' },
        update: {},
        create: { name: 'Transfermarkt', url: 'https://www.transfermarkt.com' },
      });

      let created = 0;
      for (const rumour of rumours) {
        const existing = await this.prisma.transferReport.findUnique({ where: { sourceUrl: rumour.sourceUrl } });
        if (existing) continue;

        await this.prisma.transferReport.create({
          data: {
            sourceId: source.id,
            playerName: rumour.playerName,
            fromClub: rumour.fromClub,
            toClub: rumour.toClub,
            status: 'rumor',
            description: rumour.competition
              ? `Linked with a move to ${rumour.toClub} (${rumour.competition})`
              : `Linked with a move to ${rumour.toClub}`,
            sourceUrl: rumour.sourceUrl,
            sourceProbability: rumour.probability,
            reportedAt: rumour.reportedAt,
          },
        });
        created++;
      }
      this.logger.log(`Transfermarkt: ${rumours.length} rumours fetched, ${created} new`);
    } catch (err) {
      this.logger.error(`Transfermarkt fetch failed: ${(err as Error).message}`);
    }
  }
}
