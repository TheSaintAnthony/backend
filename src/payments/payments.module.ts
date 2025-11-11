import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaypalModule } from './paypal/paypal.module';

@Module({
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaypalModule],
  imports: [PaypalModule],
})
export class PaymentsModule {}
