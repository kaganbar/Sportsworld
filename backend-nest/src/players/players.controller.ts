import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PlayersService } from './players.service';
import { LangParam, Lang } from '../common/lang.decorator';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @LangParam() lang: Lang) {
    return this.players.playerDetail(id, lang);
  }

  @Get('team/:teamId')
  async roster(@Param('teamId', ParseIntPipe) teamId: number, @LangParam() lang: Lang) {
    return this.players.teamRoster(teamId, lang);
  }
}
