import { Module } from '@nestjs/common';
import { AgentCallerService } from './agent-caller.service';

@Module({
  providers: [AgentCallerService],
  exports: [AgentCallerService],
})
export class AgentsCommonModule {}
