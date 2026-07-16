import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { Lang } from '../../common/lang.decorator';
import { RedisService } from '../../redis/redis.service';
import { NewsAgentService } from '../news-agent/news-agent.service';
import { PredictionAgentService, PredictionSport } from '../prediction-agent/prediction-agent.service';
import { RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS, RateLimitExceededError } from './agent-caller.service';

// Enrichment exposes only 2 tools (vs Master Agent's 7), so a much smaller
// cap suffices: parallel tool use means the common case is 1 round-trip for
// both tools + 1 for the wrap-up = 2 iterations; this allows a full extra
// round for a sequential decide-then-call pattern plus one retry of slack.
export const ENRICHMENT_ROUND_CAP = 4;

export interface EnrichmentDeps {
  mockMode: boolean;
  apiKey: string;
  model: string;
  redis: RedisService;
  newsAgent: NewsAgentService;
  predictionAgent: PredictionAgentService;
  logger: Logger;
}

/**
 * Phase A — optional enrichment via a bounded tool-use loop, live mode only
 * (never even constructs a client in mock mode, preserving the zero-API-
 * cost-in-mock-mode invariant every agent in this project follows). Failures
 * here are non-fatal: a rate-limit rejection is rethrown (Phase B's own
 * check would hit the identical exhausted bucket moments later anyway, so
 * there's nothing to gain by continuing), but anything else (a transient SDK
 * error, a bug in a tool) is caught and logged, and the caller proceeds with
 * base context only — every agent's endpoint works without enrichment, and a
 * hiccup in an additive feature shouldn't take it down.
 *
 * Shared by all 5 sport agents (football/basketball/baseball/volleyball use
 * `subjectKind: 'team'`, tennis uses `'player'`) — was copy-pasted
 * byte-for-byte modulo the tool/param name and the sport string passed to
 * getOrCreatePrediction. Each agent still supplies its own
 * ENRICHMENT_SYSTEM_PROMPT text, since that content is genuinely sport-
 * specific (the news-worthy-event examples differ per sport).
 */
export async function runEnrichment(params: {
  deps: EnrichmentDeps;
  sport: PredictionSport;
  entityId: number;
  entityLabel: 'game' | 'match';
  agentLabel: string;
  lang: Lang;
  subjectKind: 'team' | 'player';
  subject1: string;
  subject2: string;
  systemPrompt: string;
  baseContext: unknown;
}): Promise<{ recent_news?: unknown; cross_check_prediction?: unknown }> {
  const { deps, sport, entityId, entityLabel, agentLabel, lang, subjectKind, subject1, subject2, systemPrompt, baseContext } = params;

  if (deps.mockMode) return {};

  const allowed = await deps.redis.checkRateLimit(RATE_LIMIT_BUCKET, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) {
    throw new RateLimitExceededError('Too many AI analysis requests right now — please try again shortly.');
  }
  if (!deps.apiKey) return {};

  const newsResults: Record<string, unknown> = {};
  let predictionResult: unknown = null;

  const toolName = subjectKind === 'team' ? 'get_team_news' : 'get_player_news';
  const paramName = subjectKind === 'team' ? 'team_name' : 'player_name';

  const tools = [
    betaZodTool({
      name: toolName,
      description: `Get recent news headlines/summaries mentioning a ${subjectKind} by name. Use "${subject1}" or "${subject2}" (the exact names from the base context).`,
      inputSchema: z.object({ [paramName]: z.string() }),
      run: async (input: Record<string, string>) => {
        const subjectName = input[paramName];
        try {
          const news = await deps.newsAgent.getNewsForSubject(subjectName, lang);
          newsResults[subjectName] = news;
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
          const prediction = await deps.predictionAgent.getOrCreatePrediction(sport, entityId, lang);
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
    const client = new Anthropic({ apiKey: deps.apiKey });
    await client.beta.messages.toolRunner({
      model: deps.model,
      max_tokens: 1024,
      max_iterations: ENRICHMENT_ROUND_CAP,
      system: systemPrompt,
      tools,
      messages: [{ role: 'user', content: JSON.stringify(baseContext) }],
    });
  } catch (err) {
    deps.logger.warn(`${agentLabel} enrichment step failed for ${entityLabel} ${entityId}, continuing without it: ${(err as Error).message}`);
  }

  const enrichment: { recent_news?: unknown; cross_check_prediction?: unknown } = {};
  if (Object.keys(newsResults).length > 0) enrichment.recent_news = newsResults;
  if (predictionResult) enrichment.cross_check_prediction = predictionResult;
  return enrichment;
}
