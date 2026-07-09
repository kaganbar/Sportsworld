import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TennisService } from './tennis.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('tennis')
export class TennisController {
  constructor(private readonly tennis: TennisService) {}

  @Get('matches/today')
  async today(@LangParam() lang: Lang) {
    return this.tennis.matchesToday(lang);
  }

  @Get('matches/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.tennis.matchDetail(id, lang);
  }
}
