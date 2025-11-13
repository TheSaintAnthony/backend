import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { RoomsModule } from 'src/rooms/rooms.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentsModule } from 'src/payments/payments.module';
import {
  IdempotencyService,
  IdempotencyInterceptor,
  IdempotencyCleanupService,
} from 'src/interceptors';

@Module({
  imports: [RoomsModule, UsersModule, EmailModule, AuthModule, PaymentsModule],
  providers: [
    ReservationsService,
    IdempotencyService,
    IdempotencyCleanupService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
