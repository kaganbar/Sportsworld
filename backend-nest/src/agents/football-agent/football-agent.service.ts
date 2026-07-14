import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { RedisService } from '../../redis/redis.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService, RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS, RateLimitExceededError } from '../common/agent-caller.service';
import { normalizeThreeWay } from '../common/probability-normalizer';
import { FootballAnalysisSchema, FootballAnalysis } from './football-agent.schema';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';

const SYSTEM_PROMPT = `You are the SportsWorld Football Agent, a professional football
(soccer) match analyst. You receive structured pre-match context as JSON: the fixture,
each team's recent form, current injuries, and the head-to-head history between the
two sides. It may also include two optional enrichment fields when available:
- recent_news: recent news headlines/summaries mentioning either team, gathered
  independently. Factor in anything materially relevant (e.g. a manager change, a key
  transfer) alongside the statistical picture — don't ignore it just because it isn't a
  number.
- cross_check_prediction: an independent second-opinion prediction (probabilities,
  confidence) computed by a separate prediction model from similar underlying data. Your
  own analysis should be your own — do not just copy its numbers — but if your assessment
  materially diverges from it, say so explicitly rather than silently picking one.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent players, results, or facts that are not in the context. Assess which team
arrives in better shape and why, weigh the impact of injuries, and factor in the
head-to-head record.

Your three probabilities (home win, draw, away win) must be integers that sum to
exactly 100.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew team and player names exactly as given in the context — do not use English/Latin spellings.",
};

const ENRICHMENT_SYSTEM_PROMPT = `You are gathering optional enrichment context for a
football pre-match analysis. You'll receive the base match context (fixture, form,
injuries, head-to-head) as JSON. Call get_team_news for either or both teams if there's
a real chance recent news (injuries, manager changes, transfers, controversies) affects
this match beyond what's already in the base context — skip it if the base context
already looks complete and current. Call get_independent_prediction if you want a
statistical cross-check to compare against later. Call whichever tools are useful, or
none if the base context is already sufficient — this is a lightweight enrichment step,
not the analysis itself. You do not need to write a final summary; a brief acknowledgment
is fine once you're done gathering.`;

// Enrichment exposes only 2 tools (vs Master Agent's 7), so a much smaller
// cap suffices: parallel tool use means the common case is 1 round-trip for
// both tools + 1 for the wrap-up = 2 iterations; this allows a full extra
// round for a sequential decide-then-call pattern plus one retry of slack.
const ENRICHMENT_ROUND_CAP = 4;

@Injectable()
export class FootballAgentService {
  private readonly logger = new Logger(FootballAgentService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
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

  /** Phase A — optional enrichment via a bounded tool-use loop, live mode
   * only (never even constructs a client in mock mode, preserving the
   * zero-API-cost-in-mock-mode invariant every agent in this project
   * follows). Failures here are non-fatal: a rate-limit rejection is
   * rethrown (Phase B's own check would hit the identical exhausted bucket
   * moments later anyway, so there's nothing to gain by continuing), but
   * anything else (a transient SDK error, a bug in a tool) is caught and
   * logged, and the caller proceeds with base context only — this endpoint
   * works today without enrichment, and a hiccup in an additive feature
   * shouldn't take it down. */
  private async enrichContext(gameId: number, lang: Lang, homeTeam: string, awayTeam: string, baseContext: unknown) {
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
        name: 'get_team_news',
        description: `Get recent news headlines/summaries mentioning a team by name. Use "${homeTeam}" or "${awayTeam}" (the exact names from the base context).`,
        inputSchema: z.object({ team_name: z.string() }),
        run: async ({ team_name }) => {
          try {
            const news = await this.newsAgent.getNewsForSubject(team_name, lang);
            newsResults[team_name] = news;
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
            const prediction = await this.predictionAgent.getOrCreatePrediction('football', gameId, lang);
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
      this.logger.warn(`Football Agent enrichment step failed for game ${gameId}, continuing without it: ${(err as Error).message}`);
    }

    const enrichment: { recent_news?: unknown; cross_check_prediction?: unknown } = {};
    if (Object.keys(newsResults).length > 0) enrichment.recent_news = newsResults;
    if (predictionResult) enrichment.cross_check_prediction = predictionResult;
    return enrichment;
  }

  private mockAnalysis(context: any, lang: Lang): FootballAnalysis {
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
      probabilities: { home_win: 45, draw: 25, away_win: 30 },
      confidence: 'medium',
    };
  }

  async getOrCreateAnalysis(gameId: number, lang: Lang) {
    const existing = await this.prisma.matchAnalysis.findUnique({
      where: { gameId_language: { gameId, language: lang } },
    });
    if (existing) return existing;

    const game = await this.games.findGameOrThrow(gameId);
    const baseContext = await this.buildMatchContext(game, lang);

    const enrichment = await this.enrichContext(
      gameId,
      lang,
      baseContext.fixture.home_team,
      baseContext.fixture.away_team,
      baseContext,
    );
    const context = { ...baseContext, ...enrichment };

    this.logger.log(`Requesting football analysis for game ${gameId} (lang=${lang})`);
    const [analysis, modelLabel] = await this.agentCaller.call<FootballAnalysis>({
      outputSchema: FootballAnalysisSchema,
      system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
      context,
      mockFactory: (ctx) => this.mockAnalysis(ctx, lang),
    });

    const [home, draw, away] = normalizeThreeWay(
      analysis.probabilities.home_win,
      analysis.probabilities.draw,
      analysis.probabilities.away_win,
    );

    return this.prisma.matchAnalysis.create({
      data: {
        sport: 'football',
        gameId,
        language: lang,
        summary: analysis.summary,
        keyFactors: analysis.key_factors,
        homeWinPct: home,
        drawPct: draw,
        awayWinPct: away,
        confidence: analysis.confidence,
        model: modelLabel,
      },
    });
  }
}
