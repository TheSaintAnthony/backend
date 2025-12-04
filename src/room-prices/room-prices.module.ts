import { Module } from '@nestjs/common';
import { RoomPricesService } from './room-prices.service';
import { RoomPricesController } from './room-prices.controller';
import { StripeModule } from 'src/payments/stripe/stripe.module';
@Module({
  imports: [StripeModule],
  providers: [RoomPricesService],
  controllers: [RoomPricesController],
  exports: [RoomPricesService],
})
export class RoomPricesModule {}
