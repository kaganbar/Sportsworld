import { Module } from '@nestjs/common';
import { BasketballAgentController } from './basketball-agent.controller';
import { BasketballAgentService } from './basketball-agent.service';
import { GamesModule } from '../../games/games.module';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [GamesModule, StatsModule, TranslationsModule, AgentsCommonModule],
  controllers: [BasketballAgentController],
  providers: [BasketballAgentService],
})
export class BasketballAgentModule {}
