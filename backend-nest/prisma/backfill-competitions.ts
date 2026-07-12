/**
 * One-time backfill: resolves `competitionId` on every pre-existing
 * Game/MatchResult/TennisMatch row (and populates TeamCompetition) using the
 * same alias-prefix-match logic as CompetitionsService.resolveCompetition —
 * reimplemented standalone here (plain PrismaClient, no Nest DI) since this
 * runs outside the application context. Safe to re-run (idempotent upserts).
 * Usage: npm run backfill:competitions
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resolveCompetitionId(
  cache: Map<string, { id: number; slug: string; aliases: string[] }[]>,
  sportKey: string,
  rawName: string,
): Promise<number> {
  let competitions = cache.get(sportKey);
  if (!competitions) {
    competitions = await prisma.competition.findMany({ where: { sportKey } });
    cache.set(sportKey, competitions);
  }

  const lower = rawName.toLowerCase();
  let best: { id: number; slug: string } | null = null;
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
  if (best) return best.id;

  const other = competitions.find((c) => c.slug === 'other');
  if (other) return other.id;
  throw new Error(`No "other" Competition row seeded for sportKey=${sportKey} — run npm run seed:competitions first.`);
}

async function backfillGames(cache: Map<string, any[]>) {
  const games = await prisma.game.findMany({ where: { competitionId: null } });
  let updated = 0;
  for (const g of games) {
    const competitionId = await resolveCompetitionId(cache, g.sport, g.competition);
    await prisma.game.update({ where: { id: g.id }, data: { competitionId } });
    await prisma.teamCompetition.upsert({
      where: { teamId_competitionId: { teamId: g.homeTeamId, competitionId } },
      update: {},
      create: { teamId: g.homeTeamId, competitionId },
    });
    await prisma.teamCompetition.upsert({
      where: { teamId_competitionId: { teamId: g.awayTeamId, competitionId } },
      update: {},
      create: { teamId: g.awayTeamId, competitionId },
    });
    updated++;
  }
  console.log(`Game: backfilled ${updated}/${games.length} rows.`);
}

async function backfillMatchResults(cache: Map<string, any[]>) {
  // MatchResult has no `sport` column (it's shared by football+basketball
  // via the team's own sport), so resolve sportKey from the home team.
  const results = await prisma.matchResult.findMany({
    where: { competitionId: null },
    include: { homeTeam: true },
  });
  let updated = 0;
  for (const r of results) {
    const competitionId = await resolveCompetitionId(cache, r.homeTeam.sport, r.competition);
    await prisma.matchResult.update({ where: { id: r.id }, data: { competitionId } });
    updated++;
  }
  console.log(`MatchResult: backfilled ${updated}/${results.length} rows.`);
}

async function backfillTennisMatches(cache: Map<string, any[]>) {
  const matches = await prisma.tennisMatch.findMany({ where: { competitionId: null } });
  let updated = 0;
  for (const m of matches) {
    const competitionId = await resolveCompetitionId(cache, 'tennis', m.tournament);
    await prisma.tennisMatch.update({ where: { id: m.id }, data: { competitionId } });
    updated++;
  }
  console.log(`TennisMatch: backfilled ${updated}/${matches.length} rows.`);
}

// Same substring-match logic as CompetitionsService.competitionsForText,
// reimplemented standalone for the same reason as resolveCompetitionId
// above. Only needed for clusters/stories that predate the tagging code —
// new ones are tagged as they're created (see NewsAgentService /
// TransferAgentService), this only backfills the existing backlog once.
async function competitionsForText(
  text: string,
  teams: { id: number; name: string }[],
  players: { id: number; name: string }[],
): Promise<number[]> {
  const lower = text.toLowerCase();
  const teamIds = teams.filter((t) => lower.includes(t.name.toLowerCase())).map((t) => t.id);
  const playerIds = players.filter((p) => lower.includes(p.name.toLowerCase())).map((p) => p.id);
  if (teamIds.length === 0 && playerIds.length === 0) return [];

  const [teamCompetitionRows, matchRows] = await Promise.all([
    teamIds.length
      ? prisma.teamCompetition.findMany({ where: { teamId: { in: teamIds } }, select: { competitionId: true } })
      : Promise.resolve([]),
    playerIds.length
      ? prisma.tennisMatch.findMany({
          where: { OR: [{ player1Id: { in: playerIds } }, { player2Id: { in: playerIds } }], competitionId: { not: null } },
          select: { competitionId: true },
        })
      : Promise.resolve([]),
  ]);
  return [
    ...new Set([
      ...teamCompetitionRows.map((r) => r.competitionId),
      ...matchRows.map((r) => r.competitionId).filter((x): x is number => x != null),
    ]),
  ];
}

async function backfillNewsClusterTags() {
  const [clusters, teams, players] = await Promise.all([
    prisma.newsStoryCluster.findMany({ where: { competitions: { none: {} } } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.tennisPlayer.findMany({ select: { id: true, name: true } }),
  ]);
  let tagged = 0;
  for (const c of clusters) {
    const competitionIds = await competitionsForText(`${c.headline} ${c.summary ?? ''}`, teams, players);
    if (competitionIds.length === 0) continue;
    await prisma.newsStoryCluster.update({
      where: { id: c.id },
      data: { competitions: { set: competitionIds.map((id) => ({ id })) } },
    });
    tagged++;
  }
  console.log(`NewsStoryCluster: tagged ${tagged}/${clusters.length} untagged rows.`);
}

async function backfillTransferStoryTags() {
  const [stories, teams, players] = await Promise.all([
    prisma.transferStory.findMany({ where: { competitions: { none: {} } } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.tennisPlayer.findMany({ select: { id: true, name: true } }),
  ]);
  let tagged = 0;
  for (const s of stories) {
    const competitionIds = await competitionsForText(`${s.fromClub ?? ''} ${s.toClub}`, teams, players);
    if (competitionIds.length === 0) continue;
    await prisma.transferStory.update({
      where: { id: s.id },
      data: { competitions: { set: competitionIds.map((id) => ({ id })) } },
    });
    tagged++;
  }
  console.log(`TransferStory: tagged ${tagged}/${stories.length} untagged rows.`);
}

async function main() {
  const cache = new Map<string, any[]>();
  await backfillGames(cache);
  await backfillMatchResults(cache);
  await backfillTennisMatches(cache);
  await backfillNewsClusterTags();
  await backfillTransferStoryTags();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
