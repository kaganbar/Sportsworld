/**
 * One-time backfill: `Team.isReal`/`Game.isReal` were added mid-session,
 * and Postgres's `ADD COLUMN ... DEFAULT false` retroactively set every
 * pre-existing row (including the hundreds of genuinely real rows the
 * live scraper had already ingested before the column existed) to false.
 * Going forward, NormalizeService.upsertTeam/upsertTeamSport correctly
 * mark newly-created rows real — this script only fixes the backlog.
 *
 * A team is fictional iff its name exactly matches one of seed.ts's known
 * fictional team arrays (FOOTBALL_TEAMS/LIGAT_HAAL_TEAMS/BASKETBALL_TEAMS/
 * BASEBALL_TEAMS/VOLLEYBALL_TEAMS) — everything else in the Team table was
 * created by the real scraper pipeline, since seed.ts never creates a team
 * under any other name. A game is real iff both its home and away teams
 * are real — seed.ts only ever pairs its own fictional teams together,
 * and the scraper only ever pairs real teams together, so this is an
 * exact equivalence, not a heuristic.
 *
 * Safe to re-run (idempotent — only ever sets isReal from false to true,
 * never the reverse).
 * Usage: npx ts-node prisma/backfill-is-real.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FICTIONAL_TEAM_NAMES = [
  'Real Madrid', 'FC Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich', 'Paris Saint-Germain',
  'Maccabi Haifa', 'Maccabi Tel Aviv', "Hapoel Be'er Sheva", 'Beitar Jerusalem', 'Hapoel Tel Aviv',
  'Maccabi Petah Tikva', 'Bnei Sakhnin', 'Ashdod', 'Hapoel Haifa', 'Hapoel Jerusalem',
  'Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors', 'Miami Heat',
  'New York Yankees', 'Los Angeles Dodgers', 'Boston Red Sox', 'Houston Astros',
  'Italy', 'Poland', 'Brazil', 'USA',
];

async function main() {
  const teamResult = await prisma.team.updateMany({
    where: { name: { notIn: FICTIONAL_TEAM_NAMES }, isReal: false },
    data: { isReal: true },
  });
  console.log(`Teams: marked ${teamResult.count} real (backlog from before Team.isReal existed).`);

  const realTeamIds = (await prisma.team.findMany({ where: { isReal: true }, select: { id: true } })).map((t) => t.id);

  const gameResult = await prisma.game.updateMany({
    where: { homeTeamId: { in: realTeamIds }, awayTeamId: { in: realTeamIds }, isReal: false },
    data: { isReal: true },
  });
  console.log(`Games: marked ${gameResult.count} real (backlog from before Game.isReal existed).`);

  const [teamCounts, gameCounts] = await Promise.all([
    prisma.team.groupBy({ by: ['isReal'], _count: true }),
    prisma.game.groupBy({ by: ['isReal'], _count: true }),
  ]);
  console.log('Final Team isReal distribution:', teamCounts);
  console.log('Final Game isReal distribution:', gameCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
