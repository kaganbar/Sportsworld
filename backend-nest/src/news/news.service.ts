import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionsService, SportKey } from '../competitions/competitions.service';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionsService,
  ) {}

  /** competitionSlug requires sportKey too (slugs are only unique per
   * sport) — filters to articles whose cluster has been tagged with that
   * competition (see NewsAgentService.tagClusterCompetitions). Articles
   * whose cluster hasn't been tagged (or aren't clustered yet) are
   * excluded when a competition filter is active, same as any best-effort
   * tagging gap — they still show up unfiltered. */
  async recentArticles(limit = 30, sportKey?: SportKey, competitionSlug?: string) {
    let competitionId: number | undefined;
    if (sportKey && competitionSlug) {
      const row = await this.competitions.findBySlug(sportKey, competitionSlug);
      if (!row) return [];
      competitionId = row.id;
    }

    const articles = await this.prisma.newsArticle.findMany({
      where: competitionId ? { cluster: { competitions: { some: { id: competitionId } } } } : {},
      include: { source: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return articles.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      summary: a.summary,
      published_at: a.publishedAt.toISOString(),
      source: a.source.name,
    }));
  }
}
