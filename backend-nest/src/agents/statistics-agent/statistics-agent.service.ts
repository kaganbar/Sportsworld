import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { StatisticsAnalysisOutputSchema, StatisticsAnalysisOutput } from './statistics-agent.schema';

export type StatsSport = 'football' | 'basketball' | 'tennis';

const SYSTEM_PROMPT = `You are the SportsWorld Statistics Agent. You receive structured
real statistical data as JSON for a single team or player: their recent results and
aggregate form stats (played/wins/draws/losses/goals, or wins/losses for tennis).

Write an insightful, grounded narrative about this team's or player's current form.
Use ONLY the data provided — do not invent or estimate advanced metrics that are not
in the context (no xG, no possession percentages, no shot counts, no serve/return
stats). If the data is limited, say so rather than filling gaps with invented detail.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: "\n\nWrite the summary and key_points in Hebrew (עברית). Use the Hebrew team/player name exactly as given in the context — do not use English/Latin spellings.",
};

@Injectable()
export class StatisticsAgentService {
  private readonly logger = new Logger(StatisticsAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  /** Validates that `teamId` is really a `sport` team before anything else
   * touches it. Must run before the StatisticsAnalysis cache read in
   * getOrCreateStatistics: that cache is keyed only on (teamId, language)
   * with no sport in the key, and football/basketball share the same Team
   * table and id sequence — an out-of-band `sport` (this endpoint's `sport`
   * route param is arbitrary client input, not derived from the team
   * itself) paired with a teamId that already has a cached analysis would
   * otherwise silently return that team's real-sport analysis mislabeled as
   * the requested sport, instead of 400ing. */
  private async findTeamOrThrow(sport: StatsSport, teamId: number) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    if (team.sport !== sport) {
      throw new BadRequestException(`Team ${teamId} is not a ${sport} team`);
    }
    return team;
  }

  private async buildTeamContext(team: { id: number; name: string }, sport: StatsSport, lang: Lang) {
    const tr = (text: string) => this.translations.translate(text, lang);
    const teamId = team.id;

    const [recent, formStats] = await Promise.all([
      this.stats.teamRecentResults(teamId),
      this.stats.teamFormStats(teamId),
    ]);

    const recentDtos = await Promise.all(
      recent.map(async (r: any) => {
        const isHome = r.homeTeamId === teamId;
        const opponent = isHome ? r.awayTeam.name : r.homeTeam.name;
        const scored = isHome ? r.homeScore : r.awayScore;
        const conceded = isHome ? r.awayScore : r.homeScore;
        return {
          date: r.date.toISOString().slice(0, 10),
          competition: await tr(r.competition),
          opponent: await tr(opponent),
          score: `${scored}-${conceded}`,
          result: scored > conceded ? 'W' : scored === conceded ? 'D' : 'L',
        };
      }),
    );

    return { team: { name: await tr(team.name), sport }, recent_form: recentDtos, form_stats: formStats };
  }

  private async buildPlayerContext(playerId: number, lang: Lang) {
    const tr = (text: string) => this.translations.translate(text, lang);

    const player = await this.prisma.tennisPlayer.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException(`Tennis player ${playerId} not found`);

    const [recent, formStats] = await Promise.all([
      this.stats.tennisRecentResults(playerId),
      this.stats.tennisFormStats(playerId),
    ]);

    const recentDtos = await Promise.all(
      recent.map(async (m: any) => {
        const isP1 = m.player1Id === playerId;
        const opponent = isP1 ? m.player2.name : m.player1.name;
        return {
          date: m.startTime.toISOString().slice(0, 10),
          tournament: await tr(m.tournament),
          round: m.round,
          opponent: await tr(opponent),
          result: m.winnerId === playerId ? 'win' : 'loss',
        };
      }),
    );

    return {
      team: { name: await tr(player.name), sport: 'tennis' as const, ranking: player.ranking },
      recent_form: recentDtos,
      form_stats: formStats,
    };
  }

  private mockAnalysis(subjectName: string, lang: Lang): StatisticsAnalysisOutput {
    const summary =
      lang === 'he'
        ? `[מדומה] ניתוח סטטיסטי לדוגמה עבור ${subjectName}. ` +
          'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude.'
        : `[Mock] Simulated statistical digest for ${subjectName}. ` +
          'This is fixed placeholder text for development — no real Claude API call was made.';
    const keyPoints =
      lang === 'he'
        ? ['[מדומה] נקודת סטטיסטיקה לדוגמה אחת', '[מדומה] נקודת סטטיסטיקה לדוגמה שתיים']
        : ['[Mock] Placeholder statistical point one', '[Mock] Placeholder statistical point two'];

    return { summary, key_points: keyPoints, confidence: 'medium' };
  }

  async getOrCreateStatistics(sport: StatsSport, subjectId: number, lang: Lang) {
    const isTennis = sport === 'tennis';
    const team = isTennis ? null : await this.findTeamOrThrow(sport, subjectId);

    const existing = isTennis
      ? await this.prisma.statisticsAnalysis.findUnique({
          where: { tennisPlayerId_language: { tennisPlayerId: subjectId, language: lang } },
        })
      : await this.prisma.statisticsAnalysis.findUnique({
          where: { teamId_language: { teamId: subjectId, language: lang } },
        });
    if (existing) return existing;

    const context = isTennis
      ? await this.buildPlayerContext(subjectId, lang)
      : await this.buildTeamContext(team!, sport, lang);

    this.logger.log(`Requesting statistics analysis for ${sport} subject ${subjectId} (lang=${lang})`);
    const [analysis, modelLabel] = await this.agentCaller.call<StatisticsAnalysisOutput>({
      outputSchema: StatisticsAnalysisOutputSchema,
      system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
      context,
      mockFactory: () => this.mockAnalysis(context.team.name, lang),
    });

    return this.prisma.statisticsAnalysis.create({
      data: {
        sport,
        teamId: isTennis ? undefined : subjectId,
        tennisPlayerId: isTennis ? subjectId : undefined,
        language: lang,
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        confidence: analysis.confidence,
        model: modelLabel,
      },
    });
  }
}
