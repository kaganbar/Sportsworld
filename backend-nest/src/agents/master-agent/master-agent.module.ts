import { Module } from '@nestjs/common';
import { MasterAgentController } from './master-agent.controller';
import { MasterAgentService } from './master-agent.service';
import { FootballAgentModule } from '../football-agent/football-agent.module';
import { BasketballAgentModule } from '../basketball-agent/basketball-agent.module';
import { BaseballAgentModule } from '../baseball-agent/baseball-agent.module';
import { VolleyballAgentModule } from '../volleyball-agent/volleyball-agent.module';
import { TennisAgentModule } from '../tennis-agent/tennis-agent.module';
import { GeneralSportsAgentModule } from '../general-sports-agent/general-sports-agent.module';
import { TransferAgentModule } from '../transfer-agent/transfer-agent.module';
import { StatisticsAgentModule } from '../statistics-agent/statistics-agent.module';
import { NewsAgentModule } from '../news-agent/news-agent.module';
import { PredictionAgentModule } from '../prediction-agent/prediction-agent.module';

// Every other agent module is imported here so their services can be
// injected directly by DI — each Master Agent "tool" is an in-process
// function call, not an HTTP round-trip.
@Module({
  imports: [
    FootballAgentModule,
    BasketballAgentModule,
    BaseballAgentModule,
    VolleyballAgentModule,
    TennisAgentModule,
    GeneralSportsAgentModule,
    TransferAgentModule,
    StatisticsAgentModule,
    NewsAgentModule,
    PredictionAgentModule,
  ],
  controllers: [MasterAgentController],
  providers: [MasterAgentService],
})
export class MasterAgentModule {}
