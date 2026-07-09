import { Global, Module } from '@nestjs/common';
import { TranslationsService } from './translations.service';

@Global()
@Module({
  providers: [TranslationsService],
  exports: [TranslationsService],
})
export class TranslationsModule {}
