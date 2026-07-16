import { BadRequestException, Controller, Get, Param, ParseIntPipe, UseFilters } from '@nestjs/common';
import { StatisticsAgentService, StatsSport } from './statistics-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

const VALID_SPORTS: StatsSport[] = ['football', 'basketball', 'tennis', 'baseball', 'volleyball'];

@Controller('agents/statistics-agent')
@UseFilters(AgentErrorFilter)
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
  }
}
