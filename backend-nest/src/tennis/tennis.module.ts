import { Module } from '@nestjs/common';
import { TennisController } from './tennis.controller';
import { TennisService } from './tennis.service';
import { StatsModule } from '../stats/stats.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [StatsModule, CompetitionsModule],
  controllers: [TennisController],
  providers: [TennisService],
})
export class TennisModule {}
