import { Module } from '@nestjs/common';
import { DrizzleModule } from './db/drizzle.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { LookupsModule } from './lookups/lookups.module';
import { AddressesModule } from './addresses/addresses.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { RoomPricesModule } from './room-prices/room-prices.module';
import { RoomHoldsModule } from './room-holds/room-holds.module';
import { RoomAmenitiesModule } from './room-amenities/room-amenities.module';
import { RoomHighlightsModule } from './room-highlights/room-highlights.module';
import { ActivityPropertyModule } from './activity-property/activity-property.module';
import { ReservationRoomsModule } from './reservation-rooms/reservation-rooms.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { PaypalModule } from './payments/paypal/paypal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DrizzleModule,
    AuthModule, // AuthModule provides APP_GUARD internally
    UsersModule,
    EmailModule,
    LookupsModule,
    AddressesModule,
    PropertiesModule,
    RoomsModule,
    ReservationsModule,
    UserRolesModule,
    RoomPricesModule,
    RoomHoldsModule,
    RoomAmenitiesModule,
    RoomHighlightsModule,
    ActivityPropertyModule,
    ReservationRoomsModule,
    InvoicesModule,
    PaymentsModule,
    OccurrencesModule,
    PaypalModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
