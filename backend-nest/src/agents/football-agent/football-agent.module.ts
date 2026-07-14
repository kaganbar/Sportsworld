import { Module } from '@nestjs/common';
import { FootballAgentController } from './football-agent.controller';
import { FootballAgentService } from './football-agent.service';
import { GamesModule } from '../../games/games.module';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';
import { NewsAgentModule } from '../news-agent/news-agent.module';
import { PredictionAgentModule } from '../prediction-agent/prediction-agent.module';

@Module({
  imports: [GamesModule, StatsModule, TranslationsModule, AgentsCommonModule, NewsAgentModule, PredictionAgentModule],
  controllers: [FootballAgentController],
  providers: [FootballAgentService],
  exports: [FootballAgentService],
})
export class FootballAgentModule {}
