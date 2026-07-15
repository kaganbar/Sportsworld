import { Controller, Get, HttpException, HttpStatus, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { BaseballAgentService } from './baseball-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError, RateLimitExceededError } from '../common/agent-caller.service';

// Mounted at /api/baseball/games/:id/analysis — same prefix as
// BaseballController, a distinct sub-path so registration order doesn't matter.
@Controller('baseball')
export class BaseballAgentController {
  constructor(private readonly baseballAgent: BaseballAgentService) {}

  @Get('games/:id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    try {
      const analysis = await this.baseballAgent.getOrCreateAnalysis(id, lang);
      return {
        language: analysis.language,
        summary: analysis.summary,
        key_factors: analysis.keyFactors,
        probabilities: {
          home_win: analysis.homeWinPct,
          away_win: analysis.awayWinPct,
        },
        confidence: analysis.confidence,
        model: analysis.model,
        created_at: analysis.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        throw new HttpException(err.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      if (err instanceof AnalysisUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
