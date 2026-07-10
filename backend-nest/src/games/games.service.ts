import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { TranslationsService } from '../translations/translations.service';
import { RedisService } from '../redis/redis.service';
import { Lang } from '../common/lang.decorator';

// Response shapes use snake_case keys deliberately — the frontend's
// lib/api.ts TypeScript interfaces were written against the Django/DRF
// responses (snake_case is DRF's default), and are being reused unchanged
// against this new backend, so the wire format must match exactly.

// Short read-through cache TTL for the hot "today's games" list (Phase 9 /
// ARCHITECTURE.md's Redis role #2). Safe to cache briefly even though scores
// change live: the frontend only calls this once per page load, then merges
// live updates on top via the WebSocket hook (useLiveGame.ts) — it never
// re-polls this endpoint to see score changes.
const GAMES_TODAY_CACHE_TTL_SECONDS = 20;

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly redis: RedisService,
  ) {}

  async teamDto(team: { id: number; name: string; shortName: string; country: string; primaryColor: string }, lang: Lang) {
    return {
      id: team.id,
      name: await this.translations.translate(team.name, lang),
      short_name: team.shortName,
      country: team.country,
      primary_color: team.primaryColor,
    };
  }

  async gameListDto(
    game: {
      id: number; competition: string; kickoff: Date; venue: string; status: string;
      homeTeam: any; awayTeam: any; homeScore: number | null; awayScore: number | null; minute: number | null;
    },
    lang: Lang,
  ) {
    return {
      id: game.id,
      competition: await this.translations.translate(game.competition, lang),
      kickoff: game.kickoff.toISOString(),
      venue: await this.translations.translate(game.venue, lang),
      status: game.status,
      home_team: await this.teamDto(game.homeTeam, lang),
      away_team: await this.teamDto(game.awayTeam, lang),
      home_score: game.homeScore,
      away_score: game.awayScore,
      minute: game.minute,
    };
  }

  async gamesToday(sport: 'football' | 'basketball', lang: Lang) {
    const cacheKey = `games:today:${sport}:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const games = await this.prisma.game.findMany({
      where: { sport, kickoff: { gte: start, lt: end } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoff: 'asc' },
    });
    const dtos = await Promise.all(games.map((g) => this.gameListDto(g, lang)));

    await this.redis.set(cacheKey, JSON.stringify(dtos), GAMES_TODAY_CACHE_TTL_SECONDS);
    return dtos;
  }

  private async resultDto(r: { date: Date; competition: string; homeTeam: any; awayTeam: any; homeScore: number; awayScore: number }, lang: Lang) {
    return {
      date: r.date.toISOString().slice(0, 10),
      competition: await this.translations.translate(r.competition, lang),
      home_team: r.homeTeam.shortName,
      away_team: r.awayTeam.shortName,
      home_score: r.homeScore,
      away_score: r.awayScore,
    };
  }

  private async lineupDto(l: { player: any; position: string; isStarting: boolean }, lang: Lang) {
    return {
      name: await this.translations.translate(l.player.name, lang),
      shirt_number: l.player.shirtNumber,
      position: l.position,
      is_starting: l.isStarting,
    };
  }

  private async injuryDto(i: { player: any; status: string; reason: string }, lang: Lang) {
    return {
      player: await this.translations.translate(i.player.name, lang),
      status: i.status,
      reason: i.reason,
    };
  }

  async findGameOrThrow(id: number) {
    const game = await this.prisma.game.findUnique({ where: { id }, include: { homeTeam: true, awayTeam: true } });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }

  async gameDetail(id: number, lang: Lang) {
    const game = await this.findGameOrThrow(id);

    const lineups = await this.prisma.lineup.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: [{ isStarting: 'desc' }, { position: 'asc' }],
    });
    const homeLineup = lineups.filter((l) => l.teamId === game.homeTeamId);
    const awayLineup = lineups.filter((l) => l.teamId === game.awayTeamId);

    const [homeStats, awayStats, homeRecent, awayRecent, h2h, homeInjuries, awayInjuries] = await Promise.all([
      this.stats.teamFormStats(game.homeTeamId),
      this.stats.teamFormStats(game.awayTeamId),
      this.stats.teamRecentResults(game.homeTeamId),
      this.stats.teamRecentResults(game.awayTeamId),
      this.stats.teamHeadToHead(game.homeTeamId, game.awayTeamId),
      this.prisma.injury.findMany({ where: { teamId: game.homeTeamId }, include: { player: true } }),
      this.prisma.injury.findMany({ where: { teamId: game.awayTeamId }, include: { player: true } }),
    ]);

    const statsDto = (s: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }) => ({
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goals_for: s.goalsFor,
      goals_against: s.goalsAgainst,
    });

    return {
      game: await this.gameListDto(game, lang),
      lineups: {
        home: await Promise.all(homeLineup.map((l) => this.lineupDto(l, lang))),
        away: await Promise.all(awayLineup.map((l) => this.lineupDto(l, lang))),
      },
      stats: { home: statsDto(homeStats), away: statsDto(awayStats) },
      recent_form: {
        home: await Promise.all(homeRecent.map((r) => this.resultDto(r, lang))),
        away: await Promise.all(awayRecent.map((r) => this.resultDto(r, lang))),
      },
      head_to_head: await Promise.all(h2h.map((r) => this.resultDto(r, lang))),
      injuries: {
        home: await Promise.all(homeInjuries.map((i) => this.injuryDto(i, lang))),
        away: await Promise.all(awayInjuries.map((i) => this.injuryDto(i, lang))),
      },
    };
  }
}
