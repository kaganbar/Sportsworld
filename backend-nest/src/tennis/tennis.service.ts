import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { TranslationsService } from '../translations/translations.service';
import { RedisService } from '../redis/redis.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { Lang } from '../common/lang.decorator';

// Same read-through cache role/rationale as GamesService.gamesToday — see
// its comment for why a short TTL is safe alongside live WebSocket ticking.
const MATCHES_TODAY_CACHE_TTL_SECONDS = 20;

// Same N+1 fix as GamesService — see its identical TMap comment. Pre-resolved
// via one TranslationsService.translateMany() call per request instead of
// every DTO builder translating one name at a time.
type TMap = Record<string, string>;
const tr = (map: TMap, text: string) => map[text] ?? text;

@Injectable()
export class TennisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly redis: RedisService,
    private readonly competitions: CompetitionsService,
  ) {}

  private playerDto(p: { id: number; name: string; country: string; tour: string; ranking: number | null }, map: TMap) {
    return {
      id: p.id,
      name: tr(map, p.name),
      country: p.country,
      tour: p.tour,
      ranking: p.ranking,
    };
  }

  private matchListDto(m: any, map: TMap) {
    return {
      id: m.id,
      tour: m.tour,
      tournament: tr(map, m.tournament),
      round: m.round,
      venue: tr(map, m.venue),
      start_time: m.startTime.toISOString(),
      status: m.status,
      player1: this.playerDto(m.player1, map),
      player2: this.playerDto(m.player2, map),
      winner_id: m.winnerId,
    };
  }

  private matchResultDto(m: any, map: TMap) {
    return {
      start_time: m.startTime.toISOString(),
      tournament: tr(map, m.tournament),
      round: m.round,
      player1: tr(map, m.player1.name),
      player2: tr(map, m.player2.name),
      winner: m.winner ? tr(map, m.winner.name) : null,
      sets: m.sets.map((s: any) => ({
        set_number: s.setNumber,
        player1_games: s.player1Games,
        player2_games: s.player2Games,
      })),
    };
  }

  async matchesToday(lang: Lang, competition?: string) {
    const cacheKey = `tennis:matches:today:${competition ?? 'all'}:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // A 2-day window (today + tomorrow), not just today — same reasoning
    // as GamesService.gamesToday: the "Upcoming" tab otherwise goes empty
    // for any tournament with no more matches later today.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    let competitionId: number | undefined;
    if (competition) {
      const row = await this.competitions.findBySlug('tennis', competition);
      if (!row) return []; // unknown slug — degrade to empty, never error
      competitionId = row.id;
    }

    const matches = await this.prisma.tennisMatch.findMany({
      where: { startTime: { gte: start, lt: end }, ...(competitionId ? { competitionId } : {}) },
      include: { player1: true, player2: true },
      orderBy: { startTime: 'asc' },
    });

    const texts = new Set<string>();
    for (const m of matches) {
      texts.add(m.tournament);
      texts.add(m.venue);
      texts.add(m.player1.name);
      texts.add(m.player2.name);
    }
    const map = await this.translations.translateMany([...texts], lang);
    const dtos = matches.map((m) => this.matchListDto(m, map));

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

    const texts = new Set<string>();
    texts.add(match.tournament);
    texts.add(match.venue);
    texts.add(match.player1.name);
    texts.add(match.player2.name);
    for (const m of [...p1Recent, ...p2Recent, ...h2h]) {
      texts.add(m.tournament);
      texts.add(m.player1.name);
      texts.add(m.player2.name);
      if (m.winner) texts.add(m.winner.name);
    }
    const map = await this.translations.translateMany([...texts], lang);

    return {
      match: this.matchListDto(match, map),
      sets: sets.map((s) => ({ set_number: s.setNumber, player1_games: s.player1Games, player2_games: s.player2Games })),
      stats: { player1: p1Stats, player2: p2Stats },
      // Raw per-match stat breakdown (aces/winners/unforcedErrors/
      // doubleFaults) for the match-detail Overview tab — a different key
      // than `stats` above (which is recent-form W/L), same pattern as
      // GamesService.gameDetail's `game_stats`. Null when not populated.
      match_stats: match.stats ?? null,
      recent_form: {
        player1: p1Recent.map((m) => this.matchResultDto(m, map)),
        player2: p2Recent.map((m) => this.matchResultDto(m, map)),
      },
      head_to_head: h2h.map((m) => this.matchResultDto(m, map)),
    };
  }

  async playerDetail(id: number, lang: Lang) {
    const player = await this.prisma.tennisPlayer.findUnique({ where: { id } });
    if (!player) throw new NotFoundException(`Tennis player ${id} not found`);
    return {
      id: player.id,
      name: await this.translations.translate(player.name, lang),
      country: player.country,
      tour: player.tour,
      ranking: player.ranking,
      win_pct: player.winPct,
      aces_per_match: player.acesPerMatch,
    };
  }
}
