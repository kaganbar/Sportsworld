import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GamesService } from '../../games/games.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { RedisService } from '../../redis/redis.service';
import { Lang } from '../../common/lang.decorator';
import { AgentCallerService } from '../common/agent-caller.service';
import { normalizeTwoWay } from '../common/probability-normalizer';
import { buildTeamMatchContext } from '../common/team-match-context';
import { runEnrichment } from '../common/enrichment';
import { mockSummaryAndKeyFactors } from '../common/mock-summary';
import { BasketballAnalysisSchema, BasketballAnalysis } from './basketball-agent.schema';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';

const SYSTEM_PROMPT = `You are the SportsWorld Basketball Agent, a professional basketball
match analyst. You receive structured pre-match context as JSON: the fixture, each
team's recent form, current injuries, and the head-to-head history between the two
sides. It may also include two optional enrichment fields when available:
- recent_news: recent news headlines/summaries mentioning either team, gathered
  independently. Factor in anything materially relevant (e.g. a coaching change, a key
  trade) alongside the statistical picture — don't ignore it just because it isn't a
  number.
- cross_check_prediction: an independent second-opinion prediction (probabilities,
  confidence) computed by a separate prediction model from similar underlying data. Your
  own analysis should be your own — do not just copy its numbers — but if your assessment
  materially diverges from it, say so explicitly rather than silently picking one.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent players, results, or facts that are not in the context. Assess which team
arrives in better shape and why, weigh the impact of injuries, and factor in the
head-to-head record. Basketball games cannot end in a draw.

Your two probabilities (home win, away win) must be integers that sum to exactly 100.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew team and player names exactly as given in the context — do not use English/Latin spellings.",
};

const ENRICHMENT_SYSTEM_PROMPT = `You are gathering optional enrichment context for a
basketball pre-match analysis. You'll receive the base match context (fixture, form,
injuries, head-to-head) as JSON. Call get_team_news for either or both teams if there's
a real chance recent news (injuries, coaching changes, trades, controversies) affects
this match beyond what's already in the base context — skip it if the base context
already looks complete and current. Call get_independent_prediction if you want a
statistical cross-check to compare against later. Call whichever tools are useful, or
none if the base context is already sufficient — this is a lightweight enrichment step,
not the analysis itself. You do not need to write a final summary; a brief acknowledgment
is fine once you're done gathering.`;

@Injectable()
export class BasketballAgentService {
  private readonly logger = new Logger(BasketballAgentService.name);
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

  private mockAnalysis(context: any, lang: Lang): BasketballAnalysis {
    const home = context.fixture.home_team;
    const away = context.fixture.away_team;
    return {
      ...mockSummaryAndKeyFactors(home, away, lang),
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

    const baseContext = await buildTeamMatchContext({ prisma: this.prisma, stats: this.stats, translations: this.translations }, game, lang);

    const enrichment = await runEnrichment({
      deps: {
        mockMode: this.mockMode,
        apiKey: this.apiKey,
        model: this.model,
        redis: this.redis,
        newsAgent: this.newsAgent,
        predictionAgent: this.predictionAgent,
        logger: this.logger,
      },
      sport: 'basketball',
      entityId: gameId,
      entityLabel: 'game',
      agentLabel: 'Basketball Agent',
      lang,
      subjectKind: 'team',
      subject1: baseContext.fixture.home_team,
      subject2: baseContext.fixture.away_team,
      systemPrompt: ENRICHMENT_SYSTEM_PROMPT,
      baseContext,
    });
    const context = { ...baseContext, ...enrichment };

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
