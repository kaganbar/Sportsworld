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
      is_real: player.isReal,
      team: {
        id: player.team.id,
        name: await this.translations.translate(player.team.name, lang),
        short_name: player.team.shortName,
      },
      season_stats: player.seasonStats ?? null,
    };
  }

  /** Full squad for a team, real players first — the only place `isReal`
   * (see prisma/enrich-real-players.ts / enrich-football-data-squads.ts /
   * enrich-balldontlie-rosters.ts) is surfaced as a listable roster; real
   * players are inserted additively after seeding and never appear in any
   * seeded Lineup, so without this endpoint they're not reachable from
   * anywhere in the UI at all. */
  async teamRoster(teamId: number, lang: Lang) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    const players = await this.prisma.player.findMany({
      where: { teamId },
      orderBy: [{ isReal: 'desc' }, { name: 'asc' }],
    });

    const names = players.map((p) => p.name);
    const map = await this.translations.translateMany(names, lang);

    return {
      team: {
        id: team.id,
        name: map[team.name] ?? (await this.translations.translate(team.name, lang)),
        short_name: team.shortName,
        sport: team.sport,
        logo_url: team.logoUrl,
        coach_name: team.coachName,
        is_real: team.isReal,
      },
      players: players.map((p) => ({
        id: p.id,
        name: map[p.name] ?? p.name,
        position: p.position,
        shirt_number: p.shirtNumber,
        is_real: p.isReal,
      })),
    };
  }
}
