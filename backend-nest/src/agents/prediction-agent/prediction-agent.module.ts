import { Module } from '@nestjs/common';
import { PredictionAgentController } from './prediction-agent.controller';
import { PredictionAgentService } from './prediction-agent.service';
import { GamesModule } from '../../games/games.module';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [GamesModule, StatsModule, TranslationsModule, AgentsCommonModule],
  controllers: [PredictionAgentController],
  providers: [PredictionAgentService],
  exports: [PredictionAgentService],
})
export class PredictionAgentModule {}
