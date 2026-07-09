import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { SimulatedTickerService } from './simulated-ticker.service';

@Module({
  providers: [LiveGateway, SimulatedTickerService],
})
export class WebsocketsModule {}
