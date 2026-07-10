import { Module } from '@nestjs/common';
import { StatisticsAgentController } from './statistics-agent.controller';
import { StatisticsAgentService } from './statistics-agent.service';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [StatsModule, TranslationsModule, AgentsCommonModule],
  controllers: [StatisticsAgentController],
  providers: [StatisticsAgentService],
  exports: [StatisticsAgentService],
})
export class StatisticsAgentModule {}
