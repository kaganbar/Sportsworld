import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { Lang } from '../common/lang.decorator';

@Injectable()
export class BaseballService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
  ) {}

  async gameDetail(id: number, lang: Lang) {
    const game = await this.games.findGameOrThrow(id);
    if (game.sport !== 'baseball') {
      throw new NotFoundException(`Game ${id} is not a baseball game`);
    }

    const base = await this.games.gameDetail(id, lang);
    const innings = await this.prisma.inningScore.findMany({
      where: { gameId: id },
      orderBy: { inning: 'asc' },
    });

    return {
      ...base,
      innings: innings.map((i) => ({
        inning: i.inning,
        home_score: i.homeScore,
        away_score: i.awayScore,
      })),
    };
  }
}
