import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { Lang } from '../common/lang.decorator';

@Injectable()
export class BasketballService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
  ) {}

  async gameDetail(id: number, lang: Lang) {
    const game = await this.games.findGameOrThrow(id);
    if (game.sport !== 'basketball') {
      throw new NotFoundException(`Game ${id} is not a basketball game`);
    }

    const base = await this.games.gameDetail(id, lang);
    const quarters = await this.prisma.quarterScore.findMany({
      where: { gameId: id },
      orderBy: { quarter: 'asc' },
    });

    return {
      ...base,
      quarters: quarters.map((q) => ({
        quarter: q.quarter,
        home_score: q.homeScore,
        away_score: q.awayScore,
      })),
    };
  }
}
