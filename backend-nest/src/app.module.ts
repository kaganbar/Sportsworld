import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TranslationsModule } from './translations/translations.module';
import { StatsModule } from './stats/stats.module';
import { GamesModule } from './games/games.module';
import { BasketballModule } from './basketball/basketball.module';
import { TennisModule } from './tennis/tennis.module';
import { FootballAgentModule } from './agents/football-agent/football-agent.module';
import { BasketballAgentModule } from './agents/basketball-agent/basketball-agent.module';
import { TennisAgentModule } from './agents/tennis-agent/tennis-agent.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    TranslationsModule,
    StatsModule,
    GamesModule,
    BasketballModule,
    TennisModule,
    FootballAgentModule,
    BasketballAgentModule,
    TennisAgentModule,
    WebsocketsModule,
    ScraperModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
