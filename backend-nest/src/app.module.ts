import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TranslationsModule,
    StatsModule,
    GamesModule,
    BasketballModule,
    TennisModule,
    FootballAgentModule,
    BasketballAgentModule,
    TennisAgentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
