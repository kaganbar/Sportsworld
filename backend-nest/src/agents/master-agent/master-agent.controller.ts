import { BadRequestException, Body, Controller, Post, UseFilters } from '@nestjs/common';
import { MasterAgentService } from './master-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

@Controller('agents/master-agent')
@UseFilters(AgentErrorFilter)
export class MasterAgentController {
  constructor(private readonly masterAgent: MasterAgentService) {}

  @Post('query')
  async query(@Body() body: { query?: string }, @LangParam() lang: Lang) {
    const query = body?.query?.trim();
    if (!query) {
      throw new BadRequestException('query is required');
    }
    return this.masterAgent.answerQuery(query, lang);
  }
}
