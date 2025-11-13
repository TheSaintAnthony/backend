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
import { ScheduleModule } from '@nestjs/schedule';
import { validationSchema } from './config/validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CorrelationIdService } from './interceptors/correlation-id.service';
import { BullModule } from '@nestjs/bullmq';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: validationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 15,
        },
      ],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ScheduleModule.forRoot(),
    DrizzleModule,
    AuthModule,
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
    HealthModule,
    QueuesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    CorrelationIdService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
