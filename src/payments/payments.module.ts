import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaypalModule } from './paypal/paypal.module';
import { PaymentStrategyFactory } from './payment-strategy.factory';

@Module({
  providers: [PaymentsService, PaymentStrategyFactory],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentStrategyFactory, PaypalModule],
  imports: [forwardRef(() => PaypalModule)],
})
export class PaymentsModule {}
