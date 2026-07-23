import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { CompetitionsService, SportKey } from '../../competitions/competitions.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { TransferStoryAssessmentSchema, TransferStoryAssessment } from './transfer-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld Transfer Agent. You receive a JSON list of
scraped transfer-rumor reports that have all been grouped as describing the SAME transfer
story (same player, same destination club). Each report has its source's name, credibility
score (0-100), the report text, that source's own published probability (if any), and when
it was reported.

Write a short synthesis of the story across all reports, and give your OWN probability
estimate (0-100) that the transfer actually happens — weigh source credibility and how many
independent sources are reporting it, not just an average of their individual numbers.

You must produce BOTH an English summary AND a Hebrew summary (summaryHe). The Hebrew
version must be written natively by a professional Hebrew sports journalist covering the
transfer market — natural idiomatic phrasing and word order, the same quality bar as a
real Hebrew sports outlet — NOT a literal or machine translation of the English text.
Write each language version independently so it reads as an original, not a translated
copy.`;

const norm = (s: string) => s.trim().toLowerCase();

@Injectable()
export class TransferAgentService {
  private readonly logger = new Logger(TransferAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCaller: AgentCallerService,
    private readonly competitions: CompetitionsService,
    private readonly translations: TranslationsService,
  ) {}

  /** Best-effort competition tagging (see CompetitionsService.competitionsForText)
   * — fromClub/toClub are structured text already, no headline-parsing
   * needed, just matched directly against known Team names. */
  private async tagStoryCompetitions(storyId: number, fromClub: string | null, toClub: string) {
    const text = `${fromClub ?? ''} ${toClub}`;
    const competitionIds = await this.competitions.competitionsForText(text);
    if (competitionIds.length === 0) return;
    await this.prisma.transferStory.update({
      where: { id: storyId },
      data: { competitions: { set: competitionIds.map((id) => ({ id })) } },
    });
  }

  private mockAssessment(reportCount: number): TransferStoryAssessment {
    return {
      probability: 40,
      summary: `[Mock] Simulated synthesis across ${reportCount} report(s). No real Claude API call was made.`,
      summaryHe: `[מוק] סינתזה מדומה על פני ${reportCount} דיווחים. לא בוצעה קריאה אמיתית ל-API של קלוד.`,
    };
  }

  /** Groups any newly-scraped, ungrouped reports into TransferStory rows,
   * then scores any story that hasn't been scored yet. Run on a schedule
   * (see TransferAgentSchedulerService) rather than per-request, mirroring
   * how the Phase 6 ingestion services themselves run on a timer. */
  async groupAndScoreStories() {
    await this.groupUngroupedReports();
    await this.scoreUnscoredStories();
  }

  private async groupUngroupedReports() {
    const ungrouped = await this.prisma.transferReport.findMany({ where: { storyId: null } });
    let grouped = 0;

    for (const report of ungrouped) {
      const candidates = await this.prisma.transferStory.findMany({
        where: { toClub: { equals: report.toClub, mode: 'insensitive' } },
      });
      const match = candidates.find((c) => norm(c.playerName) === norm(report.playerName));

      let story = match;
      if (!story) {
        story = await this.prisma.transferStory.create({
          data: {
            playerName: report.playerName,
            fromClub: report.fromClub,
            toClub: report.toClub,
            status: report.status,
          },
        });
        await this.tagStoryCompetitions(story.id, report.fromClub, report.toClub);
      }

      await this.prisma.transferReport.update({ where: { id: report.id }, data: { storyId: story.id } });
      grouped++;
    }

    if (grouped > 0) this.logger.log(`Transfer Agent: grouped ${grouped} report(s) into stories`);
  }

  private async scoreUnscoredStories() {
    // Also catches stories scored before aiSummaryHe existed (a one-time
    // catch-up backfill, 2026-07-22) — same self-healing OR as
    // NewsAgentService.summarizeUnsummarizedClusters, see that comment.
    const unscored = await this.prisma.transferStory.findMany({
      where: { OR: [{ estimatedProbability: null }, { aiSummaryHe: null }] },
      include: { reports: { include: { source: true } } },
    });

    for (const story of unscored) {
      if (story.reports.length === 0) continue;

      const context = {
        player_name: story.playerName,
        from_club: story.fromClub,
        to_club: story.toClub,
        reports: story.reports.map((r) => ({
          source: r.source.name,
          source_credibility: r.source.credibilityScore,
          description: r.description,
          source_probability: r.sourceProbability,
          reported_at: r.reportedAt.toISOString(),
        })),
      };

      this.logger.log(`Requesting transfer story assessment for story ${story.id} (${story.playerName})`);
      const [assessment] = await this.agentCaller.call<TransferStoryAssessment>({
        outputSchema: TransferStoryAssessmentSchema,
        system: SYSTEM_PROMPT,
        context,
        mockFactory: () => this.mockAssessment(story.reports.length),
      });

      await this.prisma.transferStory.update({
        where: { id: story.id },
        data: {
          estimatedProbability: Math.max(0, Math.min(100, Math.round(assessment.probability))),
          aiSummary: assessment.summary,
          aiSummaryHe: assessment.summaryHe,
        },
      });
    }
  }

  /** competitionSlug requires sportKey too (slugs are only unique per
   * sport), same requirement as NewsService.recentArticles /
   * NewsAgentService.listClusters. lang picks aiSummaryHe (AI-generated
   * Hebrew, see groupAndScoreStories) when present, falling back to
   * aiSummary — same graceful-degradation philosophy as
   * TranslationsService.translate. player_name/from_club/to_club (story-
   * level and per-report) are additionally run through the static
   * NameTranslation dictionary via translateMany — best-effort, most
   * scraped names won't have an entry and fall back to English unchanged,
   * which is expected. */
  async listStories(limit = 30, lang: Lang = 'en', sportKey?: SportKey, competitionSlug?: string) {
    let competitionId: number | undefined;
    if (sportKey && competitionSlug) {
      const row = await this.competitions.findBySlug(sportKey, competitionSlug);
      if (!row) return [];
      competitionId = row.id;
    }

    const stories = await this.prisma.transferStory.findMany({
      where: competitionId ? { competitions: { some: { id: competitionId } } } : {},
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { reports: { include: { source: true }, orderBy: { reportedAt: 'desc' } } },
    });

    const names = new Set<string>();
    for (const s of stories) {
      names.add(s.playerName);
      if (s.fromClub) names.add(s.fromClub);
      names.add(s.toClub);
      for (const r of s.reports) {
        names.add(r.playerName);
        if (r.fromClub) names.add(r.fromClub);
        names.add(r.toClub);
      }
    }
    const translated = await this.translations.translateMany([...names], lang);

    return stories.map((s) => ({
      id: s.id,
      player_name: translated[s.playerName] ?? s.playerName,
      from_club: s.fromClub ? translated[s.fromClub] ?? s.fromClub : s.fromClub,
      to_club: translated[s.toClub] ?? s.toClub,
      status: s.status,
      estimated_probability: s.estimatedProbability,
      ai_summary: lang === 'he' && s.aiSummaryHe ? s.aiSummaryHe : s.aiSummary,
      reports: s.reports.map((r) => ({
        source: r.source.name,
        source_credibility: r.source.credibilityScore,
        description: r.description,
        source_url: r.sourceUrl,
        source_probability: r.sourceProbability,
        reported_at: r.reportedAt.toISOString(),
      })),
      updated_at: s.updatedAt.toISOString(),
    }));
  }
}
