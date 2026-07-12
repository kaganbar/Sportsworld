import { Controller, Get, Query } from '@nestjs/common';
import { CompetitionsService, SportKey } from './competitions.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Get()
  async list(@Query('sport') sport: string = 'football', @LangParam() lang: Lang) {
    return this.competitions.listForSport(sport as SportKey, lang);
  }
}
