import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { normalizeTwoWay } from '../common/probability-normalizer';
import { BasketballAnalysisSchema, BasketballAnalysis } from './basketball-agent.schema';

const SYSTEM_PROMPT = `You are the SportsWorld Basketball Agent, a professional basketball
match analyst. You receive structured pre-match context as JSON: the fixture, each
team's recent form, current injuries, and the head-to-head history between the two
sides.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent players, results, or facts that are not in the context. Assess which team
arrives in better shape and why, weigh the impact of injuries, and factor in the
head-to-head record. Basketball games cannot end in a draw.

Your two probabilities (home win, away win) must be integers that sum to exactly 100.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew team and player names exactly as given in the context — do not use English/Latin spellings.",
};

@Injectable()
export class BasketballAgentService {
  private readonly logger = new Logger(BasketballAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  private async buildMatchContext(game: any, lang: Lang) {
    const tr = (text: string) => this.translations.translate(text, lang);

    const resultDtos = async (results: any[]) =>
      Promise.all(
        results.map(async (r) => ({
          date: r.date.toISOString().slice(0, 10),
          competition: await tr(r.competition),
          home_team: await tr(r.homeTeam.name),
          away_team: await tr(r.awayTeam.name),
          score: `${r.homeScore}-${r.awayScore}`,
        })),
      );

    const injuryDtos = async (teamId: number) => {
      const injuries = await this.prisma.injury.findMany({ where: { teamId }, include: { player: true } });
      return Promise.all(
        injuries.map(async (i) => ({
          player: await tr(i.player.name),
          position: i.player.position,
          status: i.status,
          reason: i.reason,
        })),
      );
    };

    const [homeRecent, awayRecent, h2h, homeStats, awayStats, homeInjuries, awayInjuries] = await Promise.all([
      this.stats.teamRecentResults(game.homeTeamId),
      this.stats.teamRecentResults(game.awayTeamId),
      this.stats.teamHeadToHead(game.homeTeamId, game.awayTeamId),
      this.stats.teamFormStats(game.homeTeamId),
      this.stats.teamFormStats(game.awayTeamId),
      injuryDtos(game.homeTeamId),
      injuryDtos(game.awayTeamId),
    ]);

    return {
      fixture: {
        competition: await tr(game.competition),
        kickoff: game.kickoff.toISOString(),
        venue: await tr(game.venue),
        home_team: await tr(game.homeTeam.name),
        away_team: await tr(game.awayTeam.name),
      },
      home_team: {
        name: await tr(game.homeTeam.name),
        recent_form: await resultDtos(homeRecent),
        form_stats: homeStats,
        injuries: homeInjuries,
      },
      away_team: {
        name: await tr(game.awayTeam.name),
        recent_form: await resultDtos(awayRecent),
        form_stats: awayStats,
        injuries: awayInjuries,
      },
      head_to_head: await resultDtos(h2h),
    };
  }

  private mockAnalysis(context: any, lang: Lang): BasketballAnalysis {
    const home = context.fixture.home_team;
    const away = context.fixture.away_team;
    const summary =
      lang === 'he'
        ? `[מדומה] ניתוח לדוגמה לקראת ${home} מול ${away}. ` +
          'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude. ' +
          'עברו למצב live (AI_AGENT_MODE=live) עם מפתח API תקין לקבלת ניתוח אמיתי.'
        : `[Mock] Simulated pre-match analysis for ${home} vs ${away}. ` +
          'This is fixed placeholder text for development — no real Claude API call ' +
          'was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for real analysis.';
    const keyFactors =
      lang === 'he'
        ? ['[מדומה] גורם מפתח לדוגמה מספר אחד', '[מדומה] גורם מפתח לדוגמה מספר שתיים', '[מדומה] גורם מפתח לדוגמה מספר שלוש']
        : ['[Mock] Placeholder key factor one', '[Mock] Placeholder key factor two', '[Mock] Placeholder key factor three'];

    return {
      summary,
      key_factors: keyFactors,
      probabilities: { home_win: 55, away_win: 45 },
      confidence: 'medium',
    };
  }

  async getOrCreateAnalysis(gameId: number, lang: Lang) {
    // Sport must be checked before the cache read: MatchAnalysis is a single
    // shared table keyed on (gameId, language) with no sport in the key, so
    // a football game's id hitting this endpoint would otherwise short-circuit
    // straight to that game's football analysis instead of 404ing.
    const game = await this.games.findGameOrThrow(gameId);
    if (game.sport !== 'basketball') {
      throw new NotFoundException(`Game ${gameId} is not a basketball game`);
    }

    const existing = await this.prisma.matchAnalysis.findUnique({
      where: { gameId_language: { gameId, language: lang } },
    });
    if (existing) return existing;

    const context = await this.buildMatchContext(game, lang);

    this.logger.log(`Requesting basketball analysis for game ${gameId} (lang=${lang})`);
    const [analysis, modelLabel] = await this.agentCaller.call<BasketballAnalysis>({
      outputSchema: BasketballAnalysisSchema,
      system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
      context,
      mockFactory: (ctx) => this.mockAnalysis(ctx, lang),
    });

    const [home, away] = normalizeTwoWay(analysis.probabilities.home_win, analysis.probabilities.away_win);

    return this.prisma.matchAnalysis.create({
      data: {
        sport: 'basketball',
        gameId,
        language: lang,
        summary: analysis.summary,
        keyFactors: analysis.key_factors,
        homeWinPct: home,
        awayWinPct: away,
        confidence: analysis.confidence,
        model: modelLabel,
      },
    });
  }
}
