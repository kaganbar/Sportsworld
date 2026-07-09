import { Module } from '@nestjs/common';
import { BasketballController } from './basketball.controller';
import { BasketballService } from './basketball.service';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  controllers: [BasketballController],
  providers: [BasketballService],
})
export class BasketballModule {}
