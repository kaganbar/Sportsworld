import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TransferIngestService } from './transfer-ingest.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService, TransferIngestService],
})
export class TransfersModule {}
