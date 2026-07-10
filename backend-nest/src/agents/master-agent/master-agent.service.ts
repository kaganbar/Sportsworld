import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Lang } from '../../common/lang.decorator';
import {
  AnalysisUnavailableError,
  RateLimitExceededError,
  RATE_LIMIT_BUCKET,
  RATE_LIMIT_MAX_CALLS,
  RATE_LIMIT_WINDOW_SECONDS,
} from '../common/agent-caller.service';
import { FootballAgentService } from '../football-agent/football-agent.service';
import { BasketballAgentService } from '../basketball-agent/basketball-agent.service';
import { TennisAgentService } from '../tennis-agent/tennis-agent.service';
import { GeneralSportsAgentService } from '../general-sports-agent/general-sports-agent.service';
import { TransferAgentService } from '../transfer-agent/transfer-agent.service';
import { StatisticsAgentService } from '../statistics-agent/statistics-agent.service';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService } from '../prediction-agent/prediction-agent.service';

// Bad prompts (or a genuinely open-ended query) can't run up an unbounded
// bill — the tool loop always terminates within this many API round-trips,
// per ARCHITECTURE.md's explicit requirement. Verified against the
// installed @anthropic-ai/sdk: BetaToolRunnerParams.max_iterations is a
// first-class option, so no manual iteration counting is needed.
const ROUND_CAP = 6;

const SYSTEM_PROMPT = `You are the SportsWorld Master Agent — a coordinator that answers
the user's question by calling whichever of your specialized agent tools are relevant,
then synthesizing a single coherent report. You may call several tools, one, or none if
general knowledge already answers the question.

Tool guide:
- get_football_analysis(game_id) / get_basketball_analysis(game_id) / get_tennis_analysis(match_id):
  the platform's existing cached AI match analysis for one specific game/match, including
  a win-probability breakdown. Use these for a quick, single-game read.
- get_prediction(sport, subject_id): an independent, cross-sport prediction tool. It can be
  called for ANY sport, including football/basketball/tennis, even when a per-sport analysis
  already exists — it recomputes a fresh synthesis rather than reusing that analysis. Use it
  when the user wants a cross-referenced second take, not just the platform's own quick read.
  Its own take may agree or disagree with the per-sport analysis — that's fine to note.
- get_statistics(sport, subject_id): a real-data-only statistical digest (recent form,
  head-to-head, goals/wins/losses) for ONE team or player. There is no advanced metric data
  (no xG, no possession, no serve stats) — never claim there is.
- ask_general_sports(question): general sports knowledge (rules, history, commentary) for
  sports with no live fixture data on this platform (e.g. baseball, volleyball), or any
  question not tied to a specific game. Answered from general knowledge, not live data.
- get_transfer_stories(): recent grouped transfer rumor/signing stories, each with a
  credibility-weighted probability estimate.
- get_news_clusters(): recent deduped, clustered, summarized sports news stories.

Write your final answer as one well-organized report synthesizing whatever you gathered.
If a tool returns nothing relevant, say so plainly rather than inventing detail.`;

const LANGUAGE_INSTRUCTIONS: Record<Lang, string> = {
  en: '',
  he: '\n\nWrite your final report in Hebrew (עברית).',
};

function hashQuery(query: string, lang: Lang): string {
  return createHash('sha256').update(`${lang}:${query.trim().toLowerCase()}`).digest('hex');
}

