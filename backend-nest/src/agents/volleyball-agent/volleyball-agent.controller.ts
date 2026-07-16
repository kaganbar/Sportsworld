import { Controller, Get, Param, ParseIntPipe, UseFilters } from '@nestjs/common';
import { VolleyballAgentService } from './volleyball-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

// Mounted at /api/volleyball/games/:id/analysis — same prefix as
// VolleyballController, a distinct sub-path so registration order doesn't matter.
@Controller('volleyball')
@UseFilters(AgentErrorFilter)
export class VolleyballAgentController {
  constructor(private readonly volleyballAgent: VolleyballAgentService) {}

  @Get('games/:id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    const analysis = await this.volleyballAgent.getOrCreateAnalysis(id, lang);
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
  }
}
