import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { RedisService } from '../../redis/redis.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService, RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS, RateLimitExceededError } from '../common/agent-caller.service';
import { normalizeTwoWay } from '../common/probability-normalizer';
import { TennisAnalysisSchema, TennisAnalysis } from './tennis-agent.schema';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';

const SYSTEM_PROMPT = `You are the SportsWorld Tennis Agent, a professional tennis match
analyst. You receive structured pre-match context as JSON: the fixture (tournament,
round, surface implied by venue), each player's recent form, and the head-to-head
history between the two players. It may also include two optional enrichment fields
when available:
- recent_news: recent news headlines/summaries mentioning either player, gathered
  independently. Factor in anything materially relevant (e.g. an injury withdrawal, a
  coaching change) alongside the statistical picture — don't ignore it just because it
  isn't a number.
- cross_check_prediction: an independent second-opinion prediction (probabilities,
  confidence) computed by a separate prediction model from similar underlying data. Your
  own analysis should be your own — do not just copy its numbers — but if your assessment
  materially diverges from it, say so explicitly rather than silently picking one.

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

const ENRICHMENT_SYSTEM_PROMPT = `You are gathering optional enrichment context for a
tennis pre-match analysis. You'll receive the base match context (fixture, form,
head-to-head) as JSON. Call get_player_news for either or both players if there's a real
chance recent news (an injury, a withdrawal, a coaching change, a controversy) affects
this match beyond what's already in the base context — skip it if the base context
already looks complete and current. Call get_independent_prediction if you want a
statistical cross-check to compare against later. Call whichever tools are useful, or
none if the base context is already sufficient — this is a lightweight enrichment step,
not the analysis itself. You do not need to write a final summary; a brief acknowledgment
is fine once you're done gathering.`;

// See football-agent.service.ts's identical constant for the reasoning
// (2 tools -> a much smaller cap than Master Agent's 7-tool ROUND_CAP=6).
const ENRICHMENT_ROUND_CAP = 4;

@Injectable()
export class TennisAgentService {
  private readonly logger = new Logger(TennisAgentService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly agentCaller: AgentCallerService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly newsAgent: NewsAgentService,
    private readonly predictionAgent: PredictionAgentService,
  ) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-opus-4-8');
    const defaultMode = this.apiKey ? 'live' : 'mock';
    this.mockMode = this.config.get<string>('AI_AGENT_MODE', defaultMode) !== 'live';
  }

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

  /** Phase A — optional enrichment via a bounded tool-use loop, live mode
   * only. See football-agent.service.ts's identical method for the full
   * reasoning (error-handling split, rate-limit bucket sharing, closure-
   * captured tool results) — this mirrors it exactly, adapted to tennis
   * players/matches instead of teams/games. */
  private async enrichContext(matchId: number, lang: Lang, player1: string, player2: string, baseContext: unknown) {
    if (this.mockMode) return {};

    const allowed = await this.redis.checkRateLimit(RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS);
    if (!allowed) {
      throw new RateLimitExceededError('Too many AI analysis requests right now — please try again shortly.');
    }
    if (!this.apiKey) return {};

    const newsResults: Record<string, unknown> = {};
    let predictionResult: unknown = null;

    const tools = [
      betaZodTool({
        name: 'get_player_news',
        description: `Get recent news headlines/summaries mentioning a player by name. Use "${player1}" or "${player2}" (the exact names from the base context).`,
        inputSchema: z.object({ player_name: z.string() }),
        run: async ({ player_name }) => {
          try {
            const news = await this.newsAgent.getNewsForSubject(player_name, lang);
            newsResults[player_name] = news;
            return JSON.stringify(news);
          } catch (err) {
            return JSON.stringify({ error: (err as Error).message });
          }
        },
      }),
      betaZodTool({
        name: 'get_independent_prediction',
        description: 'Get an independent statistical cross-check prediction for this exact fixture.',
        inputSchema: z.object({}),
        run: async () => {
          try {
            const prediction = await this.predictionAgent.getOrCreatePrediction('tennis', matchId, lang);
            predictionResult = {
              prediction: prediction.prediction,
              probabilities: prediction.probabilities,
              confidence: prediction.confidence,
            };
            return JSON.stringify(predictionResult);
          } catch (err) {
            return JSON.stringify({ error: (err as Error).message });
          }
        },
      }),
    ];

    try {
      const client = new Anthropic({ apiKey: this.apiKey });
      await client.beta.messages.toolRunner({
        model: this.model,
        max_tokens: 1024,
        max_iterations: ENRICHMENT_ROUND_CAP,
        system: ENRICHMENT_SYSTEM_PROMPT,
        tools,
        messages: [{ role: 'user', content: JSON.stringify(baseContext) }],
      });
    } catch (err) {
      this.logger.warn(`Tennis Agent enrichment step failed for match ${matchId}, continuing without it: ${(err as Error).message}`);
    }

    const enrichment: { recent_news?: unknown; cross_check_prediction?: unknown } = {};
    if (Object.keys(newsResults).length > 0) enrichment.recent_news = newsResults;
    if (predictionResult) enrichment.cross_check_prediction = predictionResult;
    return enrichment;
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
    const baseContext = await this.buildMatchContext(match, lang);

    const enrichment = await this.enrichContext(
      matchId,
      lang,
      baseContext.fixture.player1,
      baseContext.fixture.player2,
      baseContext,
    );
    const context = { ...baseContext, ...enrichment };

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
