import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { TranslationsService } from '../translations/translations.service';
import { RedisService } from '../redis/redis.service';
import { CompetitionsService } from '../competitions/competitions.service';
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

// Pre-resolved sourceText -> translatedText lookup, built once per request
// via TranslationsService.translateMany (one query) instead of every DTO
// builder below calling the single-row TranslationsService.translate
// individually. A single Hebrew gameDetail() response used to translate
// ~50+ names one at a time (every lineup/bench player across both teams,
// every recent-form/H2H competition string, every injured player, plus
// competition/venue/team names) — confirmed via the codebase's own unused
// TranslationsService.translateMany, built for exactly this and never
// wired into any caller until now.
type TMap = Record<string, string>;
const tr = (map: TMap, text: string) => map[text] ?? text;

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly translations: TranslationsService,
    private readonly redis: RedisService,
    private readonly competitions: CompetitionsService,
  ) {}

  teamDto(
    team: { id: number; name: string; shortName: string; country: string; primaryColor: string; logoUrl: string | null; isReal: boolean },
    map: TMap,
  ) {
    return {
      id: team.id,
      name: tr(map, team.name),
      short_name: team.shortName,
      country: team.country,
      primary_color: team.primaryColor,
      logo_url: team.logoUrl,
      is_real: team.isReal,
    };
  }

  gameListDto(
    game: {
      id: number; competition: string; kickoff: Date; venue: string; status: string;
      homeTeam: any; awayTeam: any; homeScore: number | null; awayScore: number | null; minute: number | null; isReal: boolean;
    },
    map: TMap,
  ) {
    return {
      id: game.id,
      competition: tr(map, game.competition),
      kickoff: game.kickoff.toISOString(),
      venue: tr(map, game.venue),
      status: game.status,
      home_team: this.teamDto(game.homeTeam, map),
      away_team: this.teamDto(game.awayTeam, map),
      home_score: game.homeScore,
      away_score: game.awayScore,
      minute: game.minute,
      is_real: game.isReal,
    };
  }

  async gamesToday(sport: 'football' | 'basketball' | 'baseball' | 'volleyball', lang: Lang, competition?: string) {
    const cacheKey = `games:today:${sport}:${competition ?? 'all'}:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // A 2-day window (today + tomorrow), not just today — the frontend's
    // "Upcoming" tab otherwise goes empty for any competition with no more
    // fixtures later today, even when it plays again tomorrow.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    let competitionId: number | undefined;
    if (competition) {
      const row = await this.competitions.findBySlug(sport, competition);
      if (!row) return []; // unknown slug — degrade to empty, never error
      competitionId = row.id;
    }

    const games = await this.prisma.game.findMany({
      where: { sport, kickoff: { gte: start, lt: end }, ...(competitionId ? { competitionId } : {}) },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoff: 'asc' },
    });

    const texts = new Set<string>();
    for (const g of games) {
      texts.add(g.competition);
      texts.add(g.venue);
      texts.add(g.homeTeam.name);
      texts.add(g.awayTeam.name);
    }
    const map = await this.translations.translateMany([...texts], lang);
    const dtos = games.map((g) => this.gameListDto(g, map));

    await this.redis.set(cacheKey, JSON.stringify(dtos), GAMES_TODAY_CACHE_TTL_SECONDS);
    return dtos;
  }

  private resultDto(r: { date: Date; competition: string; homeTeam: any; awayTeam: any; homeScore: number; awayScore: number }, map: TMap) {
    return {
      date: r.date.toISOString().slice(0, 10),
      competition: tr(map, r.competition),
      home_team: r.homeTeam.shortName,
      away_team: r.awayTeam.shortName,
      home_score: r.homeScore,
      away_score: r.awayScore,
    };
  }

  private lineupDto(l: { player: any; teamId: number; position: string; isStarting: boolean }, map: TMap) {
    return {
      id: l.player.id,
      name: tr(map, l.player.name),
      shirt_number: l.player.shirtNumber,
      position: l.position,
      is_starting: l.isStarting,
      team_id: l.teamId,
    };
  }

  private injuryDto(i: { player: any; status: string; reason: string }, map: TMap) {
    return {
      player: tr(map, i.player.name),
      status: i.status,
      reason: i.reason,
    };
  }

  private eventDto(
    e: { minute: number; stoppageMinute: number | null; type: string; teamId: number; player: any; relatedPlayer: any; detail: string | null },
    map: TMap,
  ) {
    return {
      minute: e.minute,
      stoppage_minute: e.stoppageMinute,
      type: e.type,
      team_id: e.teamId,
      player: e.player ? tr(map, e.player.name) : null,
      related_player: e.relatedPlayer ? tr(map, e.relatedPlayer.name) : null,
      detail: e.detail,
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

    const [homeStats, awayStats, homeRecent, awayRecent, h2h, homeInjuries, awayInjuries, events] = await Promise.all([
      this.stats.teamFormStats(game.homeTeamId),
      this.stats.teamFormStats(game.awayTeamId),
      this.stats.teamRecentResults(game.homeTeamId),
      this.stats.teamRecentResults(game.awayTeamId),
      this.stats.teamHeadToHead(game.homeTeamId, game.awayTeamId),
      this.prisma.injury.findMany({ where: { teamId: game.homeTeamId }, include: { player: true } }),
      this.prisma.injury.findMany({ where: { teamId: game.awayTeamId }, include: { player: true } }),
      this.prisma.matchEvent.findMany({
        where: { gameId: id },
        include: { player: true, relatedPlayer: true },
        orderBy: [{ minute: 'asc' }, { stoppageMinute: 'asc' }],
      }),
    ]);

    const statsDto = (s: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }) => ({
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goals_for: s.goalsFor,
      goals_against: s.goalsAgainst,
    });

    // Every name/competition string this response could possibly render,
    // collected once and resolved in a single batched query — see this
    // file's TMap comment for why (replaces what used to be one DB query
    // per name, sequentially awaited inside every DTO builder below).
    const texts = new Set<string>();
    texts.add(game.competition);
    texts.add(game.venue);
    texts.add(game.homeTeam.name);
    texts.add(game.awayTeam.name);
    for (const l of lineups) texts.add(l.player.name);
    for (const r of [...homeRecent, ...awayRecent, ...h2h]) texts.add(r.competition);
    for (const i of [...homeInjuries, ...awayInjuries]) texts.add(i.player.name);
    for (const e of events) {
      if (e.player) texts.add(e.player.name);
      if (e.relatedPlayer) texts.add(e.relatedPlayer.name);
    }
    const map = await this.translations.translateMany([...texts], lang);

    return {
      game: this.gameListDto(game, map),
      lineups: {
        home: homeLineup.map((l) => this.lineupDto(l, map)),
        away: awayLineup.map((l) => this.lineupDto(l, map)),
      },
      stats: { home: statsDto(homeStats), away: statsDto(awayStats) },
      // Raw per-game team stat breakdown (possession/shots/... or
      // points/rebounds/...) for the match-detail Overview tab's proportion
      // bars — deliberately a different key than `stats` above, which is
      // recent-form W/D/L, not this match's own numbers. Null when the
      // scraper/seed hasn't populated it (e.g. not-yet-live fixtures).
      game_stats: game.stats ?? null,
      recent_form: {
        home: homeRecent.map((r) => this.resultDto(r, map)),
        away: awayRecent.map((r) => this.resultDto(r, map)),
      },
      head_to_head: h2h.map((r) => this.resultDto(r, map)),
      injuries: {
        home: homeInjuries.map((i) => this.injuryDto(i, map)),
        away: awayInjuries.map((i) => this.injuryDto(i, map)),
      },
      events: events.map((e) => this.eventDto(e, map)),
    };
  }
}
