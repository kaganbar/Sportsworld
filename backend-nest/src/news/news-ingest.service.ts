import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { fetchSportsHeadlines } from './newsapi.client';

// Hourly, not on the ~45s cadence the live-scores scraper uses — NewsAPI's
// free "Developer" tier is quota-limited (~100 requests/day), and sports
// headlines don't change fast enough to justify polling harder than that.
const POLL_MS = 60 * 60 * 1000;

@Injectable()
export class NewsIngestService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NewsIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get apiKey(): string {
    return this.config.get<string>('NEWS_API_KEY', '');
  }

  onApplicationBootstrap() {
    if (this.apiKey) this.poll();
  }

  @Interval(POLL_MS)
  async poll() {
    if (!this.apiKey) return; // no key configured — News Center stays on its placeholder
    try {
      const articles = await fetchSportsHeadlines(this.apiKey);
      let created = 0;
      for (const article of articles) {
        const source = await this.prisma.contentSource.upsert({
          where: { name: article.source.name },
          update: {},
          create: { name: article.source.name },
        });

        const existing = await this.prisma.newsArticle.findUnique({ where: { url: article.url } });
        if (existing) continue;

        await this.prisma.newsArticle.create({
          data: {
            sourceId: source.id,
            title: article.title,
            url: article.url,
            summary: article.description,
            publishedAt: new Date(article.publishedAt),
          },
        });
        created++;
      }
      this.logger.log(`NewsAPI: ${articles.length} headlines fetched, ${created} new`);
    } catch (err) {
      this.logger.error(`NewsAPI fetch failed: ${(err as Error).message}`);
    }
  }
}
