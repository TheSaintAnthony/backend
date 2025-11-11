import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaypalModule } from './paypal/paypal.module';

@Module({
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaypalModule],
  imports: [forwardRef(() => PaypalModule)],
})
export class PaymentsModule {}
