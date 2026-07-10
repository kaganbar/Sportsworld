import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizedEvent } from './parsers/parser.interface';

// Maps a source-agnostic NormalizedEvent onto our Prisma schema via
// upserts keyed on each model's natural key, then emits the same
// 'game.tick' event SimulatedTickerService uses — LiveGateway doesn't know
// or care whether a tick came from the scraper or the simulator.
@Injectable()
export class NormalizeService {
  private readonly logger = new Logger(NormalizeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async upsertEvent(event: NormalizedEvent): Promise<void> {
    if (event.sport === 'tennis') {
      await this.upsertTennis(event);
    } else {
      await this.upsertTeamSport(event);
    }
  }

  private async ensureTranslation(source: string | undefined, translated: string | undefined) {
    if (!source || !translated || source === translated) return;
    await this.prisma.nameTranslation.upsert({
      where: { sourceText: source },
      update: { translatedText: translated },
      create: { sourceText: source, translatedText: translated },
    });
  }

  private async upsertTeam(
    name: string,
    shortName: string | undefined,
    color: string | undefined,
    country: string | undefined,
    sport: 'football' | 'basketball',
  ) {
    return this.prisma.team.upsert({
      where: { name },
      update: {
        ...(shortName ? { shortName } : {}),
        ...(color ? { primaryColor: color } : {}),
        ...(country ? { country } : {}),
      },
      create: {
        name,
        sport,
        shortName: shortName ?? name.slice(0, 3).toUpperCase(),
        country: country ?? '',
        primaryColor: color ?? '#1E7B34',
      },
    });
  }

  private async upsertTeamSport(event: NormalizedEvent) {
    const sport = event.sport as 'football' | 'basketball';

    await Promise.all([
      this.ensureTranslation(event.homeName, event.homeNameHe),
      this.ensureTranslation(event.awayName, event.awayNameHe),
      this.ensureTranslation(event.competition, event.competitionHe),
    ]);

    const [homeTeam, awayTeam] = await Promise.all([
      this.upsertTeam(event.homeName, event.homeShortName, event.homeColor, event.homeCountry, sport),
      this.upsertTeam(event.awayName, event.awayShortName, event.awayColor, event.awayCountry, sport),
    ]);

    const naturalKey = {
      sport_competition_kickoff_homeTeamId_awayTeamId: {
        sport,
        competition: event.competition,
        kickoff: event.kickoff,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      },
    };

    const existing = await this.prisma.game.findUnique({ where: naturalKey });

    const game = await this.prisma.game.upsert({
      where: naturalKey,
      update: {
        status: event.status,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        ...(sport === 'football' ? { minute: event.minute ?? null } : {}),
      },
      create: {
        sport,
        competition: event.competition,
        kickoff: event.kickoff,
        venue: '',
        status: event.status,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        minute: sport === 'football' ? (event.minute ?? null) : null,
      },
    });

    if (sport === 'football') {
      const changed =
        !existing ||
        existing.status !== game.status ||
        existing.homeScore !== game.homeScore ||
        existing.awayScore !== game.awayScore ||
        existing.minute !== game.minute;

      if (changed && game.status === 'live') {
        this.events.emit('game.tick', {
          gameKey: `game-football-${game.id}`,
          payload: {
            minute: game.minute,
            home_score: game.homeScore,
            away_score: game.awayScore,
            status: game.status,
            event: null,
          },
        });
      }
      return;
    }

    // Basketball: upsert whatever quarter breakdown the source gave us
    // (may be none — see the caveat in scores365-basketball.parser.ts).
    let latestQuarter: { quarter: number; homeScore: number; awayScore: number } | null = null;
    if (event.quarters && event.quarters.length > 0) {
      for (const q of event.quarters) {
        await this.prisma.quarterScore.upsert({
          where: { gameId_quarter: { gameId: game.id, quarter: q.quarter } },
          update: { homeScore: q.homeScore, awayScore: q.awayScore },
          create: { gameId: game.id, quarter: q.quarter, homeScore: q.homeScore, awayScore: q.awayScore },
        });
      }
      latestQuarter = event.quarters[event.quarters.length - 1];
    }

    const changed =
      !existing || existing.status !== game.status || existing.homeScore !== game.homeScore || existing.awayScore !== game.awayScore;

    if (changed && game.status === 'live' && latestQuarter) {
      this.events.emit('game.tick', {
        gameKey: `game-basketball-${game.id}`,
        payload: {
          home_score: game.homeScore,
          away_score: game.awayScore,
          quarter: latestQuarter.quarter,
          quarter_home_score: latestQuarter.homeScore,
          quarter_away_score: latestQuarter.awayScore,
          status: game.status,
          event: null,
        },
      });
    }
  }

  private async upsertPlayer(name: string, country: string | undefined, tour: 'atp' | 'wta', ranking: number | null | undefined) {
    return this.prisma.tennisPlayer.upsert({
      where: { name },
      update: { ...(ranking != null ? { ranking } : {}) },
      create: { name, country: country ?? '', tour, ranking: ranking ?? null },
    });
  }

  private async upsertTennis(event: NormalizedEvent) {
    const tour = event.tour ?? 'atp';

    await Promise.all([
      this.ensureTranslation(event.homeName, event.homeNameHe),
      this.ensureTranslation(event.awayName, event.awayNameHe),
      this.ensureTranslation(event.competition, event.competitionHe),
    ]);

    const [player1, player2] = await Promise.all([
      this.upsertPlayer(event.homeName, event.homeCountry, tour, event.homeRanking),
      this.upsertPlayer(event.awayName, event.awayCountry, tour, event.awayRanking),
    ]);

    const round = event.round ?? '';
    const naturalKey = {
      tour_tournament_round_startTime_player1Id_player2Id: {
        tour,
        tournament: event.competition,
        round,
        startTime: event.kickoff,
        player1Id: player1.id,
        player2Id: player2.id,
      },
    };

    const existing = await this.prisma.tennisMatch.findUnique({ where: naturalKey });

    let winnerId: number | undefined;
    if (event.status === 'finished' && event.homeScore != null && event.awayScore != null) {
      winnerId = event.homeScore > event.awayScore ? player1.id : player2.id;
    }

    const match = await this.prisma.tennisMatch.upsert({
      where: naturalKey,
      update: {
        status: event.status,
        ...(winnerId ? { winnerId } : {}),
      },
      create: {
        tour,
        tournament: event.competition,
        round,
        venue: '',
        startTime: event.kickoff,
        status: event.status,
        player1Id: player1.id,
        player2Id: player2.id,
        ...(winnerId ? { winnerId } : {}),
      },
    });

    let latestSet: { setNumber: number; player1Games: number; player2Games: number } | null = null;
    if (event.sets && event.sets.length > 0) {
      for (const s of event.sets) {
        await this.prisma.tennisSet.upsert({
          where: { matchId_setNumber: { matchId: match.id, setNumber: s.setNumber } },
          update: { player1Games: s.player1Games, player2Games: s.player2Games },
          create: { matchId: match.id, setNumber: s.setNumber, player1Games: s.player1Games, player2Games: s.player2Games },
        });
      }
      latestSet = event.sets[event.sets.length - 1];
    }

    const changed = !existing || existing.status !== match.status;
    if (changed && match.status === 'live' && latestSet) {
      this.events.emit('game.tick', {
        gameKey: `match-tennis-${match.id}`,
        payload: {
          set_number: latestSet.setNumber,
          player1_games: latestSet.player1Games,
          player2_games: latestSet.player2Games,
          status: match.status,
        },
      });
    }
  }
}
