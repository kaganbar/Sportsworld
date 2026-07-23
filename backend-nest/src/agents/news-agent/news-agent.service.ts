import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { CompetitionsService, SportKey } from '../../competitions/competitions.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { NewsClusterSummarySchema, NewsClusterSummary } from './news-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld News Agent. You receive a JSON list of
sports news articles that have all been grouped as covering the SAME underlying story
(by title-keyword overlap). Each has its title, source, an optional summary, and when
it was published.

Write one concise headline and a short neutral summary that synthesizes what all the
articles are reporting into a single coherent story.

You must produce BOTH an English version (headline, summary) AND a Hebrew version
(headlineHe, summaryHe). The Hebrew version must be written natively by a professional
Hebrew sports journalist — natural idiomatic phrasing and word order, the same quality
bar as a real Hebrew sports outlet — NOT a literal or machine translation of the English
text. Write each language version independently so it reads as an original, not a
translated copy.`;

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
    private readonly competitions: CompetitionsService,
    private readonly translations: TranslationsService,
  ) {}

  /** News mentioning a given subject by name — a team (football/basketball)
   * or a player (tennis) — used by each sport agent's enrichment tool loop.
   * There's no dedicated subject<->cluster relation, so this reuses the same
   * case-insensitive substring match CompetitionsService.competitionsForText
   * already does internally (it computes this exact match today only to
   * derive competition IDs from it, discarding the match itself). In-memory
   * filter over a bounded recent window rather than a DB text-search index —
   * this is a dev-scale scraper-fed dataset, not worth the extra
   * infrastructure. */
  async getNewsForSubject(subjectName: string, lang: Lang, limit = 5) {
    const needle = subjectName.toLowerCase();
    const recent = await this.prisma.newsStoryCluster.findMany({
      where: { summary: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: { articles: true },
    });

    const matches = recent.filter((c) => {
      const haystack = [c.headline, c.summary ?? '', ...c.articles.map((a) => a.title)].join(' ').toLowerCase();
      return haystack.includes(needle);
    });

    return Promise.all(
      matches.slice(0, limit).map(async (c) => ({
        headline: await this.translations.translate(c.headline, lang),
        summary: c.summary ? await this.translations.translate(c.summary, lang) : null,
        updated_at: c.updatedAt.toISOString(),
      })),
    );
  }

  /** Best-effort competition tagging (see CompetitionsService.competitionsForText):
   * matches team/player names mentioned in the cluster's own text against
   * known Team/TennisPlayer names, no new Claude call — deterministic
   * string matching, same cost profile as clustering itself. */
  private async tagClusterCompetitions(clusterId: number, text: string) {
    const competitionIds = await this.competitions.competitionsForText(text);
    if (competitionIds.length === 0) return;
    await this.prisma.newsStoryCluster.update({
      where: { id: clusterId },
      data: { competitions: { set: competitionIds.map((id) => ({ id })) } },
    });
  }

  private mockSummary(articleCount: number): NewsClusterSummary {
    return {
      headline: '[Mock] Simulated cluster headline',
      summary: `[Mock] Simulated synthesis across ${articleCount} article(s). No real Claude API call was made.`,
      headlineHe: '[מוק] כותרת מדומה לאשכול החדשות',
      summaryHe: `[מוק] סינתזה מדומה על פני ${articleCount} כתבות. לא בוצעה קריאה אמיתית ל-API של קלוד.`,
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
      await this.tagClusterCompetitions(cluster.id, bucket.headline);
      clustered += bucket.articleIds.length;
    }

    if (clustered > 0) this.logger.log(`News Agent: clustered ${clustered} article(s) into ${newBuckets.length} new cluster(s)`);
  }

  private async summarizeUnsummarizedClusters() {
    // Also catches clusters summarized before headlineHe/summaryHe existed
    // (a one-time catch-up backfill, 2026-07-22) — once a cluster has both,
    // this condition collapses back to `summary: null` for it, so this
    // isn't a permanent double-processing cost, just self-healing for any
    // row that's missing either half.
    const unsummarized = await this.prisma.newsStoryCluster.findMany({
      where: { OR: [{ summary: null }, { headlineHe: null }] },
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
        data: {
          headline: result.headline,
          summary: result.summary,
          headlineHe: result.headlineHe,
          summaryHe: result.summaryHe,
        },
      });
      // Re-tag with the fuller summarized text — more team-name surface
      // area than the raw first-article headline used at cluster creation.
      await this.tagClusterCompetitions(cluster.id, `${result.headline} ${result.summary}`);
    }
  }

  /** competitionSlug requires sportKey too (slugs are only unique per
   * sport), same requirement as NewsService.recentArticles. lang picks
   * headlineHe/summaryHe (AI-generated Hebrew, see clusterAndSummarize)
   * when present, falling back to the English column — same
   * graceful-degradation philosophy as TranslationsService.translate,
   * but sourced from the agent's own output rather than the static
   * dictionary (free-form article text can't be dictionary-translated). */
  async listClusters(limit = 30, lang: Lang = 'en', sportKey?: SportKey, competitionSlug?: string) {
    let competitionId: number | undefined;
    if (sportKey && competitionSlug) {
      const row = await this.competitions.findBySlug(sportKey, competitionSlug);
      if (!row) return [];
      competitionId = row.id;
    }

    const clusters = await this.prisma.newsStoryCluster.findMany({
      where: competitionId ? { competitions: { some: { id: competitionId } } } : {},
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { articles: { include: { source: true }, orderBy: { publishedAt: 'desc' } } },
    });

    return clusters.map((c) => ({
      id: c.id,
      headline: lang === 'he' && c.headlineHe ? c.headlineHe : c.headline,
      summary: lang === 'he' && c.summaryHe ? c.summaryHe : c.summary,
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
