import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const MAX_QUARTERS = 4;

// Ticks simulated live state for every status="live" game/match, broadcasting
// each change via EventEmitter2 -> LiveGateway so connected WebSocket clients
// see it without polling. Mirrors games/management/commands/run_live_ticker.py
// tick-for-tick (same odds, same finish conditions) so the two backends are
// comparable side by side during the migration. Uses Math.random() rather
// than a seeded PRNG deliberately — like Django's `random.Random()` (unseeded),
// this is the live simulation, not the deterministic mock/seed data.
@Injectable()
export class SimulatedTickerService {
  private readonly logger = new Logger(SimulatedTickerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  @Interval(4000)
  async tick() {
    await Promise.all([this.tickFootball(), this.tickBasketball(), this.tickTennis()]);
  }

  private emit(gameKey: string, payload: unknown) {
    this.events.emit('game.tick', { gameKey, payload });
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
}
