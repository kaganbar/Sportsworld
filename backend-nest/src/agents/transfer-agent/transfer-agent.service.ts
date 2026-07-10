import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentCallerService } from '../common/agent-caller.service';
import { TransferStoryAssessmentSchema, TransferStoryAssessment } from './transfer-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld Transfer Agent. You receive a JSON list of
scraped transfer-rumor reports that have all been grouped as describing the SAME transfer
story (same player, same destination club). Each report has its source's name, credibility
score (0-100), the report text, that source's own published probability (if any), and when
it was reported.

Write a short synthesis of the story across all reports, and give your OWN probability
estimate (0-100) that the transfer actually happens — weigh source credibility and how many
independent sources are reporting it, not just an average of their individual numbers.`;

const norm = (s: string) => s.trim().toLowerCase();

@Injectable()
export class TransferAgentService {
  private readonly logger = new Logger(TransferAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  private mockAssessment(reportCount: number): TransferStoryAssessment {
    return {
      probability: 40,
      summary: `[Mock] Simulated synthesis across ${reportCount} report(s). No real Claude API call was made.`,
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

      const story =
        match ??
        (await this.prisma.transferStory.create({
          data: {
            playerName: report.playerName,
            fromClub: report.fromClub,
            toClub: report.toClub,
            status: report.status,
          },
        }));

      await this.prisma.transferReport.update({ where: { id: report.id }, data: { storyId: story.id } });
      grouped++;
    }

    if (grouped > 0) this.logger.log(`Transfer Agent: grouped ${grouped} report(s) into stories`);
  }

  private async scoreUnscoredStories() {
    const unscored = await this.prisma.transferStory.findMany({
      where: { estimatedProbability: null },
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
        },
      });
    }
  }

  async listStories(limit = 30) {
    const stories = await this.prisma.transferStory.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { reports: { include: { source: true }, orderBy: { reportedAt: 'desc' } } },
    });

    return stories.map((s) => ({
      id: s.id,
      player_name: s.playerName,
      from_club: s.fromClub,
      to_club: s.toClub,
      status: s.status,
      estimated_probability: s.estimatedProbability,
      ai_summary: s.aiSummary,
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
