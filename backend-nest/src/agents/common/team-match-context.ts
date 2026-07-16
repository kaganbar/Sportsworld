import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { TranslationsService } from '../../translations/translations.service';
import { Lang } from '../../common/lang.decorator';

// Shared by every team-vs-team sport agent (football/basketball/baseball/
// volleyball — tennis is player-vs-player and builds its own context).
// Previously copy-pasted byte-for-byte into all 4 service files; extracted
// here since none of it is actually sport-specific — only each agent's
// SYSTEM_PROMPT/ENRICHMENT_SYSTEM_PROMPT text differs.
export async function buildTeamMatchContext(
  deps: { prisma: PrismaService; stats: StatsService; translations: TranslationsService },
  game: any,
  lang: Lang,
) {
  const tr = (text: string) => deps.translations.translate(text, lang);

  const resultDtos = async (results: any[]) =>
    Promise.all(
      results.map(async (r) => ({
        date: r.date.toISOString().slice(0, 10),
        competition: await tr(r.competition),
        home_team: await tr(r.homeTeam.name),
        away_team: await tr(r.awayTeam.name),
        score: `${r.homeScore}-${r.awayScore}`,
      })),
    );

  const injuryDtos = async (teamId: number) => {
    const injuries = await deps.prisma.injury.findMany({ where: { teamId }, include: { player: true } });
    return Promise.all(
      injuries.map(async (i) => ({
        player: await tr(i.player.name),
        position: i.player.position,
        status: i.status,
        reason: i.reason,
      })),
    );
  };

  const [homeRecent, awayRecent, h2h, homeStats, awayStats, homeInjuries, awayInjuries] = await Promise.all([
    deps.stats.teamRecentResults(game.homeTeamId),
    deps.stats.teamRecentResults(game.awayTeamId),
    deps.stats.teamHeadToHead(game.homeTeamId, game.awayTeamId),
    deps.stats.teamFormStats(game.homeTeamId),
    deps.stats.teamFormStats(game.awayTeamId),
    injuryDtos(game.homeTeamId),
    injuryDtos(game.awayTeamId),
  ]);

  return {
    fixture: {
      competition: await tr(game.competition),
      kickoff: game.kickoff.toISOString(),
      venue: await tr(game.venue),
      home_team: await tr(game.homeTeam.name),
      away_team: await tr(game.awayTeam.name),
    },
    home_team: {
      name: await tr(game.homeTeam.name),
      recent_form: await resultDtos(homeRecent),
      form_stats: homeStats,
      injuries: homeInjuries,
    },
    away_team: {
      name: await tr(game.awayTeam.name),
      recent_form: await resultDtos(awayRecent),
      form_stats: awayStats,
      injuries: awayInjuries,
    },
    head_to_head: await resultDtos(h2h),
  };
}
