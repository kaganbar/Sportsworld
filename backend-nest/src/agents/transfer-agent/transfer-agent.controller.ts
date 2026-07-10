import { Controller, Get, Query } from '@nestjs/common';
import { TransferAgentService } from './transfer-agent.service';

// The AI-layer replacement for the raw GET /api/transfers list — grouped
// stories with our own estimated_probability alongside each report's own
// source_probability. Not wired into the frontend this phase.
@Controller('agents/transfer-agent')
export class TransferAgentController {
  constructor(private readonly transferAgent: TransferAgentService) {}

  @Get('stories')
  stories(@Query('limit') limit?: string) {
    return this.transferAgent.listStories(limit ? Number(limit) : undefined);
  }
}
