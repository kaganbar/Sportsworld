import { BadRequestException, Body, Controller, Post, ServiceUnavailableException } from '@nestjs/common';
import { MasterAgentService } from './master-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError } from '../common/agent-caller.service';

@Controller('agents/master-agent')
export class MasterAgentController {
  constructor(private readonly masterAgent: MasterAgentService) {}

  @Post('query')
  async query(@Body() body: { query?: string }, @LangParam() lang: Lang) {
    const query = body?.query?.trim();
    if (!query) {
      throw new BadRequestException('query is required');
    }
    try {
      return await this.masterAgent.answerQuery(query, lang);
    } catch (err) {
      if (err instanceof AnalysisUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
