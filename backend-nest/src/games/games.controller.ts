import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  // Declared before ':id' — Express/Nest matches literal routes in
  // declaration order, so this must come first or 'today' gets swallowed
  // by the ':id' param route.
  @Get('today')
  async today(
    @Query('sport') sport: string = 'football',
    @Query('competition') competition: string | undefined,
    @LangParam() lang: Lang,
  ) {
    return this.games.gamesToday(sport as 'football' | 'basketball' | 'baseball' | 'volleyball', lang, competition);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.games.gameDetail(id, lang);
  }
}
