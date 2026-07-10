import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async recentRumours(limit = 30) {
    const reports = await this.prisma.transferReport.findMany({
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
