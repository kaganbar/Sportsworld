import { Controller, Get, Query } from '@nestjs/common';
import { NewsAgentService } from './news-agent.service';

// The AI-layer replacement for the raw GET /api/news list — deduped,
// clustered, summarized stories. Not wired into the frontend this phase.
@Controller('agents/news-agent')
export class NewsAgentController {
  constructor(private readonly newsAgent: NewsAgentService) {}

  @Get('clusters')
  clusters(@Query('limit') limit?: string) {
    return this.newsAgent.listClusters(limit ? Number(limit) : undefined);
  }
}
