import { Module } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { PaypalController } from './paypal.controller';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from '../payments.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [PaypalService, PaymentsService],
  controllers: [PaypalController],
  exports: [PaypalService],
})
export class PaypalModule {}
