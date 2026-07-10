import { Controller, Get, HttpException, HttpStatus, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { TennisAgentService } from './tennis-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError, RateLimitExceededError } from '../common/agent-caller.service';

// Mounted at /api/tennis/matches/:id/analysis — same prefix as
// TennisController, a distinct sub-path so registration order doesn't matter.
@Controller('tennis')
export class TennisAgentController {
  constructor(private readonly tennisAgent: TennisAgentService) {}

  @Get('matches/:id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    try {
      const analysis = await this.tennisAgent.getOrCreateAnalysis(id, lang);
      return {
        language: analysis.language,
        summary: analysis.summary,
        key_factors: analysis.keyFactors,
        probabilities: {
          player1_win: analysis.player1WinPct,
          player2_win: analysis.player2WinPct,
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
