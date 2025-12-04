import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceStrategyFactory } from './invoice-strategy.factory';
@Module({
  imports: [],
  providers: [InvoicesService, InvoiceStrategyFactory],
  controllers: [InvoicesController],
  exports: [InvoicesService, InvoiceStrategyFactory],
})
export class InvoicesModule {}
