import { Module } from '@nestjs/common';
import { TransferAgentController } from './transfer-agent.controller';
import { TransferAgentService } from './transfer-agent.service';
import { TransferAgentSchedulerService } from './transfer-agent-scheduler.service';
import { AgentsCommonModule } from '../common/agents-common.module';
import { CompetitionsModule } from '../../competitions/competitions.module';

@Module({
  imports: [AgentsCommonModule, CompetitionsModule],
  controllers: [TransferAgentController],
  providers: [TransferAgentService, TransferAgentSchedulerService],
  exports: [TransferAgentService],
})
export class TransferAgentModule {}
