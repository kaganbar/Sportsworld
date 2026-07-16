import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { SimulatedTickerService } from './simulated-ticker.service';
import { SimulatedFixturesSchedulerService } from './simulated-fixtures-scheduler.service';

@Module({
  providers: [LiveGateway, SimulatedTickerService, SimulatedFixturesSchedulerService],
})
export class WebsocketsModule {}
