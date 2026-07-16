import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { SimulatedTickerService } from './simulated-ticker.service';
import { SimulatedFixturesSchedulerService } from './simulated-fixtures-scheduler.service';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [CompetitionsModule],
  providers: [LiveGateway, SimulatedTickerService, SimulatedFixturesSchedulerService],
})
export class WebsocketsModule {}
