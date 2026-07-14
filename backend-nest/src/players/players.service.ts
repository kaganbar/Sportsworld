import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationsService } from '../translations/translations.service';
import { Lang } from '../common/lang.decorator';

// Football/basketball player profile — both sports share the `Player`/`Team`
// models (see games app split note in schema.prisma), so one service covers
// both; `team.sport` in the response tells the frontend which stat-chip
// labels to render (Goals/Assists/Rating vs PPG/RPG/APG). Tennis has its own
// TennisPlayer model/route (TennisService.playerDetail), not this one.
@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translations: TranslationsService,
  ) {}

  async playerDetail(id: number, lang: Lang) {
    const player = await this.prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) throw new NotFoundException(`Player ${id} not found`);

    return {
      id: player.id,
      name: await this.translations.translate(player.name, lang),
      position: player.position,
      sport: player.team.sport,
      team: {
        id: player.team.id,
        name: await this.translations.translate(player.team.name, lang),
        short_name: player.team.shortName,
      },
      season_stats: player.seasonStats ?? null,
    };
  }
}
