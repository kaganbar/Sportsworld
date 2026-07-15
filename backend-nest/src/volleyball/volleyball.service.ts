import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { Lang } from '../common/lang.decorator';

@Injectable()
export class VolleyballService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
  ) {}

  async gameDetail(id: number, lang: Lang) {
    const game = await this.games.findGameOrThrow(id);
    if (game.sport !== 'volleyball') {
      throw new NotFoundException(`Game ${id} is not a volleyball game`);
    }

    const base = await this.games.gameDetail(id, lang);
    const sets = await this.prisma.setScore.findMany({
      where: { gameId: id },
      orderBy: { setNumber: 'asc' },
    });

    return {
      ...base,
      sets: sets.map((s) => ({
        set_number: s.setNumber,
        home_score: s.homeScore,
        away_score: s.awayScore,
      })),
    };
  }
}
