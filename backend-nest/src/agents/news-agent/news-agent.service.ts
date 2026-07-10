import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { NewsClusterSummarySchema, NewsClusterSummary } from './news-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld News Agent. You receive a JSON list of
sports news articles that have all been grouped as covering the SAME underlying story
(by title-keyword overlap). Each has its title, source, an optional summary, and when
it was published.

Write one concise headline and a short neutral summary that synthesizes what all the
articles are reporting into a single coherent story.`;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'as', 'by', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'had', 'his', 'her',
  'its', 'their', 'this', 'that', 'from', 'after', 'over', 'into', 'about', 'says',
  'said', 'will', 'new', 'vs',
]);

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const w of a) if (b.has(w)) count++;
  return count;
}

// Minimum shared significant words for two articles/clusters to be
// considered the same story. A heuristic, not an AI call — dedup/grouping
// stays cheap and deterministic; Claude is only used for the summarization
// step per cluster, not for deciding cluster membership.
const MIN_SHARED_WORDS = 2;

@Injectable()
export class NewsAgentService {
  private readonly logger = new Logger(NewsAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  private mockSummary(articleCount: number): NewsClusterSummary {
    return {
      headline: '[Mock] Simulated cluster headline',
      summary: `[Mock] Simulated synthesis across ${articleCount} article(s). No real Claude API call was made.`,
    };
  }

  /** Clusters any newly-ingested, unclustered articles by title-keyword
   * overlap, then summarizes any cluster that hasn't been summarized yet.
   * Run on a schedule (see NewsAgentSchedulerService). */
  async clusterAndSummarize() {
    await this.clusterUnclusteredArticles();
    await this.summarizeUnsummarizedClusters();
  }

  private async clusterUnclusteredArticles() {
    const unclustered = await this.prisma.newsArticle.findMany({ where: { clusterId: null } });
    if (unclustered.length === 0) return;

    const existingClusters = await this.prisma.newsStoryCluster.findMany();
    const clusterTokens = new Map<number, Set<string>>(
      existingClusters.map((c) => [c.id, significantWords(c.headline)]),
    );
    // Buckets created during this run, keyed by a temporary index, since
    // they don't have a DB id yet.
    const newBuckets: { tokens: Set<string>; articleIds: number[]; headline: string }[] = [];

    let clustered = 0;
    for (const article of unclustered) {
      const tokens = significantWords(article.title);

      let matchedClusterId: number | null = null;
      for (const [id, existingTokens] of clusterTokens) {
        if (overlapCount(tokens, existingTokens) >= MIN_SHARED_WORDS) {
          matchedClusterId = id;
          break;
        }
      }

      if (matchedClusterId != null) {
        await this.prisma.newsArticle.update({ where: { id: article.id }, data: { clusterId: matchedClusterId } });
        clustered++;
        continue;
      }

      const bucket = newBuckets.find((b) => overlapCount(tokens, b.tokens) >= MIN_SHARED_WORDS);
      if (bucket) {
        bucket.articleIds.push(article.id);
        for (const w of tokens) bucket.tokens.add(w);
      } else {
        newBuckets.push({ tokens, articleIds: [article.id], headline: article.title });
      }
    }

    for (const bucket of newBuckets) {
      const cluster = await this.prisma.newsStoryCluster.create({ data: { headline: bucket.headline } });
      await this.prisma.newsArticle.updateMany({
        where: { id: { in: bucket.articleIds } },
        data: { clusterId: cluster.id },
      });
      clustered += bucket.articleIds.length;
    }

    if (clustered > 0) this.logger.log(`News Agent: clustered ${clustered} article(s) into ${newBuckets.length} new cluster(s)`);
  }

  private async summarizeUnsummarizedClusters() {
    const unsummarized = await this.prisma.newsStoryCluster.findMany({
      where: { summary: null },
      include: { articles: { include: { source: true } } },
    });

    for (const cluster of unsummarized) {
      if (cluster.articles.length === 0) continue;

      const context = {
        articles: cluster.articles.map((a) => ({
          title: a.title,
          source: a.source.name,
          summary: a.summary,
          published_at: a.publishedAt.toISOString(),
        })),
      };

      this.logger.log(`Requesting news cluster summary for cluster ${cluster.id}`);
      const [result] = await this.agentCaller.call<NewsClusterSummary>({
        outputSchema: NewsClusterSummarySchema,
        system: SYSTEM_PROMPT,
        context,
        mockFactory: () => this.mockSummary(cluster.articles.length),
      });

      await this.prisma.newsStoryCluster.update({
        where: { id: cluster.id },
        data: { headline: result.headline, summary: result.summary },
      });
    }
  }

  async listClusters(limit = 30) {
    const clusters = await this.prisma.newsStoryCluster.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { articles: { include: { source: true }, orderBy: { publishedAt: 'desc' } } },
    });

    return clusters.map((c) => ({
      id: c.id,
      headline: c.headline,
      summary: c.summary,
      sport: c.sport,
      articles: c.articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source.name,
        published_at: a.publishedAt.toISOString(),
      })),
      updated_at: c.updatedAt.toISOString(),
    }));
  }
}
