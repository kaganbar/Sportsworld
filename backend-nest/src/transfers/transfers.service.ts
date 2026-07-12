import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionsService, SportKey } from '../competitions/competitions.service';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionsService,
  ) {}

  /** Same best-effort filtering pattern as NewsService.recentArticles —
   * filters to reports whose grouped story has been tagged with that
   * competition (see TransferAgentService.tagStoryCompetitions). */
  async recentRumours(limit = 30, sportKey?: SportKey, competitionSlug?: string) {
    let competitionId: number | undefined;
    if (sportKey && competitionSlug) {
      const row = await this.competitions.findBySlug(sportKey, competitionSlug);
      if (!row) return [];
      competitionId = row.id;
    }

    const reports = await this.prisma.transferReport.findMany({
      where: competitionId ? { story: { competitions: { some: { id: competitionId } } } } : {},
      include: { source: true },
      orderBy: { reportedAt: 'desc' },
      take: limit,
    });
    return reports.map((r) => ({
      id: r.id,
      player_name: r.playerName,
      from_club: r.fromClub,
      to_club: r.toClub,
      status: r.status,
      description: r.description,
      source: r.source.name,
      source_url: r.sourceUrl,
      source_probability: r.sourceProbability,
      reported_at: r.reportedAt.toISOString(),
    }));
  }
}
