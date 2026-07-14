import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Lang } from '../common/lang.decorator';

export type SportKey = 'football' | 'basketball' | 'tennis';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a raw scraper `competitionDisplayName` string to a Competition
   * row for the given sport, matching against each competition's alias list
   * via a case-insensitive prefix match — real strings are commonly
   * "<Base Name> - <Round/Group>" (e.g. "FIFA World Cup - Quarter Finals",
   * "AmeriCup - Pre-qualifiers - Caribbean - Group A"), so a prefix match
   * against the base name catches these without an exhaustive alias list.
   * The longest matching alias wins when more than one prefixes. Falls back
   * to that sport's reserved "other" row when nothing matches — never
   * throws, never blocks ingestion, same graceful-degradation spirit as
   * TranslationsService.
   */
  async resolveCompetition(sportKey: SportKey, rawName: string) {
    const competitions = await this.prisma.competition.findMany({ where: { sportKey } });
    const lower = rawName.toLowerCase();

    let best: (typeof competitions)[number] | null = null;
    let bestAliasLength = -1;
    for (const c of competitions) {
      if (c.slug === 'other') continue;
      for (const alias of c.aliases) {
        const aliasLower = alias.toLowerCase();
        if (lower.startsWith(aliasLower) && aliasLower.length > bestAliasLength) {
          best = c;
          bestAliasLength = aliasLower.length;
        }
      }
    }
    if (best) return best;

    const other = competitions.find((c) => c.slug === 'other');
    if (other) return other;
    // Shouldn't happen once seeded (seed-competitions.ts creates one "other"
    // row per sport), but never block ingestion on missing seed data.
    return this.prisma.competition.upsert({
      where: { sportKey_slug: { sportKey, slug: 'other' } },
      update: {},
      create: { sportKey, slug: 'other', name: 'Other', nameHe: 'אחר', tier: 999, aliases: [] },
    });
  }

  /** Upserts the observed team<->competition relationship — called once per
   * team per game ingested (see scraper/normalize.service.ts). A team's
   * competition membership is observed from games it actually plays, not
   * configured by hand. Cheap no-op on repeat. */
  async ensureTeamCompetition(teamId: number, competitionId: number) {
    await this.prisma.teamCompetition.upsert({
      where: { teamId_competitionId: { teamId, competitionId } },
      update: {},
      create: { teamId, competitionId },
    });
  }

  /** Every team a story/cluster's mentioned club names resolve to, unioned
   * into their competitions — used by the News/Transfer agent tagging step. */
  async competitionsForTeamIds(teamIds: number[]): Promise<number[]> {
    if (teamIds.length === 0) return [];
    const rows = await this.prisma.teamCompetition.findMany({
      where: { teamId: { in: teamIds } },
      select: { competitionId: true },
    });
    return [...new Set(rows.map((r) => r.competitionId))];
  }

  /**
   * Today's (+tomorrow, same 2-day window as GamesService.gamesToday /
   * TennisService.matchesToday, so the count a competition tile shows
   * matches exactly what its Live/Upcoming tabs would list) match count per
   * competition — the design brief's "N matches" competition-tile stat.
   * Grouped counts, not per-competition queries: one query regardless of
   * how many competitions a sport has.
   */
  private async matchCountsForSport(sportKey: SportKey): Promise<Map<number, number>> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    const rows =
      sportKey === 'tennis'
        ? await this.prisma.tennisMatch.groupBy({
            by: ['competitionId'],
            where: { startTime: { gte: start, lt: end }, competitionId: { not: null } },
            _count: { _all: true },
          })
        : await this.prisma.game.groupBy({
            by: ['competitionId'],
            where: { sport: sportKey, kickoff: { gte: start, lt: end }, competitionId: { not: null } },
            _count: { _all: true },
          });

    return new Map(rows.filter((r) => r.competitionId != null).map((r) => [r.competitionId as number, r._count._all]));
  }

  async listForSport(sportKey: SportKey, lang: Lang) {
    const [competitions, counts] = await Promise.all([
      this.prisma.competition.findMany({ where: { sportKey }, orderBy: { tier: 'asc' } }),
      this.matchCountsForSport(sportKey),
    ]);
    return competitions.map((c) => ({
      slug: c.slug,
      name: lang === 'he' ? c.nameHe : c.name,
      match_count: counts.get(c.id) ?? 0,
    }));
  }

  async findBySlug(sportKey: SportKey, slug: string) {
    return this.prisma.competition.findUnique({ where: { sportKey_slug: { sportKey, slug } } });
  }

  /**
   * Best-effort: resolves free-text (a news headline/summary, or a
   * transfer's fromClub/toClub) against known Team/TennisPlayer names via
   * case-insensitive substring match, then to their observed competitions
   * via TeamCompetition (teams) / TennisMatch.competitionId (players).
   * Used by the News/Transfer agents' competition tagging step — never
   * throws, returns [] when nothing matches rather than erroring, same
   * graceful-degradation spirit as the rest of this service.
   */
  async competitionsForText(text: string): Promise<number[]> {
    const lower = text.toLowerCase();
    const [teams, players] = await Promise.all([
      this.prisma.team.findMany({ select: { id: true, name: true } }),
      this.prisma.tennisPlayer.findMany({ select: { id: true, name: true } }),
    ]);
    const teamIds = teams.filter((t) => lower.includes(t.name.toLowerCase())).map((t) => t.id);
    const playerIds = players.filter((p) => lower.includes(p.name.toLowerCase())).map((p) => p.id);
    if (teamIds.length === 0 && playerIds.length === 0) return [];

    const [fromTeams, matchRows] = await Promise.all([
      this.competitionsForTeamIds(teamIds),
      playerIds.length
        ? this.prisma.tennisMatch.findMany({
            where: { OR: [{ player1Id: { in: playerIds } }, { player2Id: { in: playerIds } }], competitionId: { not: null } },
            select: { competitionId: true },
          })
        : Promise.resolve([]),
    ]);
    const fromPlayers = [...new Set(matchRows.map((r) => r.competitionId).filter((x): x is number => x != null))];
    return [...new Set([...fromTeams, ...fromPlayers])];
  }
}
