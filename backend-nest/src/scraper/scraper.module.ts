import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { NormalizeService } from './normalize.service';
import { Scores365FootballParser } from './parsers/scores365/scores365-football.parser';
import { Scores365BasketballParser } from './parsers/scores365/scores365-basketball.parser';
import { Scores365TennisParser } from './parsers/scores365/scores365-tennis.parser';
import { FootballDataFootballParser } from './parsers/football-data/football-data-football.parser';
import { BalldontlieBasketballParser } from './parsers/balldontlie/balldontlie-basketball.parser';
import { BalldontlieSchedulerService } from './parsers/balldontlie/balldontlie-scheduler.service';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [CompetitionsModule],
  providers: [
    ScraperService,
    NormalizeService,
    Scores365FootballParser,
    Scores365BasketballParser,
    Scores365TennisParser,
    FootballDataFootballParser,
    // Not wired into ScraperService's shared 45s loop — balldontlie's
    // 5/min rate limit needs its own slower interval, see
    // BalldontlieSchedulerService's doc comment. This provider array entry
    // is enough to make it run (OnApplicationBootstrap kicks off its own
    // @Interval independently of ScraperService).
    BalldontlieBasketballParser,
    BalldontlieSchedulerService,
  ],
})
export class ScraperModule {}
