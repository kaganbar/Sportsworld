import { Module } from '@nestjs/common';
import { TransferAgentController } from './transfer-agent.controller';
import { TransferAgentService } from './transfer-agent.service';
import { TransferAgentSchedulerService } from './transfer-agent-scheduler.service';
import { AgentsCommonModule } from '../common/agents-common.module';
import { CompetitionsModule } from '../../competitions/competitions.module';
import { TranslationsModule } from '../../translations/translations.module';

@Module({
  imports: [AgentsCommonModule, CompetitionsModule, TranslationsModule],
  controllers: [TransferAgentController],
  providers: [TransferAgentService, TransferAgentSchedulerService],
  exports: [TransferAgentService],
})
export class TransferAgentModule {}
