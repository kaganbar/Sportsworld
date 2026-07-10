import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { TranslationsService } from '../translations/translations.service';
import { RedisService } from '../redis/redis.service';
import { Lang } from '../common/lang.decorator';

// Same read-through cache role/rationale as GamesService.gamesToday — see
// its comment for why a short TTL is safe alongside live WebSocket ticking.
const MATCHES_TODAY_CACHE_TTL_SECONDS = 20;

@Injectable()
export class TennisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly redis: RedisService,
  ) {}

  private async playerDto(p: { id: number; name: string; country: string; tour: string; ranking: number | null }, lang: Lang) {
    return {
      id: p.id,
      name: await this.translations.translate(p.name, lang),
      country: p.country,
      tour: p.tour,
      ranking: p.ranking,
    };
  }

  private async matchListDto(m: any, lang: Lang) {
    return {
      id: m.id,
      tour: m.tour,
      tournament: await this.translations.translate(m.tournament, lang),
      round: m.round,
      venue: await this.translations.translate(m.venue, lang),
      start_time: m.startTime.toISOString(),
      status: m.status,
      player1: await this.playerDto(m.player1, lang),
      player2: await this.playerDto(m.player2, lang),
      winner_id: m.winnerId,
    };
  }

  private async matchResultDto(m: any, lang: Lang) {
    return {
      start_time: m.startTime.toISOString(),
      tournament: await this.translations.translate(m.tournament, lang),
      round: m.round,
      player1: await this.translations.translate(m.player1.name, lang),
      player2: await this.translations.translate(m.player2.name, lang),
      winner: m.winner ? await this.translations.translate(m.winner.name, lang) : null,
      sets: m.sets.map((s: any) => ({
        set_number: s.setNumber,
        player1_games: s.player1Games,
        player2_games: s.player2Games,
      })),
    };
  }

  async matchesToday(lang: Lang) {
    const cacheKey = `tennis:matches:today:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const matches = await this.prisma.tennisMatch.findMany({
      where: { startTime: { gte: start, lt: end } },
      include: { player1: true, player2: true },
      orderBy: { startTime: 'asc' },
    });
    const dtos = await Promise.all(matches.map((m) => this.matchListDto(m, lang)));

    await this.redis.set(cacheKey, JSON.stringify(dtos), MATCHES_TODAY_CACHE_TTL_SECONDS);
    return dtos;
  }

  async matchDetail(id: number, lang: Lang) {
    const match = await this.prisma.tennisMatch.findUnique({
      where: { id },
      include: { player1: true, player2: true },
    });
    if (!match) throw new NotFoundException(`Tennis match ${id} not found`);

    const [sets, p1Stats, p2Stats, p1Recent, p2Recent, h2h] = await Promise.all([
      this.prisma.tennisSet.findMany({ where: { matchId: id }, orderBy: { setNumber: 'asc' } }),
      this.stats.tennisFormStats(match.player1Id),
      this.stats.tennisFormStats(match.player2Id),
      this.stats.tennisRecentResults(match.player1Id),
      this.stats.tennisRecentResults(match.player2Id),
      this.stats.tennisHeadToHead(match.player1Id, match.player2Id),
    ]);

    return {
      match: await this.matchListDto(match, lang),
      sets: sets.map((s) => ({ set_number: s.setNumber, player1_games: s.player1Games, player2_games: s.player2Games })),
      stats: { player1: p1Stats, player2: p2Stats },
      recent_form: {
        player1: await Promise.all(p1Recent.map((m) => this.matchResultDto(m, lang))),
        player2: await Promise.all(p2Recent.map((m) => this.matchResultDto(m, lang))),
      },
      head_to_head: await Promise.all(h2h.map((m) => this.matchResultDto(m, lang))),
    };
  }
}
