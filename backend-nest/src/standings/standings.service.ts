import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationsService } from '../translations/translations.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { RedisService } from '../redis/redis.service';
import { Lang } from '../common/lang.decorator';

// Standings move much slower than live scores (games finish a handful of
// times a day, not every few seconds) — a longer TTL than games-today's 20s
// is deliberate, not an oversight.
const STANDINGS_CACHE_TTL_SECONDS = 300;

interface Accum {
  team: { id: number; name: string; shortName: string };
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

@Injectable()
export class StandingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translations: TranslationsService,
    private readonly competitions: CompetitionsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Best-effort standings: computed live from whatever `Game` rows with
   * `status: finished` exist for this competition — not guaranteed complete
   * (the real scraper only accumulates history as it runs; there's no
   * separate authoritative season archive), same "running best-effort view"
   * spirit confirmed with the user rather than a guaranteed-complete table.
   * `MatchResult` is deliberately NOT included here — it's only ever
   * populated by the mock seed script, never by the real scraper, so mixing
   * it in would silently blend mock and real data.
   */
  async standings(sportKey: 'football' | 'basketball', competitionSlug: string, lang: Lang) {
    const cacheKey = `standings:${sportKey}:${competitionSlug}:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const competition = await this.competitions.findBySlug(sportKey, competitionSlug);
    if (!competition) return [];

    const games = await this.prisma.game.findMany({
      where: { sport: sportKey, competitionId: competition.id, status: 'finished' },
      include: { homeTeam: true, awayTeam: true },
    });

    const table = new Map<number, Accum>();
    const ensure = (team: { id: number; name: string; shortName: string }) => {
      let row = table.get(team.id);
      if (!row) {
        row = { team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
        table.set(team.id, row);
      }
      return row;
    };

    for (const g of games) {
      if (g.homeScore == null || g.awayScore == null) continue;
      const home = ensure(g.homeTeam);
      const away = ensure(g.awayTeam);
      home.played += 1;
      away.played += 1;
      home.goalsFor += g.homeScore;
      home.goalsAgainst += g.awayScore;
      away.goalsFor += g.awayScore;
      away.goalsAgainst += g.homeScore;
      if (g.homeScore > g.awayScore) {
        home.wins += 1;
        away.losses += 1;
      } else if (g.homeScore < g.awayScore) {
        away.wins += 1;
        home.losses += 1;
      } else {
        // Basketball games don't end level in practice, but the schema
        // allows it — treat as a draw rather than special-casing.
        home.draws += 1;
        away.draws += 1;
      }
    }

    // One batched translation query for every team name instead of one
    // query per team (same N+1 fix as GamesService/TennisService — see
    // GamesService's TMap comment for the full rationale).
    const teamNames = [...table.values()].map((r) => r.team.name);
    const nameMap = await this.translations.translateMany(teamNames, lang);

    const rows = [...table.values()].map((r) => ({
      team_id: r.team.id,
      team_name: nameMap[r.team.name] ?? r.team.name,
      short_name: r.team.shortName,
      played: r.played,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals_for: r.goalsFor,
      goals_against: r.goalsAgainst,
      goal_diff: r.goalsFor - r.goalsAgainst,
      points: sportKey === 'basketball' ? r.wins : r.wins * 3 + r.draws,
    }));

    rows.sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

    await this.redis.set(cacheKey, JSON.stringify(rows), STANDINGS_CACHE_TTL_SECONDS);
    return rows;
  }

  /** Tennis has no league table — ATP Tour/WTA Tour "standings" are just
   * the tour's own world ranking, already stored on TennisPlayer. */
  async rankings(tour: 'atp' | 'wta', lang: Lang) {
    const cacheKey = `rankings:${tour}:${lang}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const players = await this.prisma.tennisPlayer.findMany({
      where: { tour, ranking: { not: null } },
      orderBy: { ranking: 'asc' },
      take: 100,
    });
    // Up to 100 players — was up to 100 individual translation queries, the
    // worst case of this N+1 pattern found in the codebase. One batched
    // call instead (same fix as GamesService/TennisService/standings above).
    const nameMap = await this.translations.translateMany(
      players.map((p) => p.name),
      lang,
    );
    const dtos = players.map((p) => ({
      id: p.id,
      name: nameMap[p.name] ?? p.name,
      country: p.country,
      ranking: p.ranking,
    }));
    await this.redis.set(cacheKey, JSON.stringify(dtos), STANDINGS_CACHE_TTL_SECONDS);
    return dtos;
  }
}
