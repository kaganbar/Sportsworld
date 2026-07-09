import { Module } from '@nestjs/common';
import { TennisController } from './tennis.controller';
import { TennisService } from './tennis.service';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [StatsModule],
  controllers: [TennisController],
  providers: [TennisService],
})
export class TennisModule {}
