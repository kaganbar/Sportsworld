import { Module } from '@nestjs/common';
import { BaseballController } from './baseball.controller';
import { BaseballService } from './baseball.service';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  controllers: [BaseballController],
  providers: [BaseballService],
})
export class BaseballModule {}
