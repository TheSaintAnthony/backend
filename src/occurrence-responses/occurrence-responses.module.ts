import { Module } from '@nestjs/common';
import { OccurrenceResponsesController } from './occurrence-responses.controller';
import { OccurrenceResponsesService } from './occurrence-responses.service';
import { DrizzleModule } from 'src/db/drizzle.module';
@Module({
  imports: [DrizzleModule],
  controllers: [OccurrenceResponsesController],
  providers: [OccurrenceResponsesService],
  exports: [OccurrenceResponsesService],
})
export class OccurrenceResponsesModule {}
