import { Module } from '@nestjs/common';
import { RoomPricesService } from './room-prices.service';
import { RoomPricesController } from './room-prices.controller';

@Module({
  providers: [RoomPricesService],
  controllers: [RoomPricesController],
  exports: [RoomPricesService],
})
export class RoomPricesModule {}
