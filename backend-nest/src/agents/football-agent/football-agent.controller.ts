import { Controller, Get, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { FootballAgentService } from './football-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError } from '../common/agent-caller.service';

// Mounted at /api/games/:id/analysis — same prefix as GamesController,
// a distinct sub-path so route registration order doesn't matter.
@Controller('games')
export class FootballAgentController {
  constructor(private readonly footballAgent: FootballAgentService) {}

  @Get(':id/analysis')
  async analysis(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    try {
      const analysis = await this.footballAgent.getOrCreateAnalysis(id, lang);
      return {
        language: analysis.language,
        summary: analysis.summary,
        key_factors: analysis.keyFactors,
        probabilities: {
          home_win: analysis.homeWinPct,
          draw: analysis.drawPct,
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
