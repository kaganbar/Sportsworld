import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async recentArticles(limit = 30) {
    const articles = await this.prisma.newsArticle.findMany({
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
