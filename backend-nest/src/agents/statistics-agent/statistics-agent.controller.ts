import { BadRequestException, Controller, Get, HttpException, HttpStatus, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { StatisticsAgentService, StatsSport } from './statistics-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError, RateLimitExceededError } from '../common/agent-caller.service';

const VALID_SPORTS: StatsSport[] = ['football', 'basketball', 'tennis', 'baseball', 'volleyball'];

@Controller('agents/statistics-agent')
export class StatisticsAgentController {
  constructor(private readonly statisticsAgent: StatisticsAgentService) {}

  @Get(':sport/:subjectId')
  async get(
    @Param('sport') sport: string,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @LangParam() lang: Lang,
  ) {
    if (!VALID_SPORTS.includes(sport as StatsSport)) {
      throw new BadRequestException(`sport must be one of ${VALID_SPORTS.join(', ')}`);
    }
    try {
      const analysis = await this.statisticsAgent.getOrCreateStatistics(sport as StatsSport, subjectId, lang);
      return {
        sport: analysis.sport,
        language: analysis.language,
        summary: analysis.summary,
        key_points: analysis.keyPoints,
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
