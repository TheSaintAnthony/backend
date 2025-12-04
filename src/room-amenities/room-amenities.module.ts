import { Module } from '@nestjs/common';
import { RoomAmenitiesService } from './room-amenities.service';
import { RoomAmenitiesController } from './room-amenities.controller';
@Module({
  providers: [RoomAmenitiesService],
  controllers: [RoomAmenitiesController],
})
export class RoomAmenitiesModule {}
