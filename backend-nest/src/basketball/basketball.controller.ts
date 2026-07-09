import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { BasketballService } from './basketball.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('basketball')
export class BasketballController {
  constructor(private readonly basketball: BasketballService) {}

  @Get('games/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.basketball.gameDetail(id, lang);
  }
}
