import { Module } from '@nestjs/common';
import { GeneralSportsAgentController } from './general-sports-agent.controller';
import { GeneralSportsAgentService } from './general-sports-agent.service';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [AgentsCommonModule],
  controllers: [GeneralSportsAgentController],
  providers: [GeneralSportsAgentService],
  exports: [GeneralSportsAgentService],
})
export class GeneralSportsAgentModule {}
