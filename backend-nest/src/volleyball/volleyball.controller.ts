import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { VolleyballService } from './volleyball.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('volleyball')
export class VolleyballController {
  constructor(private readonly volleyball: VolleyballService) {}

  @Get('games/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.volleyball.gameDetail(id, lang);
  }
}
