import { Module } from '@nestjs/common';
import { ReservationRoomsService } from './reservation-rooms.service';
import { ReservationRoomsController } from './reservation-rooms.controller';
@Module({
  providers: [ReservationRoomsService],
  controllers: [ReservationRoomsController],
  exports: [ReservationRoomsService],
})
export class ReservationRoomsModule {}
