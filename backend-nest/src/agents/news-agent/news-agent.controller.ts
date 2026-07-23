import { Controller, Get, Query } from '@nestjs/common';
import { NewsAgentService } from './news-agent.service';
import { LangParam, Lang } from '../../common/lang.decorator';
import { SportKey } from '../../competitions/competitions.service';

// The AI-layer replacement for the raw GET /api/news list — deduped,
// clustered, AI-summarized stories with genuine (non-dictionary) Hebrew
// headline/summary. Wired into the frontend.
@Controller('agents/news-agent')
export class NewsAgentController {
  constructor(private readonly newsAgent: NewsAgentService) {}

  @Get('clusters')
  clusters(
    @Query('limit') limit: string | undefined,
    @Query('sport') sport: SportKey | undefined,
    @Query('competition') competition: string | undefined,
    @LangParam() lang: Lang,
  ) {
    return this.newsAgent.listClusters(limit ? Number(limit) : undefined, lang, sport, competition);
  }
}
