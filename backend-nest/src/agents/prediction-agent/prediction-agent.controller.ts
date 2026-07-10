import { BadRequestException, Controller, Get, HttpException, HttpStatus, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { PredictionAgentService, PredictionSport } from './prediction-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError, RateLimitExceededError } from '../common/agent-caller.service';

const VALID_SPORTS: PredictionSport[] = ['football', 'basketball', 'tennis'];

@Controller('agents/prediction-agent')
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
    try {
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
