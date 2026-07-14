import { Module } from '@nestjs/common';
import { TennisAgentController } from './tennis-agent.controller';
import { TennisAgentService } from './tennis-agent.service';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';
import { NewsAgentModule } from '../news-agent/news-agent.module';
import { PredictionAgentModule } from '../prediction-agent/prediction-agent.module';

@Module({
  imports: [StatsModule, TranslationsModule, AgentsCommonModule, NewsAgentModule, PredictionAgentModule],
  controllers: [TennisAgentController],
  providers: [TennisAgentService],
  exports: [TennisAgentService],
})
export class TennisAgentModule {}
