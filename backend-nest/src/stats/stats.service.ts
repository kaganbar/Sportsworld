import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FormStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface TennisFormStats {
  played: number;
  wins: number;
  losses: number;
}

// Shared query helpers used by both games (team-based) and tennis
// (player-based) — mirrors games/services.py + tennis/services.py.
// Recent-form/H2H are always derived by querying, never a stored join table.
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  teamRecentResults(teamId: number, limit = 5) {
    return this.prisma.matchResult.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  teamHeadToHead(teamAId: number, teamBId: number, limit = 5) {
    return this.prisma.matchResult.findMany({
      where: {
        OR: [
          { homeTeamId: teamAId, awayTeamId: teamBId },
          { homeTeamId: teamBId, awayTeamId: teamAId },
        ],
      },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async teamFormStats(teamId: number, limit = 5): Promise<FormStats> {
    const results = await this.teamRecentResults(teamId, limit);
    const stats: FormStats = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    for (const r of results) {
      const isHome = r.homeTeamId === teamId;
      const scored = isHome ? r.homeScore : r.awayScore;
      const conceded = isHome ? r.awayScore : r.homeScore;
      stats.played += 1;
      stats.goalsFor += scored;
      stats.goalsAgainst += conceded;
      if (scored > conceded) stats.wins += 1;
      else if (scored === conceded) stats.draws += 1;
      else stats.losses += 1;
    }
    return stats;
  }

  tennisRecentResults(playerId: number, limit = 5) {
    return this.prisma.tennisMatch.findMany({
      where: { status: 'finished', OR: [{ player1Id: playerId }, { player2Id: playerId }] },
      include: { player1: true, player2: true, winner: true, sets: { orderBy: { setNumber: 'asc' } } },
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  tennisHeadToHead(playerAId: number, playerBId: number, limit = 5) {
    return this.prisma.tennisMatch.findMany({
      where: {
        status: 'finished',
        OR: [
          { player1Id: playerAId, player2Id: playerBId },
          { player1Id: playerBId, player2Id: playerAId },
        ],
      },
      include: { player1: true, player2: true, winner: true, sets: { orderBy: { setNumber: 'asc' } } },
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  async tennisFormStats(playerId: number, limit = 5): Promise<TennisFormStats> {
    const results = await this.tennisRecentResults(playerId, limit);
    const stats: TennisFormStats = { played: 0, wins: 0, losses: 0 };
    for (const m of results) {
      stats.played += 1;
      if (m.winnerId === playerId) stats.wins += 1;
      else stats.losses += 1;
    }
    return stats;
  }
}
