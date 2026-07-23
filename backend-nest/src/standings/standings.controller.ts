import { Controller, Get, Query } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller()
export class StandingsController {
  constructor(private readonly standings: StandingsService) {}

  @Get('standings')
  async standingsList(
    @Query('sport') sport: string = 'football',
    @Query('competition') competition: string,
    @LangParam() lang: Lang,
  ) {
    return this.standings.standings(sport as 'football' | 'basketball', competition, lang);
  }

  @Get('rankings')
  async rankingsList(@Query('tour') tour: string = 'atp', @LangParam() lang: Lang) {
    return this.standings.rankings(tour as 'atp' | 'wta', lang);
  }

  @Get('top-scorers')
  async topScorersList(
    @Query('sport') sport: string = 'football',
    @Query('competition') competition: string,
    @Query('limit') limit: number = 10,
    @LangParam() lang: Lang,
  ) {
    return this.standings.topScorers(sport as 'football' | 'basketball', competition, lang, Number(limit));
  }
}
