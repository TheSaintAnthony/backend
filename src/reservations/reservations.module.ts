import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { RoomsModule } from 'src/rooms/rooms.module';
import { UsersModule } from 'src/users/users.module';
import { PropertiesModule } from 'src/properties/properties.module';
import { EmailModule } from 'src/email/email.module';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { StripeModule } from 'src/payments/stripe/stripe.module';
import { IdempotencyInterceptor } from 'src/interceptors';
import { IdempotencyService, IdempotencyCleanupService } from 'src/services';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';
import { QueuesModule } from 'src/queues/queues.module';
import { InvoicesModule } from 'src/invoices/invoices.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
@Module({
  imports: [
    RoomsModule,
    UsersModule,
    PropertiesModule,
    EmailModule,
    AuthModule,
    PaymentsModule,
    StripeModule,
    QueuesModule,
    InvoicesModule,
    UserRolesModule,
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
