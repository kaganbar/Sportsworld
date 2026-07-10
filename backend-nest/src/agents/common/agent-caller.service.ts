import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { ZodType } from 'zod';

// Shared Claude-calling plumbing reused by every sport agent (Football,
// Basketball, Tennis, ...). Each agent supplies its own system prompt, Zod
// output schema, match context, and a mock-response factory; this service
// owns the mock/live branching and the actual messages.parse() call, so
// agents don't each hand-roll it. Mirrors ai_common/service.py::call_agent.
export class AnalysisUnavailableError extends Error {}

@Injectable()
export class AgentCallerService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-opus-4-8');
    const defaultMode = this.apiKey ? 'live' : 'mock';
    this.mockMode = this.config.get<string>('AI_AGENT_MODE', defaultMode) !== 'live';
  }

  /** Returns [parsed_output, model_label]. model_label is "mock" in mock mode,
   * otherwise the configured ANTHROPIC_MODEL. */
  async call<T>(opts: {
    outputSchema: ZodType<T>;
    system: string;
    context: unknown;
    mockFactory: (context: unknown) => T;
  }): Promise<[T, string]> {
    if (this.mockMode) {
      return [opts.mockFactory(opts.context), 'mock'];
    }

    if (!this.apiKey) {
      throw new AnalysisUnavailableError(
        'AI analysis is not configured — set ANTHROPIC_API_KEY, or set AI_AGENT_MODE=mock to use simulated analysis.',
      );
    }

    const client = new Anthropic({ apiKey: this.apiKey });
    let response;
    try {
      response = await client.messages.parse({
        model: this.model,
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: zodOutputFormat(opts.outputSchema) },
        system: opts.system,
        messages: [{ role: 'user', content: JSON.stringify(opts.context) }],
      });
    } catch (err) {
      // Surface the real reason (bad key, no credit, rate limit, network) as
      // a clean 503 instead of letting the raw SDK error bubble up as a 500.
      throw new AnalysisUnavailableError(`AI analysis is temporarily unavailable: ${(err as Error).message}`);
    }

    if (response.stop_reason === 'refusal') {
      throw new AnalysisUnavailableError('Analysis temporarily unavailable for this match.');
    }

    const parsed = response.parsed_output;
    if (parsed == null) {
      throw new AnalysisUnavailableError('Analysis temporarily unavailable — please try again.');
    }

    return [parsed, this.model];
  }
}
