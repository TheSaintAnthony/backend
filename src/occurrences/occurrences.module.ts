import { Module } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesController } from './occurrences.controller';
@Module({
  providers: [OccurrencesService],
  controllers: [OccurrencesController],
})
export class OccurrencesModule {}
