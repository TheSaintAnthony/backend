import { Module, forwardRef } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { PaypalPaymentStrategy } from './paypal-payment.strategy';
import { PaypalController } from './paypal.controller';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from '../payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    forwardRef(() => PaymentsModule),
  ],
  providers: [PaypalService, PaypalPaymentStrategy],
  controllers: [PaypalController],
  exports: [PaypalService, PaypalPaymentStrategy],
})
export class PaypalModule {}
