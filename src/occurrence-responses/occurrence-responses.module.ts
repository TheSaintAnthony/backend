import { Module } from '@nestjs/common';
import { OccurrenceResponsesController } from './occurrence-responses.controller';
import { OccurrenceResponsesService } from './occurrence-responses.service';
import { DrizzleModule } from 'src/db/drizzle.module';
import { AuthModule } from 'src/auth/auth.module';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [OccurrenceResponsesController],
  providers: [OccurrenceResponsesService, StatusLookupService],
  exports: [OccurrenceResponsesService],
})
export class OccurrenceResponsesModule {}
