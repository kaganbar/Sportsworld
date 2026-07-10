import { Controller, Get, Query } from '@nestjs/common';
import { TransfersService } from './transfers.service';

// Read-only for now — raw ingested rumors, no story-grouping/dedup or our
// own probability estimate yet. That's the Transfer Agent's job (Phase 8),
// not this ingestion pipeline's (Phase 6).
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.transfers.recentRumours(limit ? Number(limit) : undefined);
  }
}
