import { BadRequestException, Controller, Get, Param, ParseIntPipe, UseFilters } from '@nestjs/common';
import { PredictionAgentService, PredictionSport } from './prediction-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

const VALID_SPORTS: PredictionSport[] = ['football', 'basketball', 'tennis', 'baseball', 'volleyball'];

@Controller('agents/prediction-agent')
@UseFilters(AgentErrorFilter)
export class PredictionAgentController {
  constructor(private readonly predictionAgent: PredictionAgentService) {}

  @Get(':sport/:subjectId')
  async get(
    @Param('sport') sport: string,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @LangParam() lang: Lang,
  ) {
    if (!VALID_SPORTS.includes(sport as PredictionSport)) {
      throw new BadRequestException(`sport must be one of ${VALID_SPORTS.join(', ')}`);
    }
    const analysis = await this.predictionAgent.getOrCreatePrediction(sport as PredictionSport, subjectId, lang);
    return {
      sport: analysis.sport,
      language: analysis.language,
      prediction: analysis.prediction,
      key_factors: analysis.keyFactors,
      probabilities: analysis.probabilities,
      confidence: analysis.confidence,
      model: analysis.model,
      created_at: analysis.createdAt.toISOString(),
    };
  }
}
