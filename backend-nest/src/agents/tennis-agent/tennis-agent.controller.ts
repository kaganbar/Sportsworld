import { Controller, Get, Param, ParseIntPipe, UseFilters } from '@nestjs/common';
import { TennisAgentService } from './tennis-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

// Mounted at /api/tennis/matches/:id/analysis — same prefix as
// TennisController, a distinct sub-path so registration order doesn't matter.
@Controller('tennis')
@UseFilters(AgentErrorFilter)
export class TennisAgentController {
  constructor(private readonly tennisAgent: TennisAgentService) {}

  @Get('matches/:id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
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
  }
}
