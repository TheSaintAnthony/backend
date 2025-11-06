import { Module } from '@nestjs/common';
import { RoomHoldsService } from './room-holds.service';

@Module({
  providers: [RoomHoldsService],
  exports: [RoomHoldsService],
})
export class RoomHoldsModule {}