@Injectable()
export class MasterAgentService {
  private readonly logger = new Logger(MasterAgentService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly football: FootballAgentService,
    private readonly basketball: BasketballAgentService,
    private readonly tennis: TennisAgentService,
    private readonly generalSports: GeneralSportsAgentService,
    private readonly transferAgent: TransferAgentService,
    private readonly statisticsAgent: StatisticsAgentService,
    private readonly newsAgent: NewsAgentService,
    private readonly predictionAgent: PredictionAgentService,
  ) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-opus-4-8');
    const defaultMode = this.apiKey ? 'live' : 'mock';
    this.mockMode = this.config.get<string>('AI_AGENT_MODE', defaultMode) !== 'live';
  }

  private buildTools(lang: Lang) {
    return [
      betaZodTool({
        name: 'get_football_analysis',
        description: 'Get the cached AI match analysis (summary, key factors, win probability) for a football game by its game ID.',
        inputSchema: z.object({ game_id: z.number().int() }),
        run: async ({ game_id }) => JSON.stringify(await this.football.getOrCreateAnalysis(game_id, lang)),
      }),
      betaZodTool({
        name: 'get_basketball_analysis',
        description: 'Get the cached AI match analysis (summary, key factors, win probability) for a basketball game by its game ID.',
        inputSchema: z.object({ game_id: z.number().int() }),
        run: async ({ game_id }) => JSON.stringify(await this.basketball.getOrCreateAnalysis(game_id, lang)),
      }),
      betaZodTool({
        name: 'get_tennis_analysis',
        description: 'Get the cached AI match analysis (summary, key factors, win probability) for a tennis match by its match ID.',
        inputSchema: z.object({ match_id: z.number().int() }),
        run: async ({ match_id }) => JSON.stringify(await this.tennis.getOrCreateAnalysis(match_id, lang)),
      }),
      betaZodTool({
        name: 'ask_general_sports',
        description: 'Ask a general sports question (rules, history, commentary) for sports with no live fixture data on this platform, or anything not tied to a specific game.',
        inputSchema: z.object({ question: z.string() }),
        run: async ({ question }) => JSON.stringify(await this.generalSports.ask(question, lang)),
      }),
      betaZodTool({
        name: 'get_transfer_stories',
        description: 'Get recent grouped transfer rumor/signing stories with credibility-weighted probability estimates.',
        inputSchema: z.object({ limit: z.number().int().optional() }),
        run: async ({ limit }) => JSON.stringify(await this.transferAgent.listStories(limit)),
      }),
      betaZodTool({
        name: 'get_news_clusters',
        description: 'Get recent deduped, clustered, and summarized sports news stories.',
        inputSchema: z.object({ limit: z.number().int().optional() }),
        run: async ({ limit }) => JSON.stringify(await this.newsAgent.listClusters(limit)),
      }),
      betaZodTool({
        name: 'get_statistics',
        description: 'Get a real-data-only statistical digest (recent form, head-to-head, goals/wins/losses) for one football/basketball team or tennis player. sport must be "football", "basketball", or "tennis"; subject_id is a team ID for football/basketball or a player ID for tennis.',
        inputSchema: z.object({ sport: z.enum(['football', 'basketball', 'tennis']), subject_id: z.number().int() }),
        run: async ({ sport, subject_id }) =>
          JSON.stringify(await this.statisticsAgent.getOrCreateStatistics(sport, subject_id, lang)),
      }),
      betaZodTool({
        name: 'get_prediction',
        description: 'Get an independent cross-sport prediction for a matchup. sport must be "football", "basketball", or "tennis"; subject_id is a game ID for football/basketball or a tennis match ID for tennis. Can be called even when a per-sport analysis already exists.',
        inputSchema: z.object({ sport: z.enum(['football', 'basketball', 'tennis']), subject_id: z.number().int() }),
        run: async ({ sport, subject_id }) =>
          JSON.stringify(await this.predictionAgent.getOrCreatePrediction(sport, subject_id, lang)),
      }),
    ];
  }

  private mockReport(query: string, lang: Lang): string {
    return lang === 'he'
      ? `[מדומה] דוח לדוגמה עבור השאלה: "${query}". ` +
        'במצב live, סוכן זה היה קורא לכלים הרלוונטיים (ניתוח משחקים, מעברים, חדשות, סטטיסטיקה, חיזויים) ' +
        'ומסנתז דוח אחד קוהרנטי מהתוצאות. זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude.'
      : `[Mock] Simulated report for the query: "${query}". ` +
        'In live mode, this agent would call whichever tools are relevant (match analysis, transfers, ' +
        'news, statistics, predictions) and synthesize one coherent report from the results. This is ' +
        'fixed placeholder text for development — no real Claude API call was made.';
  }

  async answerQuery(query: string, lang: Lang) {
    const queryHash = hashQuery(query, lang);
    const existing = await this.prisma.masterReport.findUnique({ where: { queryHash } });
    if (existing) {
      return { report: existing.reportText, model: existing.model, created_at: existing.createdAt.toISOString(), cached: true };
    }

    let reportText: string;
    let modelLabel: string;

    if (this.mockMode) {
      reportText = this.mockReport(query, lang);
      modelLabel = 'mock';
    } else {
      if (!this.apiKey) {
        throw new AnalysisUnavailableError(
          'AI analysis is not configured — set ANTHROPIC_API_KEY, or set AI_AGENT_MODE=mock to use simulated analysis.',
        );
      }

      // This top-level call bypasses AgentCallerService (Master Agent has
      // its own tool-loop calling logic), so it needs its own rate-limit
      // check against the same shared bucket every other live agent call
      // uses — see agent-caller.service.ts's RateLimitExceededError.
      const allowed = await this.redis.checkRateLimit(RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS);
      if (!allowed) {
        throw new RateLimitExceededError('Too many AI analysis requests right now — please try again shortly.');
      }

      const client = new Anthropic({ apiKey: this.apiKey });
      this.logger.log(`Master Agent query (lang=${lang}): ${query.slice(0, 80)}`);

      let finalMessage;
      try {
        finalMessage = await client.beta.messages.toolRunner({
          model: this.model,
          max_tokens: 4096,
          max_iterations: ROUND_CAP,
          system: SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS[lang],
          tools: this.buildTools(lang),
          messages: [{ role: 'user', content: query }],
        });
      } catch (err) {
        throw new AnalysisUnavailableError(`Master Agent report is temporarily unavailable: ${(err as Error).message}`);
      }

      if (finalMessage.stop_reason === 'refusal') {
        throw new AnalysisUnavailableError('Master Agent could not produce a report for this query.');
      }

      const textBlock = finalMessage.content.find((b: any) => b.type === 'text') as { text: string } | undefined;
      if (!textBlock) {
        throw new AnalysisUnavailableError('Master Agent report is temporarily unavailable — please try again.');
      }
      reportText = textBlock.text;
      modelLabel = this.model;
    }

    const saved = await this.prisma.masterReport.create({
      data: { queryHash, queryText: query, language: lang, reportText, model: modelLabel },
    });

    return { report: saved.reportText, model: saved.model, created_at: saved.createdAt.toISOString(), cached: false };
  }
}
