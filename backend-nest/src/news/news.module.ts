import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsIngestService } from './news-ingest.service';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [CompetitionsModule],
  controllers: [NewsController],
  providers: [NewsService, NewsIngestService],
})
export class NewsModule {}
