import { Controller, Get, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { BasketballAgentService } from './basketball-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError } from '../common/agent-caller.service';

// Mounted at /api/basketball/games/:id/analysis — same prefix as
// BasketballController, a distinct sub-path so registration order doesn't matter.
@Controller('basketball')
export class BasketballAgentController {
  constructor(private readonly basketballAgent: BasketballAgentService) {}

  @Get('games/:id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    try {
      const analysis = await this.basketballAgent.getOrCreateAnalysis(id, lang);
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
      if (err instanceof AnalysisUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
