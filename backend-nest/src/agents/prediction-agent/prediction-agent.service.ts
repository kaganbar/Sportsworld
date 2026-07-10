import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { normalizeThreeWay, normalizeTwoWay } from '../common/probability-normalizer';
import {
  PredictionThreeWaySchema,
  PredictionTwoWaySchema,
  PredictionThreeWay,
  PredictionTwoWay,
} from './prediction-agent.schema';

export type PredictionSport = 'football' | 'basketball' | 'tennis';

const SYSTEM_PROMPT = `You are the SportsWorld Prediction Agent — a general, cross-sport
synthesis tool. You receive structured statistical context as JSON for a matchup
(a football/basketball game, or a tennis match): the fixture, both sides' recent form,
and their head-to-head history.

Produce your OWN independent prediction grounded ONLY in the data provided. This may be
requested even when a sport-specific analysis already exists elsewhere on the platform —
your job is a fresh, cross-referenced synthesis, not to defer to it. Explicitly frame your
prediction as a statistical estimate, never a guarantee of the outcome.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: '\n\nWrite the prediction and key_factors in Hebrew (עברית). Use the Hebrew team/player names exactly as given in the context — do not use English/Latin spellings.',
};

@Injectable()
export class PredictionAgentService {
  private readonly logger = new Logger(PredictionAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly agentCaller: AgentCallerService,
  ) {}

  private async findTennisMatchOrThrow(matchId: number) {
    const match = await this.prisma.tennisMatch.findUnique({
      where: { id: matchId },
      include: { player1: true, player2: true },
    });
    if (!match) throw new NotFoundException(`Tennis match ${matchId} not found`);
    return match;
  }

  private async buildGameContext(game: any, lang: Lang) {
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

    const [homeRecent, awayRecent, h2h, homeStats, awayStats] = await Promise.all([
      this.stats.teamRecentResults(game.homeTeamId),
      this.stats.teamRecentResults(game.awayTeamId),
      this.stats.teamHeadToHead(game.homeTeamId, game.awayTeamId),
      this.stats.teamFormStats(game.homeTeamId),
      this.stats.teamFormStats(game.awayTeamId),
    ]);

    return {
      fixture: {
        sport: game.sport,
        competition: await tr(game.competition),
        kickoff: game.kickoff.toISOString(),
        option_a: await tr(game.homeTeam.name),
        option_b: await tr(game.awayTeam.name),
      },
      option_a: { name: await tr(game.homeTeam.name), recent_form: await resultDtos(homeRecent), form_stats: homeStats },
      option_b: { name: await tr(game.awayTeam.name), recent_form: await resultDtos(awayRecent), form_stats: awayStats },
      head_to_head: await resultDtos(h2h),
    };
  }

  private async buildTennisContext(match: any, lang: Lang) {
    const tr = (text: string) => this.translations.translate(text, lang);
    const resultDtos = async (results: any[]) =>
      Promise.all(
        results.map(async (m) => ({
          date: m.startTime.toISOString().slice(0, 10),
          tournament: await tr(m.tournament),
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
        sport: 'tennis',
        competition: await tr(match.tournament),
        kickoff: match.startTime.toISOString(),
        option_a: await tr(match.player1.name),
        option_b: await tr(match.player2.name),
      },
      option_a: { name: await tr(match.player1.name), recent_form: await resultDtos(p1Recent), form_stats: p1Stats },
      option_b: { name: await tr(match.player2.name), recent_form: await resultDtos(p2Recent), form_stats: p2Stats },
      head_to_head: await resultDtos(h2h),
    };
  }

  private mockThreeWay(context: any, lang: Lang): PredictionThreeWay {
    return {
      prediction: this.mockText(context, lang),
      key_factors: this.mockKeyFactors(lang),
      probabilities: { option_a_win: 42, draw: 24, option_b_win: 34 },
      confidence: 'medium',
    };
  }

  private mockTwoWay(context: any, lang: Lang): PredictionTwoWay {
    return {
      prediction: this.mockText(context, lang),
      key_factors: this.mockKeyFactors(lang),
      probabilities: { option_a_win: 55, option_b_win: 45 },
      confidence: 'medium',
    };
  }

  private mockText(context: any, lang: Lang): string {
    const a = context.fixture.option_a;
    const b = context.fixture.option_b;
    return lang === 'he'
      ? `[מדומה] חיזוי לדוגמה עבור ${a} מול ${b}. ` +
        'זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude.'
      : `[Mock] Simulated prediction for ${a} vs ${b}. ` +
        'This is fixed placeholder text for development — no real Claude API call was made.';
  }

  private mockKeyFactors(lang: Lang): string[] {
    return lang === 'he'
      ? ['[מדומה] גורם מפתח לדוגמה מספר אחד', '[מדומה] גורם מפתח לדוגמה מספר שתיים']
      : ['[Mock] Placeholder key factor one', '[Mock] Placeholder key factor two'];
  }

  async getOrCreatePrediction(sport: PredictionSport, subjectId: number, lang: Lang) {
    const isTennis = sport === 'tennis';
    const existing = isTennis
      ? await this.prisma.predictionAnalysis.findUnique({
          where: { tennisMatchId_language: { tennisMatchId: subjectId, language: lang } },
        })
      : await this.prisma.predictionAnalysis.findUnique({
          where: { gameId_language: { gameId: subjectId, language: lang } },
        });
    if (existing) return existing;

    const context = isTennis
      ? await this.buildTennisContext(await this.findTennisMatchOrThrow(subjectId), lang)
      : await this.buildGameContext(await this.games.findGameOrThrow(subjectId), lang);

    this.logger.log(`Requesting prediction for ${sport} subject ${subjectId} (lang=${lang})`);

    let predictionText: string;
    let keyFactors: string[];
    let probabilities: Record<string, number>;
    let confidence: 'low' | 'medium' | 'high';
    let modelLabel: string;

    if (sport === 'football') {
      const [result, model] = await this.agentCaller.call<PredictionThreeWay>({
        outputSchema: PredictionThreeWaySchema,
        system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
        context,
        mockFactory: (ctx: any) => this.mockThreeWay(ctx, lang),
      });
      const [a, draw, b] = normalizeThreeWay(
        result.probabilities.option_a_win,
        result.probabilities.draw,
        result.probabilities.option_b_win,
      );
      predictionText = result.prediction;
      keyFactors = result.key_factors;
      probabilities = { option_a_win: a, draw, option_b_win: b };
      confidence = result.confidence;
      modelLabel = model;
    } else {
      const [result, model] = await this.agentCaller.call<PredictionTwoWay>({
        outputSchema: PredictionTwoWaySchema,
        system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
        context,
        mockFactory: (ctx: any) => this.mockTwoWay(ctx, lang),
      });
      const [a, b] = normalizeTwoWay(result.probabilities.option_a_win, result.probabilities.option_b_win);
      predictionText = result.prediction;
      keyFactors = result.key_factors;
      probabilities = { option_a_win: a, option_b_win: b };
      confidence = result.confidence;
      modelLabel = model;
    }

    return this.prisma.predictionAnalysis.create({
      data: {
        sport,
        gameId: isTennis ? undefined : subjectId,
        tennisMatchId: isTennis ? subjectId : undefined,
        language: lang,
        prediction: predictionText,
        keyFactors,
        probabilities,
        confidence,
        model: modelLabel,
      },
    });
  }
}
