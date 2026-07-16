import { BadRequestException, Body, Controller, Post, UseFilters } from '@nestjs/common';
import { GeneralSportsAgentService } from './general-sports-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AgentErrorFilter } from '../common/agent-error.filter';

@Controller('agents/general-sports')
@UseFilters(AgentErrorFilter)
export class GeneralSportsAgentController {
  constructor(private readonly generalSportsAgent: GeneralSportsAgentService) {}

  @Post('ask')
  async ask(@Body() body: { question?: string }, @LangParam() lang: Lang) {
    const question = body?.question?.trim();
    if (!question) {
      throw new BadRequestException('question is required');
    }
    return this.generalSportsAgent.ask(question, lang);
  }
}
