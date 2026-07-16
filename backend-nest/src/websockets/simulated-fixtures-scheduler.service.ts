import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Same hourly cadence as News/Transfer Agent's own scheduler pattern.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Baseball and volleyball have no real scraper source (none is planned —
// see prisma/seed.ts's comment history), so unlike football/basketball/
// tennis (kept perpetually fresh by ScraperService's real fixture pulls),
// their one-time seeded games eventually age out of GamesService.gamesToday's
// rolling 2-day window and the sport goes permanently empty — confirmed
// happening in practice during this project's own dev session once enough
// real time passed. This regenerates a fresh day's fixtures from the
// already-seeded teams whenever a sport's window has none, so the simulated
// demo stays populated indefinitely instead of going empty forever after
// the first ~2 days. Data is still clearly marked as simulated in the UI
// (see app/baseball/page.tsx's simulatedDataNote) — this keeps the demo
// alive, it does not pretend to be real.
@Injectable()
export class SimulatedFixturesSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SimulatedFixturesSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.run();
  }

  @Interval(CHECK_INTERVAL_MS)
  async run() {
    try {
      await this.ensureFixtures('baseball', 'MLB');
      await this.ensureFixtures('volleyball', 'FIVB Nations League');
    } catch (err) {
      this.logger.error(`Simulated fixtures scheduler failed: ${(err as Error).message}`);
    }
  }

  private async ensureFixtures(sport: 'baseball' | 'volleyball', competition: string) {
    // Same 2-day rolling window GamesService.gamesToday filters on — if
    // there's already at least one fixture in it, this sport doesn't need
    // regenerating yet.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    const existing = await this.prisma.game.count({ where: { sport, kickoff: { gte: start, lt: end } } });
    if (existing > 0) return;

    const teams = await this.prisma.team.findMany({ where: { sport } });
    if (teams.length < 2) return; // nothing seeded to schedule between

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    let created = 0;

    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const home = shuffled[i];
      const away = shuffled[i + 1];
      const isLive = i === 0; // first pairing kicks off live, same as seed.ts's fixture lists
      const kickoff = new Date();
      kickoff.setHours(18 + i, 0, 0, 0);

      const venueSuffix = sport === 'baseball' ? 'Stadium' : 'Arena';
      const game = await this.prisma.game.create({
        data: { sport, competition, kickoff, venue: `${home.name} ${venueSuffix}`, status: isLive ? 'live' : 'scheduled', homeTeamId: home.id, awayTeamId: away.id },
      });
      created++;

      if (isLive) {
        // A couple of periods of plausible in-progress history, same spirit
        // as seed.ts's own live-game seeding — SimulatedTickerService takes
        // over advancing it from here every 4s.
        if (sport === 'baseball') {
          await this.prisma.inningScore.createMany({
            data: [
              { gameId: game.id, inning: 1, homeScore: 1, awayScore: 0 },
              { gameId: game.id, inning: 2, homeScore: 0, awayScore: 2 },
            ],
          });
          await this.prisma.game.update({ where: { id: game.id }, data: { homeScore: 1, awayScore: 2 } });
        } else {
          await this.prisma.setScore.create({ data: { gameId: game.id, setNumber: 1, homeScore: 8, awayScore: 6 } });
          await this.prisma.game.update({ where: { id: game.id }, data: { homeScore: 0, awayScore: 0 } });
        }
      }
    }

    if (created > 0) {
      this.logger.log(`Simulated fixtures: generated ${created} new ${sport} game(s) for today (previous fixtures aged out of the rolling window).`);
    }
  }
}
