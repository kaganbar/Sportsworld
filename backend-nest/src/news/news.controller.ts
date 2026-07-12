import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { SportKey } from '../competitions/competitions.service';

// Read-only for now — raw ingested headlines, no AI summarization/dedup
// clustering yet. That's the News Agent's job (Phase 8), not this ingestion
// pipeline's (Phase 6).
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('sport') sport?: string, @Query('competition') competition?: string) {
    return this.news.recentArticles(limit ? Number(limit) : undefined, sport as SportKey | undefined, competition);
  }
}
