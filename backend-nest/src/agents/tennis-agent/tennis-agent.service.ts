import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { normalizeTwoWay } from '../common/probability-normalizer';
import { TennisAnalysisSchema, TennisAnalysis } from './tennis-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld Tennis Agent, a professional tennis match
analyst. You receive structured pre-match context as JSON: the fixture (tournament,
round, surface implied by venue), each player's recent form, and the head-to-head
history between the two players.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent results or facts that are not in the context. Assess who arrives in better
form and why, and factor in the head-to-head record. Tennis matches cannot end in
a draw.

Your two probabilities (player1 win, player2 win) must be integers that sum to
exactly 100.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew player names exactly as given in the context — do not use English/Latin spellings.",
};

@Injectable()
export class TennisAgentService {
  private readonly logger = new Logger(TennisAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  private async findMatchOrThrow(matchId: number) {
    const match = await this.prisma.tennisMatch.findUnique({
      where: { id: matchId },
      include: { player1: true, player2: true },
    });
    if (!match) throw new NotFoundException(`Tennis match ${matchId} not found`);
    return match;
  }

  private async buildMatchContext(match: any, lang: Lang) {
    const tr = (text: string) => this.translations.translate(text, lang);

    const resultDtos = async (results: any[]) =>
      Promise.all(
        results.map(async (m) => ({
          date: m.startTime.toISOString().slice(0, 10),
          tournament: await tr(m.tournament),
          round: m.round,
          player1: await tr(m.player1.name),
          player2: await tr(m.player2.name),
          winner: m.winnerId ? await tr(m.winner.name) : null,
        })),
      );

    const [p1Recent, p2Recent, h2h, p1Stats, p2Stats] = await Promise.all([
      this.stats.tennisRecentResults(match.player1Id),
      this.stats.tennisRecentResults(match.player2Id),
      this.stats.tennisHeadToHead(match.player1Id, match.player2Id),
      this.stats.tennisFormStats(match.player1Id),
      this.stats.tennisFormStats(match.player2Id),
    ]);

    return {
      fixture: {
        tournament: await tr(match.tournament),
        round: match.round,
        start_time: match.startTime.toISOString(),
        venue: await tr(match.venue),
        player1: await tr(match.player1.name),
        player2: await tr(match.player2.name),
      },
      player1: {
        name: await tr(match.player1.name),
        ranking: match.player1.ranking,
        recent_form: await resultDtos(p1Recent),
        form_stats: p1Stats,
      },
      player2: {
        name: await tr(match.player2.name),
        ranking: match.player2.ranking,
        recent_form: await resultDtos(p2Recent),
        form_stats: p2Stats,
      },
      head_to_head: await resultDtos(h2h),
    };
  }

  private mockAnalysis(context: any, lang: Lang): TennisAnalysis {
    const p1 = context.fixture.player1;
    const p2 = context.fixture.player2;
    const summary =
      lang === 'he'
        ? `[מדומה] ניתוח לדוגמה לקראת ${p1} מול ${p2}. ` +
          'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude. ' +
          'עברו למצב live (AI_AGENT_MODE=live) עם מפתח API תקין לקבלת ניתוח אמיתי.'
        : `[Mock] Simulated pre-match analysis for ${p1} vs ${p2}. ` +
          'This is fixed placeholder text for development — no real Claude API call ' +
          'was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for real analysis.';
    const keyFactors =
      lang === 'he'
        ? ['[מדומה] גורם מפתח לדוגמה מספר אחד', '[מדומה] גורם מפתח לדוגמה מספר שתיים', '[מדומה] גורם מפתח לדוגמה מספר שלוש']
        : ['[Mock] Placeholder key factor one', '[Mock] Placeholder key factor two', '[Mock] Placeholder key factor three'];

    return {
      summary,
      key_factors: keyFactors,
      probabilities: { player1_win: 55, player2_win: 45 },
      confidence: 'medium',
    };
  }

  async getOrCreateAnalysis(matchId: number, lang: Lang) {
    const existing = await this.prisma.matchAnalysis.findUnique({
      where: { tennisMatchId_language: { tennisMatchId: matchId, language: lang } },
    });
    if (existing) return existing;

    const match = await this.findMatchOrThrow(matchId);
    const context = await this.buildMatchContext(match, lang);

    this.logger.log(`Requesting tennis analysis for match ${matchId} (lang=${lang})`);
    const [analysis, modelLabel] = await this.agentCaller.call<TennisAnalysis>({
      outputSchema: TennisAnalysisSchema,
      system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
      context,
      mockFactory: (ctx) => this.mockAnalysis(ctx, lang),
    });

    const [p1, p2] = normalizeTwoWay(analysis.probabilities.player1_win, analysis.probabilities.player2_win);

    return this.prisma.matchAnalysis.create({
      data: {
        sport: 'tennis',
        tennisMatchId: matchId,
        language: lang,
        summary: analysis.summary,
        keyFactors: analysis.key_factors,
        player1WinPct: p1,
        player2WinPct: p2,
        confidence: analysis.confidence,
        model: modelLabel,
      },
    });
  }
}
