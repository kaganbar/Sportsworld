import { Module } from '@nestjs/common';
import { NewsAgentController } from './news-agent.controller';
import { NewsAgentService } from './news-agent.service';
import { NewsAgentSchedulerService } from './news-agent-scheduler.service';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [AgentsCommonModule],
  controllers: [NewsAgentController],
  providers: [NewsAgentService, NewsAgentSchedulerService],
  exports: [NewsAgentService],
})
export class NewsAgentModule {}
