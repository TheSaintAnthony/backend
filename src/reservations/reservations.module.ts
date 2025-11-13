import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { RoomsModule } from 'src/rooms/rooms.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { IdempotencyInterceptor } from 'src/interceptors';
import { IdempotencyService, IdempotencyCleanupService } from 'src/services';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import { QueuesModule } from 'src/queues/queues.module';

@Module({
  imports: [
    RoomsModule,
    UsersModule,
    EmailModule,
    AuthModule,
    PaymentsModule,
    QueuesModule,
  ],
  providers: [
    ReservationsService,
    IdempotencyService,
    IdempotencyCleanupService,
    StatusLookupService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
