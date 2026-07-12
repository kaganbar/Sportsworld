import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TransferIngestService } from './transfer-ingest.service';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [CompetitionsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransferIngestService],
})
export class TransfersModule {}
