import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { InvoicesModule } from 'src/invoices/invoices.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { ReservationRoomsModule } from 'src/reservation-rooms/reservation-rooms.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { RoomPricesModule } from 'src/room-prices/room-prices.module';
import { UsersModule } from 'src/users/users.module';
import { RoomHoldsModule } from 'src/room-holds/room-holds.module';

@Module({
  imports: [
    InvoicesModule,
    PaymentsModule,
    ReservationRoomsModule,
    RoomsModule,
    RoomPricesModule,
    UsersModule,
    RoomHoldsModule,
  ],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
