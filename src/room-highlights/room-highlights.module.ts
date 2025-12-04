import { Module } from '@nestjs/common';
import { RoomHighlightsService } from './room-highlights.service';
import { RoomHighlightsController } from './room-highlights.controller';
@Module({
  providers: [RoomHighlightsService],
  controllers: [RoomHighlightsController],
})
export class RoomHighlightsModule {}
