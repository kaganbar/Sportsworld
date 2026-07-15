import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { BaseballService } from './baseball.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('baseball')
export class BaseballController {
  constructor(private readonly baseball: BaseballService) {}

  @Get('games/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.baseball.gameDetail(id, lang);
  }
}
