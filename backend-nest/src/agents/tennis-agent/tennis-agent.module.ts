import { Module } from '@nestjs/common';
import { TennisAgentController } from './tennis-agent.controller';
import { TennisAgentService } from './tennis-agent.service';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [StatsModule, TranslationsModule, AgentsCommonModule],
  controllers: [TennisAgentController],
  providers: [TennisAgentService],
})
export class TennisAgentModule {}
