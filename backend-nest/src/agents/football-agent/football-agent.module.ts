import { Module } from '@nestjs/common';
import { FootballAgentController } from './football-agent.controller';
import { FootballAgentService } from './football-agent.service';
import { GamesModule } from '../../games/games.module';
import { StatsModule } from '../../stats/stats.module';
import { TranslationsModule } from '../../translations/translations.module';
import { AgentsCommonModule } from '../common/agents-common.module';

@Module({
  imports: [GamesModule, StatsModule, TranslationsModule, AgentsCommonModule],
  controllers: [FootballAgentController],
  providers: [FootballAgentService],
})
export class FootballAgentModule {}
