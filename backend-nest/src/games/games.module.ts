import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { StatsModule } from '../stats/stats.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [StatsModule, CompetitionsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
