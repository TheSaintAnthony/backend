import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { RoomsModule } from 'src/rooms/rooms.module';
import { UsersModule } from 'src/users/users.module';
import { RoomHoldsModule } from 'src/room-holds/room-holds.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [RoomsModule, UsersModule, RoomHoldsModule, EmailModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
