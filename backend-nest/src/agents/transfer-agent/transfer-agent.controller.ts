import { Controller, Get, Query } from '@nestjs/common';
import { TransferAgentService } from './transfer-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { SportKey } from '../../competitions/competitions.service';

// The AI-layer replacement for the raw GET /api/transfers list — grouped
// stories with our own estimated_probability alongside each report's own
// source_probability, and a genuine (non-dictionary) Hebrew ai_summary.
// Wired into the frontend.
@Controller('agents/transfer-agent')
export class TransferAgentController {
  constructor(private readonly transferAgent: TransferAgentService) {}

  @Get('stories')
  stories(
    @Query('limit') limit: string | undefined,
    @Query('sport') sport: SportKey | undefined,
    @Query('competition') competition: string | undefined,
    @LangParam() lang: Lang,
  ) {
    return this.transferAgent.listStories(limit ? Number(limit) : undefined, lang, sport, competition);
  }
}
