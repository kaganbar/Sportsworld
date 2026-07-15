import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TranslationsModule } from './translations/translations.module';
import { StatsModule } from './stats/stats.module';
import { GamesModule } from './games/games.module';
import { PlayersModule } from './players/players.module';
import { BasketballModule } from './basketball/basketball.module';
import { BaseballModule } from './baseball/baseball.module';
import { VolleyballModule } from './volleyball/volleyball.module';
import { TennisModule } from './tennis/tennis.module';
import { FootballAgentModule } from './agents/football-agent/football-agent.module';
import { BasketballAgentModule } from './agents/basketball-agent/basketball-agent.module';
import { BaseballAgentModule } from './agents/baseball-agent/baseball-agent.module';
import { VolleyballAgentModule } from './agents/volleyball-agent/volleyball-agent.module';
import { TennisAgentModule } from './agents/tennis-agent/tennis-agent.module';
import { GeneralSportsAgentModule } from './agents/general-sports-agent/general-sports-agent.module';
import { TransferAgentModule } from './agents/transfer-agent/transfer-agent.module';
import { StatisticsAgentModule } from './agents/statistics-agent/statistics-agent.module';
import { NewsAgentModule } from './agents/news-agent/news-agent.module';
import { PredictionAgentModule } from './agents/prediction-agent/prediction-agent.module';
import { MasterAgentModule } from './agents/master-agent/master-agent.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { ScraperModule } from './scraper/scraper.module';
import { AuthModule } from './auth/auth.module';
import { NewsModule } from './news/news.module';
import { TransfersModule } from './transfers/transfers.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { StandingsModule } from './standings/standings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    TranslationsModule,
    StatsModule,
    CompetitionsModule,
    StandingsModule,
    GamesModule,
    PlayersModule,
    BasketballModule,
    BaseballModule,
    VolleyballModule,
    TennisModule,
    FootballAgentModule,
    BasketballAgentModule,
    BaseballAgentModule,
    VolleyballAgentModule,
    TennisAgentModule,
    GeneralSportsAgentModule,
    TransferAgentModule,
    StatisticsAgentModule,
    NewsAgentModule,
    PredictionAgentModule,
    MasterAgentModule,
    WebsocketsModule,
    ScraperModule,
    AuthModule,
    NewsModule,
    TransfersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
