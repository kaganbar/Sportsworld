import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { NormalizeService } from './normalize.service';
import { Scores365FootballParser } from './parsers/scores365/scores365-football.parser';
import { Scores365BasketballParser } from './parsers/scores365/scores365-basketball.parser';
import { Scores365TennisParser } from './parsers/scores365/scores365-tennis.parser';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [CompetitionsModule],
  providers: [
    ScraperService,
    NormalizeService,
    Scores365FootballParser,
    Scores365BasketballParser,
    Scores365TennisParser,
  ],
})
export class ScraperModule {}
