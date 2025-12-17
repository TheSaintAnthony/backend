import { Module } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesController } from './occurrences.controller';
import { AuthModule } from 'src/auth/auth.module';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';

@Module({
  imports: [AuthModule],
  providers: [OccurrencesService, StatusLookupService],
  controllers: [OccurrencesController],
})
export class OccurrencesModule {}
