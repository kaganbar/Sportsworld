import { Module } from '@nestjs/common';
import { VolleyballController } from './volleyball.controller';
import { VolleyballService } from './volleyball.service';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  controllers: [VolleyballController],
  providers: [VolleyballService],
})
export class VolleyballModule {}
