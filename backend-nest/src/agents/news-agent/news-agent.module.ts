import { Module } from '@nestjs/common';
import { NewsAgentController } from './news-agent.controller';
import { NewsAgentService } from './news-agent.service';
import { NewsAgentSchedulerService } from './news-agent-scheduler.service';
import { AgentsCommonModule } from '../common/agents-common.module';
import { CompetitionsModule } from '../../competitions/competitions.module';

@Module({
  imports: [AgentsCommonModule, CompetitionsModule],
  controllers: [NewsAgentController],
  providers: [NewsAgentService, NewsAgentSchedulerService],
  exports: [NewsAgentService],
})
export class NewsAgentModule {}
