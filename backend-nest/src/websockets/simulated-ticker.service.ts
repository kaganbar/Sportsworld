import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GAME_TICKS_CHANNEL } from '../redis/redis-channels';

const MAX_QUARTERS = 4;
const MAX_INNINGS = 9;

// Ticks simulated live state for every status="live" game/match, broadcasting
// each change via Redis pub/sub -> LiveGateway (on every backend instance) so
// connected WebSocket clients see it without polling. Mirrors
// games/management/commands/run_live_ticker.py
// tick-for-tick (same odds, same finish conditions) so the two backends are
// comparable side by side during the migration. Uses Math.random() rather
// than a seeded PRNG deliberately — like Django's `random.Random()` (unseeded),
// this is the live simulation, not the deterministic mock/seed data.
//
// Gated behind LIVE_DATA_SOURCE=simulated: once ScraperService (Phase D) is
// pulling real fixtures, this must not also run — both mutate any row with
// status="live" regardless of where that row came from, so running both at
// once would have this overwrite real scraped scores with random ones
// between the scraper's polls. Default is "scraper"; set
// LIVE_DATA_SOURCE=simulated to fall back to this for fully offline/seeded-
// data dev.
@Injectable()
export class SimulatedTickerService {
  private readonly logger = new Logger(SimulatedTickerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  @Interval(4000)
  async tick() {
    // Baseball/volleyball have no real scraper source (none is planned), so
    // they always simulate regardless of this deployment's global
    // LIVE_DATA_SOURCE — the gate below only applies to the three sports
    // that DO have a real scraper alternative (see the class comment above).
    const ticks = [this.tickBaseball(), this.tickVolleyball()];
    if (this.config.get<string>('LIVE_DATA_SOURCE', 'scraper') === 'simulated') {
      ticks.push(this.tickFootball(), this.tickBasketball(), this.tickTennis());
    }
    await Promise.all(ticks);
  }

  private emit(gameKey: string, payload: unknown) {
    this.redis.publish(GAME_TICKS_CHANNEL, JSON.stringify({ gameKey, payload }));
  }

  private async tickFootball() {
    const games = await this.prisma.game.findMany({ where: { sport: 'football', status: 'live' } });

    for (const game of games) {
      const minute = (game.minute ?? 0) + 1;
      let homeScore = game.homeScore ?? 0;
      let awayScore = game.awayScore ?? 0;
      let event: Record<string, unknown> | null = null;

      const roll = Math.random();
      if (roll < 0.1) {
        const side = Math.random() < 0.5 ? 'home' : 'away';
        if (side === 'home') homeScore += 1;
        else awayScore += 1;
        event = { type: 'goal', team: side, minute };
      } else if (roll < 0.15) {
        const side = Math.random() < 0.5 ? 'home' : 'away';
        const card = Math.random() < 0.5 ? 'yellow' : 'red';
        event = { type: 'card', team: side, minute, card };
      }

      const status: 'live' | 'finished' = minute >= 90 ? 'finished' : 'live';

      await this.prisma.game.update({
        where: { id: game.id },
        data: { minute, homeScore, awayScore, status },
      });

      this.emit(`game-football-${game.id}`, {
        minute,
        home_score: homeScore,
        away_score: awayScore,
        status,
        event,
      });
    }
  }

  private async tickBasketball() {
    const games = await this.prisma.game.findMany({ where: { sport: 'basketball', status: 'live' } });

    for (const game of games) {
      const latest = await this.prisma.quarterScore.findFirst({
        where: { gameId: game.id },
        orderBy: { quarter: 'desc' },
      });
      if (!latest) continue;

      let quarter = latest.quarter;
      let quarterHome = latest.homeScore;
      let quarterAway = latest.awayScore;
      let event: Record<string, unknown> | null = null;

      if (Math.random() < 0.4) {
        const side = Math.random() < 0.5 ? 'home' : 'away';
        const points = [2, 2, 3][Math.floor(Math.random() * 3)];
        if (side === 'home') quarterHome += points;
        else quarterAway += points;
        await this.prisma.quarterScore.update({
          where: { id: latest.id },
          data: { homeScore: quarterHome, awayScore: quarterAway },
        });
        event = { type: 'basket', team: side, points };
      }

      let finished = false;
      if (quarter < MAX_QUARTERS && Math.random() < 0.05) {
        const created = await this.prisma.quarterScore.create({
          data: { gameId: game.id, quarter: quarter + 1, homeScore: 0, awayScore: 0 },
        });
        quarter = created.quarter;
        quarterHome = created.homeScore;
        quarterAway = created.awayScore;
      } else if (quarter === MAX_QUARTERS && quarterHome + quarterAway >= 40) {
        finished = true;
      }

      const totals = await this.prisma.quarterScore.aggregate({
        where: { gameId: game.id },
        _sum: { homeScore: true, awayScore: true },
      });
      const homeScore = totals._sum.homeScore ?? 0;
      const awayScore = totals._sum.awayScore ?? 0;
      const status: 'live' | 'finished' = finished ? 'finished' : 'live';

      await this.prisma.game.update({
        where: { id: game.id },
        data: { homeScore, awayScore, status },
      });

      this.emit(`game-basketball-${game.id}`, {
        home_score: homeScore,
        away_score: awayScore,
        quarter,
        quarter_home_score: quarterHome,
        quarter_away_score: quarterAway,
        status,
        event,
      });
    }
  }

  private async tickTennis() {
    const matches = await this.prisma.tennisMatch.findMany({ where: { status: 'live' } });

    for (const match of matches) {
      const current = await this.prisma.tennisSet.findFirst({
        where: { matchId: match.id },
        orderBy: { setNumber: 'desc' },
      });
      if (!current) continue;

      let p1 = current.player1Games;
      let p2 = current.player2Games;
      if (Math.random() < 0.3) {
        if (Math.random() < 0.5) p1 += 1;
        else p2 += 1;
        await this.prisma.tennisSet.update({
          where: { id: current.id },
          data: { player1Games: p1, player2Games: p2 },
        });
      }

      // Simple set-won check (ignores tiebreak nuance — good enough for a
      // simulated demo): first to 6+ games with a 2-game lead wins the set.
      let status: 'live' | 'finished' = 'live';
      if (Math.max(p1, p2) >= 6 && Math.abs(p1 - p2) >= 2) {
        status = 'finished';
        const winnerId = p1 > p2 ? match.player1Id : match.player2Id;
        await this.prisma.tennisMatch.update({
          where: { id: match.id },
          data: { status, winnerId },
        });
      }

      this.emit(`match-tennis-${match.id}`, {
        set_number: current.setNumber,
        player1_games: p1,
        player2_games: p2,
        status,
      });
    }
  }

  private async tickBaseball() {
    const games = await this.prisma.game.findMany({ where: { sport: 'baseball', status: 'live' } });

    for (const game of games) {
      const latest = await this.prisma.inningScore.findFirst({
        where: { gameId: game.id },
        orderBy: { inning: 'desc' },
      });
      if (!latest) continue;

      let inning = latest.inning;
      let inningHome = latest.homeScore;
      let inningAway = latest.awayScore;
      let event: Record<string, unknown> | null = null;

      if (Math.random() < 0.2) {
        const side = Math.random() < 0.5 ? 'home' : 'away';
        const runs = [1, 1, 2, 3][Math.floor(Math.random() * 4)];
        if (side === 'home') inningHome += runs;
        else inningAway += runs;
        await this.prisma.inningScore.update({
          where: { id: latest.id },
          data: { homeScore: inningHome, awayScore: inningAway },
        });
        event = { type: 'run', team: side, runs };
      }

      const totals = await this.prisma.inningScore.aggregate({
        where: { gameId: game.id },
        _sum: { homeScore: true, awayScore: true },
      });
      const homeScore = totals._sum.homeScore ?? 0;
      const awayScore = totals._sum.awayScore ?? 0;
      const tied = homeScore === awayScore;

      let finished = false;
      // Advance to a new inning while still within the regulation 9, or
      // indefinitely into extra innings if tied at/past inning 9 — a tie
      // can't end a baseball game. Once past 9 innings and NOT tied, the
      // game is over (real baseball's "no need to bat if already ahead
      // entering the bottom of the 9th" nuance is simplified to this single
      // not-tied check on the per-inning aggregate).
      if ((inning < MAX_INNINGS || tied) && Math.random() < 0.08) {
        const created = await this.prisma.inningScore.create({
          data: { gameId: game.id, inning: inning + 1, homeScore: 0, awayScore: 0 },
        });
        inning = created.inning;
      } else if (inning >= MAX_INNINGS && !tied) {
        finished = true;
      }

      const status: 'live' | 'finished' = finished ? 'finished' : 'live';

      await this.prisma.game.update({
        where: { id: game.id },
        data: { homeScore, awayScore, status },
      });

      this.emit(`game-baseball-${game.id}`, {
        home_score: homeScore,
        away_score: awayScore,
        inning,
        inning_home_score: inningHome,
        inning_away_score: inningAway,
        status,
        event,
      });
    }
  }

  private async tickVolleyball() {
    const games = await this.prisma.game.findMany({ where: { sport: 'volleyball', status: 'live' } });

    for (const game of games) {
      const current = await this.prisma.setScore.findFirst({
        where: { gameId: game.id },
        orderBy: { setNumber: 'desc' },
      });
      if (!current) continue;

      let home = current.homeScore;
      let away = current.awayScore;
      if (Math.random() < 0.4) {
        if (Math.random() < 0.5) home += 1;
        else away += 1;
        await this.prisma.setScore.update({
          where: { id: current.id },
          data: { homeScore: home, awayScore: away },
        });
      }

      // Only sets strictly before the current one are guaranteed complete
      // (a new SetScore row is only ever created once the previous one is
      // won) — counting the in-progress current row here would double-count
      // whichever side happens to be numerically ahead mid-set.
      const priorSets = await this.prisma.setScore.findMany({
        where: { gameId: game.id, setNumber: { lt: current.setNumber } },
      });
      let homeSetsWon = priorSets.filter((s) => s.homeScore > s.awayScore).length;
      let awaySetsWon = priorSets.filter((s) => s.awayScore > s.homeScore).length;

      // Real volleyball: first to 25 points with a 2-point lead wins a set
      // (15 for a deciding 5th set); first to 3 sets wins the match.
      const pointsToWin = current.setNumber >= 5 ? 15 : 25;
      const setJustWon = Math.max(home, away) >= pointsToWin && Math.abs(home - away) >= 2;

      let finished = false;
      if (setJustWon) {
        if (home > away) homeSetsWon += 1;
        else awaySetsWon += 1;

        if (homeSetsWon >= 3 || awaySetsWon >= 3) {
          finished = true;
        } else {
          await this.prisma.setScore.create({
            data: { gameId: game.id, setNumber: current.setNumber + 1, homeScore: 0, awayScore: 0 },
          });
        }
      }

      const status: 'live' | 'finished' = finished ? 'finished' : 'live';

      await this.prisma.game.update({
        where: { id: game.id },
        data: { homeScore: homeSetsWon, awayScore: awaySetsWon, status },
      });

      this.emit(`game-volleyball-${game.id}`, {
        home_score: homeSetsWon,
        away_score: awaySetsWon,
        set_number: current.setNumber,
        set_home_score: home,
        set_away_score: away,
        status,
      });
    }
  }
}
