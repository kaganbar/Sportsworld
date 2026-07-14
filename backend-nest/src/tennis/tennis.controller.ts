import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TennisService } from './tennis.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('tennis')
export class TennisController {
  constructor(private readonly tennis: TennisService) {}

  @Get('matches/today')
  async today(@Query('competition') competition: string | undefined, @LangParam() lang: Lang) {
    return this.tennis.matchesToday(lang, competition);
  }

  @Get('matches/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.tennis.matchDetail(id, lang);
  }

  @Get('players/:id')
  async player(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.tennis.playerDetail(id, lang);
  }
}
