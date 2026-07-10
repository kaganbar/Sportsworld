import { BadRequestException, Body, Controller, Post, ServiceUnavailableException } from '@nestjs/common';
import { GeneralSportsAgentService } from './general-sports-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { AnalysisUnavailableError } from '../common/agent-caller.service';

@Controller('agents/general-sports')
export class GeneralSportsAgentController {
  constructor(private readonly generalSportsAgent: GeneralSportsAgentService) {}

  @Post('ask')
  async ask(@Body() body: { question?: string }, @LangParam() lang: Lang) {
    const question = body?.question?.trim();
    if (!question) {
      throw new BadRequestException('question is required');
    }
    try {
      return await this.generalSportsAgent.ask(question, lang);
    } catch (err) {
      if (err instanceof AnalysisUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
