import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceStrategyFactory } from './invoice-strategy.factory';
import { StripeModule } from 'src/payments/stripe/stripe.module';
@Module({
  imports: [AuthModule, StripeModule],
  providers: [InvoicesService, InvoiceStrategyFactory],
  controllers: [InvoicesController],
  exports: [InvoicesService, InvoiceStrategyFactory],
})
export class InvoicesModule {}
